import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { store } from '../services/inMemoryStore.js';

const SignatureArray = z.array(z.number().int().min(0).max(255)).length(64);
const NonceBody = z.object({ wallet: z.string().min(32) });
const VerifyBody = z.object({
  wallet: z.string().min(32),
  nonce: z.string().uuid(),
  signature: z.union([SignatureArray, z.string().min(32).max(128)]),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/nonce', async (request, reply) => {
    const body = NonceBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid body' });

    const wallet = parseSolanaPublicKey(body.data.wallet);
    if (!wallet) return reply.code(400).send({ error: 'invalid wallet' });

    const nonce = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const message = [
      'Chronofrost: Aetherbound wants you to sign in with your Solana account.',
      `Wallet: ${wallet.toBase58()}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
      `Expires At: ${expiresAt}`,
      'This does not authorize token transfers.',
    ].join('\n');

    store.saveNonce(nonce, { wallet: wallet.toBase58(), message, expiresAt, consumed: false });
    return { nonce, message, expiresAt };
  });

  app.post('/auth/verify', async (request, reply) => {
    const body = VerifyBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid body' });

    const wallet = parseSolanaPublicKey(body.data.wallet);
    if (!wallet) return reply.code(400).send({ error: 'invalid wallet' });

    const nonce = store.getNonce(body.data.nonce);
    if (!nonce) return reply.code(404).send({ error: 'nonce not found' });
    if (nonce.wallet !== wallet.toBase58()) return reply.code(400).send({ error: 'wallet mismatch' });

    const expiresAtMs = Date.parse(nonce.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) return reply.code(410).send({ error: 'nonce expired' });

    // Atomically claim the nonce BEFORE the async verify below. Only the first
    // concurrent request wins; any replay (same nonce) is rejected here, closing
    // the TOCTOU window between the consumed-check and the consume.
    if (!store.claimNonce(body.data.nonce)) {
      return reply.code(409).send({ error: 'nonce already used' });
    }

    const signature = decodeSignature(body.data.signature);
    if (!signature) return reply.code(400).send({ error: 'invalid signature encoding' });

    const messageBytes = new TextEncoder().encode(nonce.message);
    const valid = nacl.sign.detached.verify(messageBytes, signature, wallet.toBytes());
    if (!valid) {
      // The claimed nonce is now burned even though the signature failed. That is
      // the safe choice: a burned nonce can never be replayed. The client simply
      // requests a fresh nonce and retries.
      return reply.code(401).send({ error: 'invalid signature' });
    }

    const session = store.createSession(wallet.toBase58());
    return { ok: true, wallet: wallet.toBase58(), sessionToken: session.token, expiresAt: session.expiresAt };
  });
}

function parseSolanaPublicKey(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

function decodeSignature(value: z.infer<typeof VerifyBody>['signature']): Uint8Array | null {
  try {
    const decoded = Array.isArray(value) ? Uint8Array.from(value) : bs58.decode(value);
    return decoded.length === 64 ? decoded : null;
  } catch {
    return null;
  }
}

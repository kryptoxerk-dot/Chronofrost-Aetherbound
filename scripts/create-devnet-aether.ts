/**
 * Devnet helper script plan.
 *
 * Usage after pnpm install:
 *   SOLANA_RPC_URL=https://api.devnet.solana.com DEVNET_PAYER_KEYPAIR_PATH=~/.config/solana/id.json pnpm tsx scripts/create-devnet-aether.ts <recipient-wallet>
 *
 * This creates a devnet SPL token mint and mints test tokens to the recipient.
 * Do not use this for mainnet token launch. Pump.fun launch is done through Pump.fun.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';

function readKeypair(filePath: string): Keypair {
  const expanded = filePath.startsWith('~') ? path.join(os.homedir(), filePath.slice(1)) : filePath;
  const raw = JSON.parse(fs.readFileSync(expanded, 'utf8')) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

const recipientArg = process.argv[2];
if (!recipientArg) {
  console.error('Usage: pnpm tsx scripts/create-devnet-aether.ts <recipient-wallet>');
  process.exit(1);
}

const rpc = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const keypairPath = process.env.DEVNET_PAYER_KEYPAIR_PATH ?? '~/.config/solana/id.json';
const payer = readKeypair(keypairPath);
const recipient = new PublicKey(recipientArg);
const connection = new Connection(rpc, 'confirmed');

const decimals = 6;
const mint = await createMint(connection, payer, payer.publicKey, null, decimals);
const recipientAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipient);
await mintTo(connection, payer, mint, recipientAta.address, payer, 1_000_000_000n); // 1000.000000 test AETHER

console.log(JSON.stringify({
  mint: mint.toBase58(),
  recipientAta: recipientAta.address.toBase58(),
  decimals,
}, null, 2));

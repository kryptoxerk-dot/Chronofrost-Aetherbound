import { Connection, PublicKey } from '@solana/web3.js';
import type { ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
import type { ShopOrder } from '../services/inMemoryStore.js';

const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

export type VerificationResult = {
  ok: true;
} | {
  ok: false;
  reason: string;
};

export async function verifyPurchaseTransaction(
  connection: Connection,
  order: ShopOrder,
  txSignature: string,
): Promise<VerificationResult> {
  const tx = await connection.getParsedTransaction(txSignature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) return { ok: false, reason: 'transaction not found or not confirmed' };
  if (tx.meta?.err) return { ok: false, reason: 'transaction failed on-chain' };

  const instructions = tx.transaction.message.instructions;

  const hasMemo = instructions.some((ix) => instructionHasOrderMemo(ix, order.orderId));
  if (!hasMemo) return { ok: false, reason: 'missing order memo' };

  const tokenTransfer = instructions.find((ix) => isExpectedTokenTransfer(ix, order));
  if (!tokenTransfer) return { ok: false, reason: 'expected token transfer not found' };

  return { ok: true };
}

function instructionHasOrderMemo(ix: ParsedInstruction | PartiallyDecodedInstruction, orderId: string): boolean {
  if (ix.programId.toBase58() !== MEMO_PROGRAM_ID) return false;
  const anyIx = ix as any;
  const parsed = anyIx.parsed;
  if (typeof parsed === 'string') return parsed.includes(orderId);
  if (typeof anyIx.data === 'string') {
    try {
      return Buffer.from(anyIx.data, 'base64').toString('utf8').includes(orderId);
    } catch {
      return anyIx.data.includes(orderId);
    }
  }
  return false;
}

function isExpectedTokenTransfer(ix: ParsedInstruction | PartiallyDecodedInstruction, order: ShopOrder): boolean {
  const parsedIx = ix as ParsedInstruction;
  if (parsedIx.program !== 'spl-token') return false;
  const parsed: any = parsedIx.parsed;
  if (!parsed || !['transfer', 'transferChecked'].includes(parsed.type)) return false;

  const info = parsed.info ?? {};
  const mintOk = !info.mint || safePubkeyEquals(info.mint, order.mint);
  const destinationOk = safePubkeyEquals(info.destination, order.treasuryTokenAccount);
  const authorityOk = !info.authority || safePubkeyEquals(info.authority, order.buyerWallet);

  // transferChecked usually exposes tokenAmount.amount. transfer may expose amount.
  const amountRaw = info.tokenAmount?.amount ?? info.amount;
  const amountOk = String(amountRaw) === String(order.amountRaw);

  return mintOk && destinationOk && authorityOk && amountOk;
}

function safePubkeyEquals(a: string | undefined, b: string): boolean {
  if (!a || !b) return false;
  try {
    return new PublicKey(a).equals(new PublicKey(b));
  } catch {
    return false;
  }
}

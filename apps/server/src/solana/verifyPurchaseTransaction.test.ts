import { describe, expect, it } from 'vitest';
import { PublicKey, type Connection } from '@solana/web3.js';
import type { ShopOrder } from '../services/inMemoryStore.js';
import { verifyPurchaseTransaction } from './verifyPurchaseTransaction.js';

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const BUYER = '11111111111111111111111111111111';
const MINT = 'So11111111111111111111111111111111111111112';
const TREASURY = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

function exampleOrder(): ShopOrder {
  return {
    orderId: '00000000-0000-4000-8000-000000000000',
    buyerWallet: BUYER,
    itemId: 'founder_palette',
    mint: MINT,
    amountRaw: '1000000',
    decimals: 6,
    treasuryTokenAccount: TREASURY,
    nonce: 'nonce',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

type ParsedTestInstruction = {
  program?: string;
  programId: PublicKey;
  parsed?: unknown;
  data?: string;
};

function fakeConnection(tx: unknown): Connection {
  return {
    getParsedTransaction: async () => tx,
  } as unknown as Connection;
}

function fakeTx(instructions: ParsedTestInstruction[], err: unknown = null) {
  return {
    meta: { err },
    transaction: {
      message: {
        instructions,
      },
    },
  };
}

function transferInstruction(overrides: Partial<Record<string, unknown>> = {}): ParsedTestInstruction {
  return {
    program: 'spl-token',
    programId: TOKEN_PROGRAM_ID,
    parsed: {
      type: 'transferChecked',
      info: {
        mint: MINT,
        destination: TREASURY,
        authority: BUYER,
        tokenAmount: { amount: '1000000' },
        ...overrides,
      },
    },
  };
}

function memoInstruction(orderId: string): ParsedTestInstruction {
  return {
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(`chronofrost:${orderId}`).toString('base64'),
  };
}

describe('purchase transaction verifier', () => {
  it('accepts a confirmed transferChecked instruction with matching memo', async () => {
    const order = exampleOrder();
    const result = await verifyPurchaseTransaction(
      fakeConnection(fakeTx([transferInstruction(), memoInstruction(order.orderId)])),
      order,
      'tx-signature',
    );

    expect(result).toEqual({ ok: true });
  });

  it('rejects a missing memo', async () => {
    const order = exampleOrder();
    const result = await verifyPurchaseTransaction(fakeConnection(fakeTx([transferInstruction()])), order, 'tx-signature');

    expect(result).toEqual({ ok: false, reason: 'missing order memo' });
  });

  it('rejects wrong transfer amount', async () => {
    const order = exampleOrder();
    const result = await verifyPurchaseTransaction(
      fakeConnection(fakeTx([transferInstruction({ tokenAmount: { amount: '999999' } }), memoInstruction(order.orderId)])),
      order,
      'tx-signature',
    );

    expect(result).toEqual({ ok: false, reason: 'expected token transfer not found' });
  });

  it('rejects wrong treasury destination', async () => {
    const order = exampleOrder();
    const result = await verifyPurchaseTransaction(
      fakeConnection(fakeTx([transferInstruction({ destination: BUYER }), memoInstruction(order.orderId)])),
      order,
      'tx-signature',
    );

    expect(result).toEqual({ ok: false, reason: 'expected token transfer not found' });
  });

  it('rejects failed or unknown chain transactions', async () => {
    const order = exampleOrder();

    await expect(verifyPurchaseTransaction(fakeConnection(null), order, 'tx-signature')).resolves.toEqual({
      ok: false,
      reason: 'transaction not found or not confirmed',
    });

    await expect(
      verifyPurchaseTransaction(fakeConnection(fakeTx([transferInstruction(), memoInstruction(order.orderId)], { InstructionError: [0, 'Custom'] })), order, 'tx-signature'),
    ).resolves.toEqual({ ok: false, reason: 'transaction failed on-chain' });
  });
});

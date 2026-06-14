import { createTransferCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { ENV } from '../config/gameConfig';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export type ShopQuote = {
  orderId: string;
  itemId: string;
  buyerWallet: string;
  mint: string;
  amountRaw: string;
  decimals: number;
  treasuryTokenAccount: string;
  expiresAt: string;
};

export async function buildAndSendAetherPurchase(quote: ShopQuote): Promise<string> {
  const provider = window.solana;
  if (!provider?.publicKey || !provider.signAndSendTransaction) {
    throw new Error('Wallet is not connected or cannot sign transactions.');
  }

  const connection = new Connection(ENV.solanaRpcUrl, 'confirmed');
  const buyer = provider.publicKey;
  const quotedBuyer = new PublicKey(quote.buyerWallet);
  if (!buyer.equals(quotedBuyer)) {
    throw new Error('Connected wallet does not match the shop quote buyer.');
  }
  const expiresAtMs = Date.parse(quote.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
    throw new Error('Shop quote expired. Request a fresh quote.');
  }
  const mint = new PublicKey(quote.mint);
  const buyerAta = await getAssociatedTokenAddress(mint, buyer);
  const treasuryAta = new PublicKey(quote.treasuryTokenAccount);
  const amount = BigInt(quote.amountRaw);

  const tx = new Transaction();
  tx.add(
    createTransferCheckedInstruction(
      buyerAta,
      mint,
      treasuryAta,
      buyer,
      amount,
      quote.decimals,
    ),
  );
  tx.add(new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(`chronofrost:${quote.orderId}`),
  }));

  tx.feePayer = buyer;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const result = await provider.signAndSendTransaction(tx);
  return result.signature;
}

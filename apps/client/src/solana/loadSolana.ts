// Lazy loader for the Solana-dependent modules. @solana/web3.js + @solana/spl-token
// are large (hundreds of KB gzipped) and only needed when a player connects a
// wallet or buys with $AETHER. Importing them dynamically keeps the heavy bundle
// out of the guest movement/combat/PvP path — it loads on first wallet/shop use.
//
// @solana evaluates Buffer at module load, so the Node-style Buffer global must
// exist BEFORE these modules are imported; ensureBuffer() guarantees that.

let bufferReady: Promise<void> | null = null;

function ensureBuffer(): Promise<void> {
  const scope = globalThis as unknown as { Buffer?: unknown };
  if (scope.Buffer) return Promise.resolve();
  if (!bufferReady) {
    bufferReady = import('buffer').then(({ Buffer }) => {
      if (!scope.Buffer) scope.Buffer = Buffer;
    });
  }
  return bufferReady;
}

export async function loadWallet(): Promise<typeof import('./wallet')> {
  await ensureBuffer();
  return import('./wallet');
}

export async function loadPurchase(): Promise<typeof import('./purchase')> {
  await ensureBuffer();
  return import('./purchase');
}

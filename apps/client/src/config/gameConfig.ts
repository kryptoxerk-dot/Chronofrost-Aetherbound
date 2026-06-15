export const GAME = {
  width: 320,
  height: 288,
  moveSpeed: 72,
};

export const COLORS = {
  bg: 0x0f1d1c,
  dark: 0x263f3a,
  mid: 0x4c7a5b,
  light: 0xd6f8b8,
  ice: 0x9be7d0,
  danger: 0xe07a5f,
};

// Accept a bare host (e.g. a PaaS service binding) or a full URL. A scheme-less
// value is assumed https so the deployed client can reach the API without a
// manual rebuild just to prepend the scheme.
function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const ENV = {
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL, 'http://localhost:8787'),
  solanaCluster: import.meta.env.VITE_SOLANA_CLUSTER ?? 'devnet',
  solanaRpcUrl: import.meta.env.VITE_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
  aetherMint: import.meta.env.VITE_AETHER_MINT ?? '',
  treasuryTokenAccount: import.meta.env.VITE_TREASURY_TOKEN_ACCOUNT ?? '',
};

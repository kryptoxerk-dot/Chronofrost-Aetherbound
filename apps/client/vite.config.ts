import { defineConfig } from 'vite';

// Phaser + Solana web3 expect a Node-style `Buffer` global in the browser.
// We polyfill it via the `buffer` package and alias it here.
export default defineConfig({
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  build: {
    // The Phaser engine is ~1.5 MB and unavoidable; it gets its own cache-stable
    // vendor chunk (below), so app-code changes don't bust it. Raise the warning
    // limit accordingly so an expected, isolated vendor chunk isn't flagged.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          // Solana is dynamically imported (guest path stays light); grouping it
          // here only names the lazy chunk, it does not make it eager.
          if (
            id.includes('node_modules/@solana') ||
            id.includes('node_modules/@noble') ||
            id.includes('node_modules/bs58') ||
            id.includes('node_modules/buffer')
          ) {
            return 'solana';
          }
          return undefined;
        },
      },
    },
  },
});

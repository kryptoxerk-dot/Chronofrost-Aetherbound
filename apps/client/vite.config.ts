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
});

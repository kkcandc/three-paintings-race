import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        starry: resolve(__dirname, 'starry.html'),
        memory: resolve(__dirname, 'memory.html'),
        poppies: resolve(__dirname, 'poppies.html'),
      },
    },
  },
});

import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import seo from './plugins/seo.js';
import perf from './plugins/perf.js';

export default defineConfig({
  plugins: [seo(), perf()],
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        politique: resolve(import.meta.dirname, 'politique-confidentialite.html'),
      },
    },
  },
});

import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import seo from './plugins/seo.js';
import perf from './plugins/perf.js';
import apiDev from './plugins/api-dev.js';

export default defineConfig({
  plugins: [seo(), perf(), apiDev()],
  // Serveur de développement : accessible seulement depuis cet ordinateur
  server: { port: 5173 },
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

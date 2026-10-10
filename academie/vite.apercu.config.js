/**
 * Build « aperçu » : un seul fichier HTML autonome (scripts, polices et images intégrés),
 * pratique pour montrer le site sans serveur. Usage : npm run apercu
 */
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Remplace les chemins "/images/…" des fichiers JSON par les images encodées en base64
const inlineDataImages = () => ({
  name: 'inline-data-images',
  enforce: 'pre',
  transform(code, id) {
    if (!id.includes('/src/data/') || !id.endsWith('.json')) return null;
    return code.replace(/"(\/images\/[^"]+\.webp)"/g, (_, src) => {
      const file = path.resolve('public', src.slice(1));
      return `"data:image/webp;base64,${readFileSync(file).toString('base64')}"`;
    });
  },
});

export default defineConfig({
  plugins: [inlineDataImages(), viteSingleFile()],
  build: { target: 'es2020', outDir: 'dist-apercu', copyPublicDir: false, chunkSizeWarningLimit: 5000 },
});

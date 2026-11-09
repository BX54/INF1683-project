/**
 * Crée des versions allégées des photos, utilisées automatiquement par le site :
 *   - plats/xxx.webp         → plats/xxx-600.webp (600 × 600) : vignettes de la carte, cartes, galerie
 *   - ambiance/hero-N.webp   → hero-N-1200.webp (ordinateur, écrans normaux)
 *                              hero-N-m.webp    (mobile, cadrage vertical 800 × 1066)
 *
 * Lancé automatiquement avant « npm run dev » et « npm run build ».
 * Une version n'est recréée que si la photo d'origine est plus récente : c'est rapide.
 * Pour une nouvelle photo, il suffit de la déposer (même nom que dans les JSON) : rien d'autre à faire.
 */
import { readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const img = (...p) => path.join(root, 'public', 'images', ...p);
const VARIANT = /-(600|900|1200|m)\.webp$/;

const mtime = (p) => stat(p).then((s) => s.mtimeMs, () => 0);
let made = 0;

async function variant(src, out, fn, quality = 72) {
  if ((await mtime(out)) >= (await mtime(src))) return;
  await fn(sharp(src)).webp({ quality, effort: 6 }).toFile(out);
  made++;
}

async function list(dir) {
  try {
    return (await readdir(dir)).filter((f) => f.endsWith('.webp') && !VARIANT.test(f));
  } catch {
    return [];
  }
}

for (const f of await list(img('plats'))) {
  const src = img('plats', f);
  await variant(src, src.replace(/\.webp$/, '-600.webp'), (s) => s.resize(600, 600, { fit: 'cover' }));
}

for (const f of (await list(img('ambiance'))).filter((f) => /^hero-/.test(f))) {
  const src = img('ambiance', f);
  await variant(src, src.replace(/\.webp$/, '-1200.webp'), (s) => s.resize(1200, 750, { fit: 'cover' }));
  // Mobile : la photo est affichée en hauteur, centrée sur le plat
  await variant(src, src.replace(/\.webp$/, '-m.webp'), (s) => s.resize(800, 1066, { fit: 'cover', position: 'centre' }), 64);
}

// Photo de groupe de l'équipe : version 900 px pour mobile
for (const f of (await list(img('equipe'))).filter((f) => /^groupe/.test(f))) {
  const src = img('equipe', f);
  await variant(src, src.replace(/\.webp$/, '-900.webp'), (s) => s.resize(900));
}

console.log(made ? `[images] ${made} version(s) allégée(s) créée(s).` : '[images] Versions allégées à jour.');

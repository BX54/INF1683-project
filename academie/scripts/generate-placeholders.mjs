/**
 * Génère des images de remplacement (WebP) élégantes, noir et or,
 * pour chaque plat et chaque membre de l'équipe déclarés dans les JSON.
 *
 * Usage : npm run images
 * - Un fichier existant n'est JAMAIS écrasé (vos vraies photos sont protégées).
 * - Option --force pour tout régénérer.
 */
import { readFile, access, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');

const readJson = async (p) => JSON.parse(await readFile(path.join(root, p), 'utf8'));
const exists = (p) => access(p).then(() => true, () => false);

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&#39;');

// Teintes profondes : bordeaux, ambre, charbon, olive, prune.
const TONES = ['#2a0d12', '#2b1a08', '#161412', '#1c1d10', '#22101e', '#271307'];

function wrap(text, max) {
  const words = text.split(' ');
  const lines = [''];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if ((cur + ' ' + w).trim().length > max) lines.push(w);
    else lines[lines.length - 1] = (cur + ' ' + w).trim();
  }
  return lines;
}

function platSvg(label, file, w, h) {
  const n = hash(file);
  const tone = TONES[n % TONES.length];
  const gx = 30 + (n % 40);
  const gy = 25 + ((n >> 3) % 40);
  // Tout le contenu reste dans la zone centrale (y 20 %–80 %) pour survivre aux recadrages
  const cx = w / 2;
  const cy = h * 0.4;
  const r = Math.min(w, h) * 0.165;
  const lines = wrap(label, 26);
  const text = lines
    .map((l, i) => `<tspan x="${cx}" dy="${i ? 1.15 : 0}em">${esc(l)}</tspan>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bg" cx="${gx}%" cy="${gy}%" r="85%">
      <stop offset="0" stop-color="${tone}"/>
      <stop offset="0.6" stop-color="#0d0c0b"/>
      <stop offset="1" stop-color="#060606"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#E6C77A" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#C9A24B" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8a6a28"/>
      <stop offset="0.5" stop-color="#E6C77A"/>
      <stop offset="1" stop-color="#8a6a28"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${r * 1.9}" ry="${r * 1.6}" fill="url(#glow)"/>
  <g fill="none" stroke="url(#gold)">
    <circle cx="${cx}" cy="${cy}" r="${r}" stroke-width="2" opacity="0.85"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.72}" stroke-width="1" opacity="0.5"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 1.08}" stroke-width="0.6" opacity="0.35" stroke-dasharray="2 8"/>
    <path d="M${cx - r * 1.45} ${cy - r * 0.55} v${r * 1.1} M${cx - r * 1.52} ${cy - r * 0.55} v${r * 0.35} M${cx - r * 1.38} ${cy - r * 0.55} v${r * 0.35}" stroke-width="1.4" opacity="0.6"/>
    <path d="M${cx + r * 1.45} ${cy - r * 0.55} q${r * 0.12} ${r * 0.3} 0 ${r * 0.5} v${r * 0.6}" stroke-width="1.4" opacity="0.6"/>
    <rect x="28" y="28" width="${w - 56}" height="${h - 56}" stroke-width="1" opacity="0.28"/>
  </g>
  <text x="${cx}" y="${h * 0.665 - (lines.length - 1) * w * 0.022}" fill="#F3EDE2" opacity="0.92" font-family="Georgia, 'DejaVu Serif', serif" font-style="italic" font-size="${Math.round(w * 0.04)}" text-anchor="middle">${text}</text>
  <text x="${cx}" y="${h * 0.765}" fill="#C9A24B" opacity="0.7" font-family="Manrope, Arial, sans-serif" font-size="${Math.round(w * 0.015)}" letter-spacing="4" text-anchor="middle">PHOTO À VENIR · ${esc(file.toUpperCase())}</text>
</svg>`;
}

function portraitSvg(label, role, file, w, h) {
  const n = hash(file);
  const tone = TONES[n % TONES.length];
  const cx = w / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="80%">
      <stop offset="0" stop-color="${tone}"/>
      <stop offset="0.7" stop-color="#0c0b0a"/>
      <stop offset="1" stop-color="#050505"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#E6C77A"/>
      <stop offset="1" stop-color="#7a5c22" stop-opacity="0.2"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#C9A24B" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#C9A24B" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${h * 0.38}" r="${w * 0.42}" fill="url(#halo)"/>
  <g fill="none" stroke="url(#gold)" stroke-width="2">
    <ellipse cx="${cx}" cy="${h * 0.36}" rx="${w * 0.15}" ry="${w * 0.185}"/>
    <path d="M${w * 0.16} ${h * 0.86} C ${w * 0.18} ${h * 0.62}, ${w * 0.34} ${h * 0.56}, ${cx} ${h * 0.56} S ${w * 0.82} ${h * 0.62}, ${w * 0.84} ${h * 0.86}"/>
  </g>
  <rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="none" stroke="#C9A24B" stroke-opacity="0.25"/>
  <text x="${cx}" y="${h * 0.79}" fill="#F3EDE2" font-family="Georgia, 'DejaVu Serif', serif" font-style="italic" font-size="${Math.round(w * 0.06)}" text-anchor="middle">${esc(role)}</text>
  <text x="${cx}" y="${h - 52}" fill="#C9A24B" opacity="0.75" font-family="Manrope, Arial, sans-serif" font-size="${Math.round(w * 0.024)}" letter-spacing="4" text-anchor="middle">PORTRAIT À VENIR · ${esc(file.toUpperCase())}</text>
</svg>`;
}

// Pseudo-aléatoire stable (mêmes images à chaque génération)
function rng(seed) {
  let x = seed || 1;
  return () => ((x = (x * 16807) % 2147483647) / 2147483647);
}

function ambianceSvg(label, file, w, h) {
  const r = rng(hash(file));
  const tone = TONES[hash(file) % TONES.length];
  // Bokeh de bougies
  const bokeh = Array.from({ length: 34 }, () => {
    const cx = r() * w;
    const cy = r() * h * 0.75;
    const rad = (0.012 + r() * 0.05) * w;
    const op = 0.08 + r() * 0.3;
    const c = r() > 0.5 ? '#E6C77A' : '#C9772F';
    return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(0)}" fill="${c}" opacity="${op.toFixed(2)}"/>`;
  }).join('');
  const landscape = w > h;
  const px = landscape ? w * 0.66 : w * 0.5;
  const py = landscape ? h * 0.6 : h * 0.66;
  const pr = (landscape ? h : w) * 0.34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bg" cx="${landscape ? 65 : 50}%" cy="55%" r="80%">
      <stop offset="0" stop-color="${tone}"/>
      <stop offset="0.55" stop-color="#0e0c0a"/>
      <stop offset="1" stop-color="#050505"/>
    </radialGradient>
    <radialGradient id="warm" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#E6C77A" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#C9A24B" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8a6a28"/>
      <stop offset="0.5" stop-color="#E6C77A"/>
      <stop offset="1" stop-color="#8a6a28"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="${(w * 0.012).toFixed(0)}"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <g filter="url(#blur)">${bokeh}</g>
  <ellipse cx="${px}" cy="${py}" rx="${pr * 1.7}" ry="${pr * 1.1}" fill="url(#warm)"/>
  <g fill="none" stroke="url(#gold)">
    <ellipse cx="${px}" cy="${py}" rx="${pr}" ry="${pr * 0.42}" stroke-width="2" opacity="0.9"/>
    <ellipse cx="${px}" cy="${py}" rx="${pr * 0.66}" ry="${pr * 0.27}" stroke-width="1" opacity="0.5"/>
  </g>
  <!-- Le nom du plat est affiché par le site : seule l'étiquette du fichier figure ici -->
  <text x="${w * 0.5}" y="${h * 0.1}" fill="#C9A24B" opacity="0.6" font-family="Manrope, Arial, sans-serif" font-size="${Math.round(Math.min(w, h) * 0.016)}" letter-spacing="4" text-anchor="middle">PHOTO À VENIR · ${esc(file.toUpperCase())}</text>
</svg>`;
}

async function write(svg, out) {
  if (!force && (await exists(out))) return false;
  await sharp(Buffer.from(svg)).webp({ quality: 74 }).toFile(out);
  return true;
}

const menu = await readJson('src/data/menu.json');
const equipe = await readJson('src/data/equipe.json');
const galerie = await readJson('src/data/galerie.json');
const accueil = await readJson('src/data/accueil.json');
const services = await readJson('src/data/services.json');

await mkdir(path.join(root, 'public/images/plats'), { recursive: true });
await mkdir(path.join(root, 'public/images/equipe'), { recursive: true });
await mkdir(path.join(root, 'public/images/ambiance'), { recursive: true });

const jobs = new Map();
for (const c of menu.categories) for (const p of c.plats) if (p.image) jobs.set(p.image, { type: 'plat', label: p.nom });
for (const g of galerie.photos) if (!jobs.has(g.image)) jobs.set(g.image, { type: 'plat', label: g.legende });
for (const m of equipe.membres) jobs.set(m.image, { type: 'portrait', label: m.nom, role: m.role });
for (const d of accueil.hero.diapos) jobs.set(d.image, { type: 'ambiance', label: d.plat, w: 2400, h: 1500 });
jobs.set(accueil.histoire.image, { type: 'ambiance', label: 'La salle', w: 1000, h: 1250 });
jobs.set(accueil.reservation.image, { type: 'ambiance', label: 'Une table pour vous', w: 1400, h: 1000 });
for (const s of services.services) jobs.set(s.image, { type: 'ambiance', label: s.titre, w: 1400, h: 1000 });

let created = 0;
for (const [src, job] of jobs) {
  const out = path.join(root, 'public', src);
  const file = path.basename(src);
  const svg =
    job.type === 'plat'
      ? platSvg(job.label, file, 1200, 1200)
      : job.type === 'ambiance'
        ? ambianceSvg(job.label, file, job.w, job.h)
        : portraitSvg(job.label, job.role, file, 800, 1000);
  if (await write(svg, out)) created++;
}

console.log(`✦ ${created} image(s) de remplacement créée(s), ${jobs.size - created} déjà présente(s).`);

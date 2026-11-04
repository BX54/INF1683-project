/**
 * Versions allégées des photos (créées par scripts/optimize-images.mjs, lancé avant dev et build).
 * Le navigateur choisit lui-même la plus petite version suffisante pour l'écran.
 */

/** Photos de plats : xxx-600.webp (600 px) + xxx.webp (1200 px). */
export function platSrcset(src, sizes) {
  if (!/^\/images\/plats\/[^/]+\.webp$/.test(src || '') || /-600\.webp$/.test(src)) return '';
  return ` srcset="${src.replace(/\.webp$/, '-600.webp')} 600w, ${src} 1200w" sizes="${sizes}"`;
}

/** Photos du hero : -m (mobile, vertical), -1200 et original (2400 px) pour ordinateur. */
export function heroSources(src) {
  if (!/^\/images\/ambiance\/hero-[^/]+\.webp$/.test(src || '')) return null;
  return {
    mobile: src.replace(/\.webp$/, '-m.webp'),
    desktop: `${src.replace(/\.webp$/, '-1200.webp')} 1200w, ${src} 2400w`,
  };
}

/** Taille d'affichage du hero (sert aussi au préchargement dans plugins/seo.js). */
export const HERO_MOBILE_MQ = '(max-width: 900px)';
export const HERO_SIZES = '74vw';

/**
 * Diapos du hero (HTML). Photo 1 : chargée tout de suite (préchargée dans <head> par plugins/seo.js).
 * Photos 2 et 3 : adresses en data-* (chargées ~2 s avant leur apparition).
 */
export function heroSlidesHtml(slides) {
  const picture = (d, i) => {
    const v = heroSources(d.image);
    const attr = i === 0 ? '' : 'data-';
    const img = `<img ${attr}src="${d.image}" alt="" width="2400" height="1500" decoding="async"${
      i === 0 ? ' fetchpriority="high"' : ''
    }${v ? ` ${attr}srcset="${v.desktop}" sizes="${HERO_SIZES}"` : ''} />`;
    return v ? `<picture><source media="${HERO_MOBILE_MQ}" ${attr}srcset="${v.mobile}" />${img}</picture>` : img;
  };
  return slides
    .map((d, i) => `<div class="hero__slide${i === 0 ? ' is-active' : ''}">${picture(d, i)}</div>`)
    .join('');
}

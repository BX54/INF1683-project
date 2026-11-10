/**
 * Plugin Vite « SEO » : au moment du build (et en développement), écrit directement dans index.html
 * ce que le JavaScript affichait jusque-là, pour que Google et les aperçus de liens le lisent sans JS :
 *  - données structurées schema.org « Restaurant » (adresse, téléphone, heures, menu complet, réservation) ;
 *  - coordonnées, heures, liens (téléphone, courriel, itinéraire) ;
 *  - textes de l'histoire, du chef et des services ;
 *  - le menu complet en texte (bloc « Voir tout le menu en texte »).
 * Si RESTAURANT.siteUrl est rempli : adresse canonique, Open Graph (url, image) et sitemap.xml.
 * Les modules JS continuent de fonctionner : ils réécrivent les mêmes contenus.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { RESTAURANT as R, RESERVATION, COMMANDE } from '../src/config.js';
import { heroSources, HERO_MOBILE_MQ, HERO_SIZES } from '../src/modules/img.js';

const root = resolve(import.meta.dirname, '..');

/** Image de partage (Facebook, WhatsApp, Google) : public/images/partage.jpg si présente, sinon la 1re photo du hero. */
const shareImage = (accueil) =>
  existsSync(resolve(root, 'public/images/partage.jpg')) ? '/images/partage.jpg' : accueil.hero.diapos[0].image;

/** Préchargement de la 1re photo du hero : version verticale légère sur mobile, version adaptée sur ordinateur. */
function heroPreload(src) {
  const v = heroSources(src);
  if (!v) return [`<link rel="preload" as="image" href="${esc(src)}" fetchpriority="high" />`];
  const notMobile = HERO_MOBILE_MQ.replace('max-width: 900px', 'min-width: 901px');
  return [
    `<link rel="preload" as="image" href="${esc(v.mobile)}" media="${HERO_MOBILE_MQ}" fetchpriority="high" />`,
    `<link rel="preload" as="image" href="${esc(src)}" imagesrcset="${esc(v.desktop)}" imagesizes="${HERO_SIZES}" media="${notMobile}" fetchpriority="high" />`,
  ];
}
const json = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const formatPrice = (p = '') => String(p).replace(/\d+(?:[.,]\d+)?/g, '$& $');
const firstPrice = (p = '') => String(p).match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.');

/** Remplace le contenu (et éventuellement les attributs) des éléments portant un attribut donné. */
function fill(html, attr, render) {
  const re = new RegExp(`<(\\w+)((?:\\s[^>]*?)?\\s${attr}(?:="([^"]*)")?(?:\\s[^>]*?)?)>([\\s\\S]*?)</\\1>`, 'g');
  return html.replace(re, (whole, tag, attrs, value, inner) => {
    const out = render(value ?? '', { tag, attrs, inner });
    if (out == null) return whole;
    const { content = inner, set = {} } = typeof out === 'string' ? { content: out } : out;
    let a = attrs;
    for (const [k, v] of Object.entries(set)) {
      a = new RegExp(`\\s${k}="[^"]*"`).test(a) ? a.replace(new RegExp(`\\s${k}="[^"]*"`), ` ${k}="${esc(v)}"`) : `${a} ${k}="${esc(v)}"`;
    }
    return `<${tag}${a}>${content}</${tag}>`;
  });
}

/** Politique de confidentialité remplie au build : complète même sans JavaScript. */
function politique(html, libro) {
  const p = R.confidentialite ?? {};
  const v = { ...p, adresse: `${R.adresse}, ${R.ville}` };
  html = fill(html, 'data-p', (key) => (key in v ? esc(v[key]) : null));
  html = fill(html, 'data-p-mail', () => ({ content: esc(p.courriel), set: { href: `mailto:${p.courriel}` } }));
  html = fill(html, 'data-p-tel', () => ({ content: esc(R.telephone), set: { href: `tel:${R.telephoneLien}` } }));
  const montrer = (attr, oui) => (oui ? html.replaceAll(`${attr} hidden`, attr) : html);
  if (R.siteUrl) html = html.replace('</head>', `  <link rel="canonical" href="${esc(R.siteUrl)}/politique-confidentialite.html" />\n  </head>`);
  if (process.env.CONTEXT && process.env.CONTEXT !== 'production') html = html.replace('</head>', '  <meta name="robots" content="noindex, nofollow" />\n  </head>');
  html = montrer('data-if-libro', !!libro);
  html = montrer('data-if-commande', !!COMMANDE?.actif);
  html = montrer('data-if-order', Object.values(R.livraison || {}).some((u) => /^https:\/\//.test(u || '')));
  return html;
}

function jsonLd({ menu, accueil, siteUrl, libro }) {
  const tel = R.telephoneLien.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '+1-$1-$2-$3');
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: R.nom,
    description:
      "Restaurant « Apportez votre vin » à Gatineau : cuisine française et italienne, pâtes fraîches, moules et frites, veau, grillades et pizzas. Salles de réception et service traiteur.",
    address: {
      '@type': 'PostalAddress',
      streetAddress: R.adresse,
      addressLocality: 'Gatineau',
      addressRegion: 'QC',
      ...(R.codePostal ? { postalCode: R.codePostal } : {}),
      addressCountry: 'CA',
    },
    telephone: tel,
    ...(R.courriel ? { email: R.courriel } : {}),
    servesCuisine: ['Française', 'Italienne'],
    priceRange: R.gammePrix || '$$',
    acceptsReservations: true,
    openingHoursSpecification: (R.heuresGoogle || []).map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.jours,
      opens: h.ouverture,
      closes: h.fermeture,
    })),
    ...(siteUrl ? { menu: `${siteUrl}/#menu` } : {}),
    hasMenu: {
      '@type': 'Menu',
      name: 'Le menu',
      inLanguage: 'fr-CA',
      hasMenuSection: menu.categories.map((c) => ({
        '@type': 'MenuSection',
        name: c.nom,
        hasMenuItem: c.plats.map((p) => ({
          '@type': 'MenuItem',
          name: p.nom,
          ...(p.description ? { description: p.description } : {}),
          ...(firstPrice(p.prix) ? { offers: { '@type': 'Offer', price: firstPrice(p.prix), priceCurrency: 'CAD' } } : {}),
        })),
      })),
    },
  };
  if (siteUrl) {
    data.url = siteUrl;
    data.image = `${siteUrl}${shareImage(accueil)}`;
  }
  const commandes = Object.values(R.livraison || {}).filter((u) => /^https:\/\//.test(u || ''));
  if (COMMANDE?.actif && siteUrl) commandes.unshift(`${siteUrl}/#commander`);
  if (commandes.length) {
    data.potentialAction = [].concat(data.potentialAction || [], {
      '@type': 'OrderAction',
      target: commandes.map((u) => ({ '@type': 'EntryPoint', urlTemplate: u, inLanguage: 'fr-CA' })),
    });
  }
  if (libro) {
    // Ajoutée à la commande en ligne (et non à sa place)
    data.potentialAction = [].concat(data.potentialAction || [], {
      '@type': 'ReserveAction',
      target: { '@type': 'EntryPoint', urlTemplate: libro, inLanguage: 'fr-CA' },
      result: { '@type': 'FoodEstablishmentReservation', name: 'Réserver une table' },
    });
  }
  const sameAs = Object.values(R.reseaux || {}).filter(Boolean);
  if (sameAs.length) data.sameAs = sameAs;
  // « < » échappé pour qu'aucun texte ne puisse fermer la balise <script>
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

function menuTexte(menu) {
  return menu.categories
    .map(
      (c) => `
          <section class="menu-texte__cat">
            <h3>${esc(c.nom)}</h3>
            ${c.note ? `<p class="menu-texte__note">${esc(c.note)}</p>` : ''}
            <ul>${c.plats
              .map(
                (p) =>
                  `<li><span class="menu-texte__nom">${esc(p.nom)}</span> <span class="menu-texte__prix">${esc(
                    formatPrice(p.prix)
                  )}</span>${p.description ? `<br /><span class="menu-texte__desc">${esc(p.description)}</span>` : ''}</li>`
              )
              .join('')}</ul>
          </section>`
    )
    .join('');
}

export default function seo() {
  const siteUrl = (R.siteUrl || '').replace(/\/$/, '');
  const libro = /^https:\/\//.test(RESERVATION.libroUrl || '') ? RESERVATION.libroUrl : '';
  // Netlify indique le contexte du build : 'production', 'deploy-preview' ou 'branch-deploy'
  const production = !process.env.CONTEXT || process.env.CONTEXT === 'production';

  return {
    name: 'academie-seo',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (/politique-confidentialite\.html$/.test(ctx.filename)) return politique(html, libro);
        if (!/index\.html$/.test(ctx.filename)) return html;

        // Réservation : lien Libro direct dès le premier affichage (utile même si le JavaScript ne s'exécute pas)
        if (libro) {
          html = html.replace('<div class="libro" hidden>', '<div class="libro">');
          html = html.replace(/(<a class="[^"]*libro__btn[^"]*" )href="#reservation"/, `$1href="${esc(libro)}"`);
          html = html.replace('<p class="nojs-note" data-nojs data-nojs-reserve>', '<p class="nojs-note" data-nojs data-nojs-reserve hidden>');
        }
        const menu = json('src/data/menu.json');
        const accueil = json('src/data/accueil.json');
        const services = json('src/data/services.json');
        const q = encodeURIComponent(R.carteRecherche);

        // Coordonnées et liens
        html = fill(html, 'data-address', () => `${esc(R.nom)}<br />${esc(R.adresse)}<br />${esc(R.ville)}`);
        html = fill(html, 'data-phone-link', () => ({ content: esc(R.telephone), set: { href: `tel:${R.telephoneLien}` } }));
        const priv = R.confidentialite?.courriel || R.courriel;
        html = fill(html, 'data-privacy-mail', () => ({ content: esc(priv), set: { href: `mailto:${priv}` } }));
        html = fill(html, 'data-retention', () => esc(R.confidentialite?.conservation || '12 mois'));
        html = fill(html, 'data-mail-link', () => ({ content: esc(R.courriel), set: { href: `mailto:${R.courriel}` } }));
        html = fill(html, 'data-directions', (v, { inner }) => ({ content: inner, set: { href: `https://www.google.com/maps/dir/?api=1&destination=${q}` } }));
        html = fill(html, 'data-map-addr', () => esc(`${R.adresse}, ${R.ville}`));
        html = fill(html, 'data-hours', () =>
          R.heures.map((h) => `<div><dt>${esc(h.jours)}</dt><dd>${esc(h.heures)}</dd></div>`).join('')
        );

        // Textes de l'accueil et des services
        const story = {
          'histoire-surtitre': accueil.histoire.surtitre,
          'histoire-titre': accueil.histoire.titre,
          'histoire-texte': accueil.histoire.texte,
          'salle-legende': accueil.histoire.legende,
          'chef-surtitre': accueil.chef.surtitre,
          'chef-titre': accueil.chef.titre,
          'chef-nom': accueil.chef.nom,
          'chef-texte': accueil.chef.texte,
        };
        html = fill(html, 'data-story', (key) => (key in story ? esc(story[key]) : null));
        html = fill(html, 'data-sv', (key) => (typeof services[key] === 'string' ? esc(services[key]) : null));
        html = fill(html, 'data-sv-title', () => `${esc(services.titre)} <em class="gold-text">${esc(services.titreAccent)}</em>`);

        // Carte complète en texte
        html = fill(html, 'data-menu-texte', () => menuTexte(menu));

        // Balises de tête
        const head = [
          // Photo principale du hero : téléchargée tout de suite (elle est ajoutée plus tard par le JavaScript)
          ...heroPreload(accueil.hero.diapos[0].image),
          `<script type="application/ld+json">\n${jsonLd({ menu, accueil, siteUrl, libro })}\n</script>`,
        ];
        if (siteUrl) {
          head.push(
            `<link rel="canonical" href="${esc(siteUrl)}/" />`,
            `<meta property="og:url" content="${esc(siteUrl)}/" />`,
            `<meta property="og:image" content="${esc(siteUrl + shareImage(accueil))}" />`,
            `<meta property="og:image:width" content="1200" />`,
            `<meta property="og:image:height" content="630" />`,
            `<meta property="og:locale" content="fr_CA" />`,
            `<meta name="twitter:card" content="summary_large_image" />`
          );
        }
        if (!production) head.push('<meta name="robots" content="noindex, nofollow" />');
        return html.replace('</head>', `    ${head.join('\n    ')}\n  </head>`);
      },
    },
    generateBundle() {
      // Préproduction Netlify (aperçus, branches) : jamais indexée par les moteurs de recherche
      if (!production) {
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: 'User-agent: *\nDisallow: /\n' });
        return;
      }
      const lines = ['User-agent: *', 'Allow: /'];
      if (siteUrl) {
        lines.push('', `Sitemap: ${siteUrl}/sitemap.xml`);
        const urls = ['/', '/politique-confidentialite.html'].map((p) => `  <url><loc>${siteUrl}${p}</loc></url>`).join('\n');
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        });
      }
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: lines.join('\n') + '\n' });
    },
  };
}

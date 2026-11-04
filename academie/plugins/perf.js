/**
 * Optimisations de chargement de la page d'accueil (build seulement) :
 * - les feuilles de style sont intégrées dans index.html : une requête bloquante de moins sur mobile ;
 * - les deux polices visibles dès l'arrivée (titres et texte) sont préchargées.
 * Les fichiers .css restent publiés pour la page de politique de confidentialité.
 */
export default function perf() {
  return {
    name: 'academie-perf',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const page = bundle['index.html'];
      if (!page || typeof page.source !== 'string') return;
      let html = page.source;

      html = html.replace(/<link rel="stylesheet"[^>]*href="\/([^"]+\.css)"[^>]*>/g, (tag, file) => {
        const css = bundle[file];
        return css && typeof css.source === 'string' ? `<style>${css.source}</style>` : tag;
      });

      const fonts = Object.keys(bundle).filter((f) =>
        /(playfair-display-latin-400-normal|manrope-latin-300-normal)-[\w-]+\.woff2$/.test(f)
      );
      const preload = fonts
        .map((f) => `<link rel="preload" as="font" type="font/woff2" href="/${f}" crossorigin />`)
        .join('\n    ');
      if (preload) html = html.replace('</title>', `</title>\n    ${preload}`);

      page.source = html;
    },
  };
}

/**
 * En développement (npm run dev) : sert /api/commande avec la même fonction que Netlify,
 * pour tester la commande en ligne sur http://localhost:5173.
 *
 * Réglages dans un fichier .env.local (jamais publié) :
 *   COMMANDE_DEMO=1                 → rien n'est envoyé, la commande est affichée dans le terminal
 *   FORMSPREE_COMMANDES_ID=abcd1234 → la commande est réellement transmise (test de réception)
 * Sans l'un des deux, /api/commande répond « indisponible » (comme en production si mal configuré).
 */
import { loadEnv } from 'vite';

export default function apiDev() {
  return {
    name: 'academie-api-dev',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '');
      for (const k of ['FORMSPREE_COMMANDES_ID', 'COMMANDE_DEMO']) if (env[k] && !process.env[k]) process.env[k] = env[k];
      // En développement seulement : registre des numéros de commande en mémoire (pas de Netlify Blobs)
      process.env.COMMANDE_REGISTRE_MEMOIRE = '1';
      server.middlewares.use('/api/commande', async (req, res) => {
        const { default: handler } = await server.ssrLoadModule('/netlify/functions/commande.mjs');
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const request = new Request(`http://localhost${req.url}`, {
          method: req.method,
          headers: req.headers,
          body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
        });
        const response = await handler(request, { ip: req.socket.remoteAddress });
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(await response.text());
      });
    },
  };
}

/**
 * Fonction serveur (Netlify) : reçoit une commande du site, la VÉRIFIE et RECALCULE avant de la transmettre.
 *
 * - Les prix, rabais, frais, taxes et totaux sont recalculés ici à partir de src/data/menu.json et de
 *   src/config.js : un total envoyé par le navigateur n'est jamais utilisé.
 * - Plats, formats, quantités, zone de livraison, minimum et créneau sont validés.
 * - Le sujet du courriel est fixé ici (sans nom ni téléphone).
 * - Anti-abus : taille maximale, champ piège, limite par adresse IP, envoi en double ignoré (même n° de commande).
 * - Transmission par courriel via un formulaire Formspree dont l'identifiant reste secret :
 *   variable d'environnement FORMSPREE_COMMANDES_ID (Netlify › Site configuration › Environment variables).
 *   Sans elle, la fonction refuse les commandes (503) : jamais de faux succès.
 *
 * Adresse publique : /api/commande
 */
import menu from '../../src/data/menu.json' with { type: 'json' };
import { COMMANDE, RESTAURANT } from '../../src/config.js';
import { creerCalcul, argent, heureLisible, heureRestaurant, jourSemaine, normaliserCodePostal } from '../../src/commande/calcul.js';

export const config = { path: '/api/commande' };

const calc = creerCalcul({ menu, commande: COMMANDE });
const TAILLE_MAX = 16_000;
const LIGNES_MAX = 30;
const QTE_MAX = 20;

// Mémoire de l'instance (meilleur effort : réinitialisée quand la fonction redémarre)
const dejaRecues = new Map(); // commande_id → { ref, reponse, t }
const parIp = new Map(); // ip → [horodatages]
const LIMITE = { nombre: 6, fenetreMs: 10 * 60 * 1000 };

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const erreur = (status, message, champ) => json(status, { ok: false, erreur: message, ...(champ ? { champ } : {}) });

const texte = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');
const DATE_LONGUE = new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const dateLisible = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return DATE_LONGUE.format(new Date(Date.UTC(y, m - 1, d)));
};

/** Valide et recalcule. Exporté pour les tests (npm test). */
export function preparer(body, { maintenant = new Date() } = {}) {
  if (!COMMANDE?.actif) return { status: 503, message: 'La commande en ligne est fermée pour le moment.' };
  if (!body || typeof body !== 'object') return { status: 400, message: 'Commande illisible.' };

  const nom = texte(body.nom, 80);
  const telChiffres = String(body.telephone ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  const courriel = texte(body.courriel, 120);
  const notes = texte(body.notes, 300);
  if (nom.length < 2) return { status: 400, message: 'Indiquez votre nom.', champ: 'nom' };
  if (telChiffres.length !== 10) return { status: 400, message: 'Numéro de téléphone invalide.', champ: 'telephone' };
  if (courriel && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(courriel)) return { status: 400, message: 'Courriel invalide.', champ: 'courriel' };
  const telephone = `(${telChiffres.slice(0, 3)}) ${telChiffres.slice(3, 6)}-${telChiffres.slice(6)}`;

  const mode = COMMANDE.modes.includes(body.mode) ? body.mode : null;
  if (!mode) return { status: 400, message: 'Mode de commande invalide.' };
  const paiement = COMMANDE.paiements.includes(body.paiement) ? body.paiement : null;
  if (!paiement) return { status: 400, message: 'Mode de paiement invalide.' };

  // Lignes : seulement id, format, option et quantité (le prix vient du menu)
  if (!Array.isArray(body.lignes) || !body.lignes.length) return { status: 400, message: 'Votre commande est vide.' };
  if (body.lignes.length > LIGNES_MAX) return { status: 400, message: 'Commande trop longue : appelez-nous.' };
  const lignes = [];
  for (const l of body.lignes) {
    const qte = Number(l?.qte);
    if (!Number.isInteger(qte) || qte < 1 || qte > QTE_MAX) return { status: 400, message: 'Quantité invalide.' };
    const ligne = { id: String(l.id ?? ''), format: String(l.format ?? ''), sansGluten: l.sansGluten === true, qte };
    if (!calc.prixUnitaire(ligne)) return { status: 400, message: 'Un plat de la commande n’est plus disponible.' };
    lignes.push(ligne);
  }

  // Adresse et zone
  let secteur = null;
  let adresse = '—';
  if (mode === 'livraison') {
    const cp = normaliserCodePostal(body.codePostal);
    const rue = texte(body.adresse, 160);
    if (rue.length < 6) return { status: 400, message: "Indiquez l'adresse de livraison.", champ: 'adresse' };
    if (!cp) return { status: 400, message: 'Code postal invalide.', champ: 'codePostal' };
    secteur = calc.secteurDe(cp);
    if (!secteur) return { status: 400, message: 'Hors de notre zone de livraison.', champ: 'codePostal' };
    adresse = `${rue}, Gatineau (Québec) ${cp}`;
  }

  // Créneau (heure de Gatineau)
  const fenetre = calc.creneaux(maintenant);
  const q = body.quand ?? {};
  let date;
  let heure;
  if (q.type === 'asap') {
    if (!fenetre.desQuePossible) return { status: 409, message: "« Dès que possible » n'est plus disponible : choisissez une heure.", champ: 'heure' };
    date = fenetre.date;
    heure = null;
  } else {
    date = String(q.date ?? '');
    heure = String(q.heure ?? '');
    const { date: auj, minutes: now } = heureRestaurant(maintenant);
    const [h, m] = heure.split(':').map(Number);
    const min = h * 60 + m;
    const [dh, dm] = COMMANDE.heures.debut.split(':').map(Number);
    const [fh, fm] = COMMANDE.heures.fin.split(':').map(Number);
    const valide =
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      /^\d{2}:\d{2}$/.test(heure) &&
      m % 15 === 0 &&
      min >= dh * 60 + dm &&
      min <= fh * 60 + fm &&
      date >= auj &&
      !calc.ferme(date) &&
      // Marge de 10 min si le créneau vient tout juste de passer pendant la saisie
      (date > auj || min >= now + (COMMANDE.delaiMinutes ?? 45) - 10);
    if (!valide) return { status: 409, message: "L'heure choisie n'est plus disponible : choisissez-en une autre.", champ: 'heure' };
  }

  const t = calc.totaux({ lignes, mode, secteur, jour: jourSemaine(date) });
  if (t.manque) return { status: 400, message: `Minimum de ${argent(COMMANDE.minimumLivraison)} pour la livraison.` };

  const ref = String(body.commande_id ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase();
  const quand = heure ? `${dateLisible(date)} à ${heureLisible(heure)}` : `Dès que possible (${dateLisible(date)})`;
  const modeTexte = mode === 'livraison' ? `Livraison — secteur ${secteur.nom}` : 'Cueillette au restaurant';

  const message = {
    type_demande: `Commande — ${mode === 'livraison' ? 'Livraison' : 'Cueillette'}`,
    numero: ref,
    nom,
    telephone,
    mode: modeTexte,
    adresse,
    date,
    heure: heure ?? 'dès que possible',
    quand,
    paiement,
    commande: t.lignes
      .map((l) => `${l.qte} × ${l.nom}${l.format ? ` (${l.format})` : ''}${l.sansGluten ? ' — sans gluten' : ''} : ${argent(Math.round(l.prix * l.qte * 100) / 100)}`)
      .join('\n'),
    sous_total: argent(t.sousTotal),
    rabais: t.rabais.map((r) => `${r.libelle} : − ${argent(r.montant)}`).join(' ; ') || '—',
    frais_livraison: mode === 'livraison' ? argent(t.frais) : '—',
    taxes: t.taxes.map((x) => `${x.nom} ${argent(x.montant)}`).join(' ; '),
    total_estime: argent(t.total),
    instructions: notes || '—',
    verification: 'Total recalculé par le serveur du site. À confirmer par téléphone avec le client avant préparation.',
    _subject: `COMMANDE ${mode === 'livraison' ? 'LIVRAISON' : 'CUEILLETTE'} — ${quand} — ${argent(t.total)} — n° ${ref}`,
  };
  if (courriel) {
    message.courriel = courriel;
    message._replyto = courriel;
  }
  return { status: 200, ref, message, resume: { total: argent(t.total), quand, mode: modeTexte, telephone } };
}

export default async function handler(req, context) {
  if (req.method !== 'POST') return erreur(405, 'Méthode non permise.');
  const brut = await req.text();
  if (brut.length > TAILLE_MAX) return erreur(413, 'Commande trop volumineuse.');
  let body;
  try {
    body = JSON.parse(brut);
  } catch {
    return erreur(400, 'Commande illisible.');
  }

  // Champ piège rempli : on fait comme si tout allait bien, sans rien transmettre
  if (body?._gotcha) return json(200, { ok: true, ref: 'OK' });

  // Limite par adresse IP
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'inconnue';
  const maintenant = Date.now();
  const recents = (parIp.get(ip) ?? []).filter((t) => maintenant - t < LIMITE.fenetreMs);
  if (recents.length >= LIMITE.nombre) return erreur(429, `Trop de commandes en peu de temps. Appelez-nous au ${RESTAURANT.telephone}.`);

  // Même commande reçue deux fois (double clic, réseau lent) : on renvoie la première réponse
  const cle = String(body?.commande_id ?? '');
  for (const [k, v] of dejaRecues) if (maintenant - v.t > 3600_000) dejaRecues.delete(k);
  if (cle && dejaRecues.has(cle)) return json(200, dejaRecues.get(cle).reponse);

  const p = preparer(body);
  if (p.status !== 200) return erreur(p.status, p.message, p.champ);

  const id = process.env.FORMSPREE_COMMANDES_ID;
  if (!id && process.env.COMMANDE_DEMO !== '1') {
    console.error('[commande] FORMSPREE_COMMANDES_ID manquant : commande refusée.');
    return erreur(503, `La commande en ligne est momentanément indisponible. Appelez-nous au ${RESTAURANT.telephone}.`);
  }

  if (id) {
    const ctrl = new AbortController();
    const minuterie = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(`https://formspree.io/f/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(p.message),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        console.error('[commande] Formspree a refusé :', res.status, await res.text().catch(() => ''));
        return erreur(502, `La commande n'a pas pu être transmise. Réessayez ou appelez-nous au ${RESTAURANT.telephone}.`);
      }
    } catch (e) {
      console.error('[commande] Formspree injoignable :', e?.name);
      return erreur(504, `La commande n'a pas pu être transmise. Réessayez ou appelez-nous au ${RESTAURANT.telephone}.`);
    } finally {
      clearTimeout(minuterie);
    }
  } else {
    console.info('[commande — DÉMO] Rien n’est transmis :', p.message._subject);
  }

  recents.push(maintenant);
  parIp.set(ip, recents);
  const reponse = { ok: true, ref: p.ref, ...p.resume };
  if (cle) dejaRecues.set(cle, { reponse, t: maintenant });
  return json(200, reponse);
}

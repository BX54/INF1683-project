/**
 * Panier de la commande en ligne (état en mémoire seulement : rien n'est enregistré dans le navigateur,
 * il se vide si la page est rechargée). Les règles de prix sont dans src/commande/calcul.js,
 * les mêmes que celles de la fonction serveur qui recalcule chaque commande.
 */
import { COMMANDE } from '../config.js';
import { menu } from './data.js';
import { creerCalcul } from '../commande/calcul.js';

export { argent, formats, heureLisible, normaliserCodePostal } from '../commande/calcul.js';

const calc = creerCalcul({ menu, commande: COMMANDE });
export const { secteurDe, sansGlutenPossible, creneaux } = calc;

export const commandeActive = () => !!COMMANDE?.actif;

// ---------------------------------------------------------------------
// État
// ---------------------------------------------------------------------
const lignes = []; // { key, id, nom, format, prix, sansGluten, qte }
const abonnes = new Set();
const notifier = () => abonnes.forEach((fn) => fn(lignes));

export const surChangement = (fn) => (abonnes.add(fn), () => abonnes.delete(fn));
export const lignesPanier = () => lignes;
export const nbArticles = () => lignes.reduce((n, l) => n + l.qte, 0);

/** Quantité maximale par ligne (au-delà : appeler le restaurant) */
export const QTE_MAX = 20;

export function ajouter({ id, nom, format, prix, sansGluten = false }) {
  const key = `${id}|${format}|${sansGluten ? 1 : 0}`;
  const l = lignes.find((x) => x.key === key);
  if (l) l.qte = Math.min(QTE_MAX, l.qte + 1);
  else lignes.push({ key, id, nom, format, prix, sansGluten, qte: 1 });
  notifier();
}

export function changerQte(key, delta) {
  const i = lignes.findIndex((x) => x.key === key);
  if (i < 0) return;
  lignes[i].qte = Math.min(QTE_MAX, lignes[i].qte + delta);
  if (lignes[i].qte <= 0) lignes.splice(i, 1);
  notifier();
}

export function vider() {
  lignes.length = 0;
  notifier();
}

export const prixLigne = (l) => (l.prix + (l.sansGluten ? COMMANDE.sansGluten?.supplement ?? 0 : 0)) * l.qte;

/** Totaux affichés (mêmes règles que le serveur). secteur : objet ou null ; jour : 0 à 6. */
export const totaux = ({ mode, secteur, jour }) => calc.totaux({ lignes, mode, secteur, jour });

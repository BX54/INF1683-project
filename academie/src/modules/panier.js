/**
 * Panier de la commande en ligne : calculs seulement (aucun affichage).
 * Le panier vit uniquement en mémoire : rien n'est enregistré dans le navigateur
 * (il se vide si la page est rechargée).
 */
import { COMMANDE } from '../config.js';
import { menu } from './data.js';

export const commandeActive = () => !!COMMANDE?.actif;

/** Catégorie (id) de chaque plat. */
const catDe = new Map();
for (const c of menu.categories) for (const p of c.plats) catDe.set(p.id, c.id);
export const categorieDe = (id) => catDe.get(id);

/** 14 → « 14 $ » ; 16.5 → « 16,50 $ » */
export const argent = (n) => (Number.isInteger(n) ? `${n} $` : `${n.toFixed(2).replace('.', ',')} $`);

/**
 * Formats d'un plat à partir de son prix :
 * "14" → [Régulier 14] ; "5 · gratiné 8" → [Régulier 5, Gratiné 8] ; "6 · 9" → [Régulier 6, Grand 9].
 * "Prix du marché" → null (à commander par téléphone).
 */
export function formats(prix) {
  const parts = String(prix ?? '')
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  for (const [i, part] of parts.entries()) {
    const m = part.match(/^(.*?)(\d+(?:[.,]\d+)?)\s*\$?$/);
    if (!m) return null;
    const label = m[1].trim();
    out.push({
      label: label ? label[0].toUpperCase() + label.slice(1) : i === 0 ? 'Régulier' : 'Grand',
      prix: Number(m[2].replace(',', '.')),
    });
  }
  return out.length ? out : null;
}

/** Code postal canadien valide → « J8T 8A4 », sinon null. */
export function normaliserCodePostal(v) {
  const c = String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(c) ? `${c.slice(0, 3)} ${c.slice(3)}` : null;
}

/** Secteur de livraison d'après le code postal (null = hors zone ou code incomplet). */
export function secteurDe(codePostal) {
  const c = normaliserCodePostal(codePostal);
  if (!c) return null;
  return COMMANDE.secteurs.find((s) => s.codes?.includes(c.slice(0, 3))) ?? null;
}

export const sansGlutenPossible = (id) => (COMMANDE.sansGluten?.categories ?? []).includes(categorieDe(id));

// ---------------------------------------------------------------------
// État
// ---------------------------------------------------------------------
const lignes = []; // { key, id, nom, format, prix, sansGluten, qte }
const abonnes = new Set();
const notifier = () => abonnes.forEach((fn) => fn(lignes));

export const surChangement = (fn) => (abonnes.add(fn), () => abonnes.delete(fn));
export const lignesPanier = () => lignes;
export const nbArticles = () => lignes.reduce((n, l) => n + l.qte, 0);

export function ajouter({ id, nom, format, prix, sansGluten = false }) {
  const key = `${id}|${format}|${sansGluten ? 1 : 0}`;
  const l = lignes.find((x) => x.key === key);
  if (l) l.qte += 1;
  else lignes.push({ key, id, nom, format, prix, sansGluten, qte: 1 });
  notifier();
}

export function changerQte(key, delta) {
  const i = lignes.findIndex((x) => x.key === key);
  if (i < 0) return;
  lignes[i].qte += delta;
  if (lignes[i].qte <= 0) lignes.splice(i, 1);
  notifier();
}

export function vider() {
  lignes.length = 0;
  notifier();
}

export const prixLigne = (l) => (l.prix + (l.sansGluten ? COMMANDE.sansGluten?.supplement ?? 0 : 0)) * l.qte;

const round = (n) => Math.round(n * 100) / 100;

/** Totaux. secteur : objet de COMMANDE.secteurs (ou null) ; jour : 0 (dimanche) à 6 (pour les rabais). */
export function totaux({ mode, secteur, jour }) {
  const sousTotal = lignes.reduce((s, l) => s + prixLigne(l), 0);
  const rabais = [];
  for (const r of COMMANDE.rabais ?? []) {
    if (!r.jours?.includes(jour)) continue;
    const qte = lignes.filter((l) => r.categories.includes(categorieDe(l.id))).reduce((n, l) => n + l.qte, 0);
    if (qte) rabais.push({ libelle: r.libelle, montant: r.montant * qte });
  }
  const totalRabais = rabais.reduce((s, r) => s + r.montant, 0);
  const frais = mode === 'livraison' ? secteur?.frais ?? 0 : 0;
  const avantTaxes = Math.max(0, sousTotal - totalRabais) + frais;
  const taxes = Object.entries(COMMANDE.taxes ?? {}).map(([nom, taux]) => ({ nom, montant: round(avantTaxes * taux) }));
  const total = round(avantTaxes + taxes.reduce((s, t) => s + t.montant, 0));
  const minimum = COMMANDE.minimumLivraison ?? 0;
  const manque = mode === 'livraison' ? Math.max(0, round(minimum - (sousTotal - totalRabais))) : 0;
  return { sousTotal, rabais, totalRabais, frais, taxes, total, manque };
}

// ---------------------------------------------------------------------
// Heures de livraison / cueillette
// ---------------------------------------------------------------------
const minutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const heureLisible = (h) => h.replace(':', ' h ').replace(' h 00', ' h');

/**
 * Créneaux possibles (toutes les 15 min) : aujourd'hui si possible, sinon demain.
 * Retourne { jour: 'aujourdhui' | 'demain', date, creneaux: ['18:15', …], desQuePossible }.
 */
export function creneaux(maintenant = new Date()) {
  const debut = minutes(COMMANDE.heures.debut);
  const fin = minutes(COMMANDE.heures.fin);
  const delai = COMMANDE.delaiMinutes ?? 45;
  const now = maintenant.getHours() * 60 + maintenant.getMinutes();
  let premier = Math.max(debut, Math.ceil((now + delai) / 15) * 15);
  const date = new Date(maintenant);
  let jour = 'aujourdhui';
  if (premier > fin) {
    jour = 'demain';
    premier = debut;
    date.setDate(date.getDate() + 1);
  }
  const liste = [];
  for (let t = premier; t <= fin; t += 15) liste.push(hhmm(t));
  const desQuePossible = jour === 'aujourdhui' && now + delai >= debut && now + delai <= fin;
  return { jour, date, creneaux: liste, desQuePossible };
}

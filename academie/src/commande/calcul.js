/**
 * Règles de la commande en ligne, partagées par le site (affichage) ET la fonction serveur
 * (netlify/functions/commande.mjs), qui recalcule tout avant de transmettre la commande.
 * Aucune dépendance au navigateur : ce fichier fonctionne aussi dans Node.
 *
 *   const calc = creerCalcul({ menu, commande: COMMANDE });
 */

export const FUSEAU = 'America/Toronto';

const round = (n) => Math.round(n * 100) / 100;

/** 14 → « 14 $ » ; 16.5 → « 16,50 $ » */
export const argent = (n) => (Number.isInteger(n) ? `${n} $` : `${n.toFixed(2).replace('.', ',')} $`);

/** "18:30" → « 18 h 30 » ; "18:00" → « 18 h » */
export const heureLisible = (h) => String(h).replace(':', ' h ').replace(' h 00', ' h');

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

// ---------------------------------------------------------------------
// Date et heure du restaurant (toujours à Gatineau, quel que soit le fuseau du visiteur)
// ---------------------------------------------------------------------
const PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSEAU,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Maintenant, à Gatineau : { date: '2026-11-09', minutes: 1110 } */
export function heureRestaurant(maintenant = new Date()) {
  const p = Object.fromEntries(PARTS.formatToParts(maintenant).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** '2026-11-09' + n jours → '2026-11-10' (calcul sur le calendrier, sans fuseau) */
export function ajouterJours(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Jour de la semaine (0 = dimanche) d'une date '2026-11-09' */
export const jourSemaine = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

const minutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// ---------------------------------------------------------------------
export function creerCalcul({ menu, commande: C }) {
  const plats = new Map();
  for (const c of menu.categories) for (const p of c.plats) plats.set(p.id, { ...p, categorie: c.id });

  const sansGlutenPossible = (id) => (C.sansGluten?.categories ?? []).includes(plats.get(id)?.categorie);

  /** Secteur de livraison d'après le code postal (null = hors zone ou code incomplet). */
  const secteurDe = (codePostal) => {
    const c = normaliserCodePostal(codePostal);
    if (!c) return null;
    return C.secteurs.find((s) => s.codes?.includes(c.slice(0, 3))) ?? null;
  };

  /** Jour fermé (date ISO listée dans C.fermetures, ou jour de semaine dans C.joursFermes) */
  const ferme = (iso) => (C.fermetures ?? []).includes(iso) || (C.joursFermes ?? []).includes(jourSemaine(iso));

  /**
   * Créneaux possibles (toutes les 15 min) au plus tôt après le délai de préparation.
   * Aujourd'hui si possible, sinon le prochain jour ouvert.
   * → { date: '2026-11-09', jour: 'aujourdhui' | 'demain' | 'plus-tard', creneaux: ['18:15', …], desQuePossible }
   */
  const creneaux = (maintenant = new Date()) => {
    const debut = minutes(C.heures.debut);
    const fin = minutes(C.heures.fin);
    const delai = C.delaiMinutes ?? 45;
    const { date: auj, minutes: now } = heureRestaurant(maintenant);
    for (let j = 0; j < 14; j++) {
      const date = ajouterJours(auj, j);
      if (ferme(date)) continue;
      const premier = j === 0 ? Math.max(debut, Math.ceil((now + delai) / 15) * 15) : debut;
      if (premier > fin) continue;
      const liste = [];
      for (let t = premier; t <= fin; t += 15) liste.push(hhmm(t));
      const desQuePossible = j === 0 && now + delai >= debut && now + delai <= fin;
      return { date, jour: j === 0 ? 'aujourdhui' : j === 1 ? 'demain' : 'plus-tard', creneaux: liste, desQuePossible };
    }
    return { date: auj, jour: 'aujourdhui', creneaux: [], desQuePossible: false };
  };

  /**
   * Prix d'une ligne à partir des données du menu (jamais du prix envoyé par le navigateur).
   * Retourne null si le plat, le format ou l'option n'existe pas.
   */
  const prixUnitaire = ({ id, format = '', sansGluten = false }) => {
    const p = plats.get(id);
    const f = formats(p?.prix);
    if (!p || !f) return null;
    const choix = f.length === 1 ? (format ? null : f[0]) : f.find((x) => x.label === format);
    if (!choix) return null;
    if (sansGluten && !sansGlutenPossible(id)) return null;
    return { nom: p.nom, categorie: p.categorie, prix: choix.prix + (sansGluten ? C.sansGluten?.supplement ?? 0 : 0) };
  };

  /**
   * Totaux d'une commande. lignes : [{ id, format, sansGluten, qte }] ; secteur : objet ou null ;
   * jour : 0 (dimanche) à 6, jour de la livraison / cueillette (pour les rabais).
   */
  const totaux = ({ lignes, mode, secteur, jour }) => {
    const det = lignes.map((l) => ({ ...l, ...prixUnitaire(l) }));
    const sousTotal = round(det.reduce((s, l) => s + (l.prix ?? 0) * l.qte, 0));
    const rabais = [];
    for (const r of C.rabais ?? []) {
      if (!r.jours?.includes(jour)) continue;
      const qte = det.filter((l) => r.categories.includes(l.categorie)).reduce((n, l) => n + l.qte, 0);
      if (qte) rabais.push({ libelle: r.libelle, montant: round(r.montant * qte) });
    }
    const totalRabais = round(rabais.reduce((s, r) => s + r.montant, 0));
    const frais = mode === 'livraison' ? secteur?.frais ?? 0 : 0;
    const avantTaxes = round(Math.max(0, sousTotal - totalRabais) + frais);
    const taxes = Object.entries(C.taxes ?? {}).map(([nom, taux]) => ({ nom, montant: round(avantTaxes * taux) }));
    const total = round(avantTaxes + taxes.reduce((s, t) => s + t.montant, 0));
    const manque = mode === 'livraison' ? Math.max(0, round((C.minimumLivraison ?? 0) - (sousTotal - totalRabais))) : 0;
    return { lignes: det, sousTotal, rabais, totalRabais, frais, taxes, total, manque };
  };

  return { plats, sansGlutenPossible, secteurDe, creneaux, prixUnitaire, totaux, ferme };
}

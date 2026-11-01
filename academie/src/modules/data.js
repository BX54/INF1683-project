import menu from '../data/menu.json';
import accords from '../data/accords.json';
import equipe from '../data/equipe.json';
import galerie from '../data/galerie.json';
import accueil from '../data/accueil.json';
import services from '../data/services.json';

export { menu, accords, equipe, galerie, accueil, services };

/** Index id → plat (avec sa catégorie), pour que accords.json n'ait qu'à citer un id. */
export const platsParId = new Map();
for (const cat of menu.categories) {
  for (const plat of cat.plats) platsParId.set(plat.id, { ...plat, categorie: cat.nom });
}

export function getPlat(id) {
  const plat = platsParId.get(id);
  if (!plat) console.warn(`[accords.json] Plat introuvable dans menu.json : « ${id} »`);
  return plat;
}

/** Plats suggérés pour une boisson (et éventuellement un profil de rouge). */
export function suggestions(boissonId, profilId) {
  const b = accords.boissons.find((x) => x.id === boissonId);
  if (!b) return [];
  if (b.profils) {
    const p = b.profils.find((x) => x.id === profilId);
    if (p) return p.plats;
    // Sans profil : le premier plat de chaque profil
    return b.profils.map((x) => x.plats[0]);
  }
  return b.plats;
}

export const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

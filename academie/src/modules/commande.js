/**
 * Livraison : boutons vers Uber Eats, DoorDash et SkipTheDishes (simples liens externes,
 * aucun script tiers). Liens dans RESTAURANT.livraison (src/config.js).
 */
import { RESTAURANT } from '../config.js';
import { escapeHtml } from './data.js';

export const PLATEFORMES = [
  { id: 'uberEats', nom: 'Uber Eats' },
  { id: 'doorDash', nom: 'DoorDash' },
  { id: 'skipTheDishes', nom: 'SkipTheDishes' },
];

/** Liens https valides seulement. */
export function liensLivraison() {
  const l = RESTAURANT.livraison || {};
  return PLATEFORMES.map((p) => ({ ...p, url: (l[p.id] || '').trim() })).filter((p) => /^https:\/\//.test(p.url));
}

export function initCommande() {
  const liens = liensLivraison();
  const section = document.querySelector('#commander');
  if (!section || !liens.length) return;
  section.hidden = false;
  document.querySelectorAll('[data-if-order]').forEach((el) => (el.hidden = false));
  section.querySelector('[data-order-links]').innerHTML = liens
    .map(
      (p) => `<li><a class="order__btn" href="${escapeHtml(p.url)}" target="_blank" rel="noopener" data-cursor
        aria-label="Commander sur ${escapeHtml(p.nom)} (nouvel onglet)">
        <span class="order__name">${escapeHtml(p.nom)}</span>
        <span class="order__cta">Commander <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
      </a></li>`
    )
    .join('');
}

import { RESTAURANT } from '../config.js';
import { escapeHtml } from './data.js';

/** Remplit coordonnées, heures, liens et carte à partir de src/config.js. */
export function initInfos() {
  const r = RESTAURANT;

  document.querySelectorAll('[data-address]').forEach((el) => {
    el.innerHTML = `${escapeHtml(r.nom)}<br />${escapeHtml(r.adresse)}<br />${escapeHtml(r.ville)}`;
  });

  document.querySelectorAll('[data-phone-link]').forEach((el) => {
    el.href = `tel:${r.telephoneLien}`;
    el.textContent = r.telephone;
  });
  document.querySelectorAll('[data-mail-link]').forEach((el) => {
    if (!r.courriel) return el.remove();
    el.href = `mailto:${r.courriel}`;
    el.textContent = r.courriel;
  });
  document.querySelectorAll('[data-phone-text]').forEach((el) => {
    el.innerHTML = `Réservations · <a href="tel:${r.telephoneLien}">${escapeHtml(r.telephone)}</a>`;
  });

  const hours = document.querySelector('[data-hours]');
  if (hours) {
    hours.innerHTML = r.heures
      .map((h) => `<div><dt>${escapeHtml(h.jours)}</dt><dd>${escapeHtml(h.heures)}</dd></div>`)
      .join('');
  }

  const q = encodeURIComponent(r.carteRecherche);
  document.querySelectorAll('[data-directions]').forEach((el) => {
    el.href = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  });

  // Pas de carte Google intégrée (elle déposerait des témoins) : un lien ouvre Google Maps dans un nouvel onglet
  document.querySelectorAll('[data-map-addr]').forEach((el) => (el.textContent = `${r.adresse}, ${r.ville}`));

  const privacy = r.confidentialite ?? {};
  document.querySelectorAll('[data-privacy-mail]').forEach((el) => {
    el.href = `mailto:${privacy.courriel}`;
    el.textContent = privacy.courriel;
  });
  document.querySelectorAll('[data-retention]').forEach((el) => (el.textContent = privacy.conservation));
  document.querySelectorAll('[data-privacy-officer]').forEach((el) => {
    el.innerHTML = `${escapeHtml(privacy.titre)} : ${escapeHtml(privacy.responsable)},
      <a href="mailto:${escapeHtml(privacy.courriel)}">${escapeHtml(privacy.courriel)}</a>`;
  });

  document.querySelectorAll('[data-social]').forEach((el) => {
    const url = r.reseaux?.[el.dataset.social];
    if (url) el.href = url;
    else el.closest('li')?.remove();
  });

  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
}

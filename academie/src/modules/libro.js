/**
 * Réservations via Libro (lien externe, aucune intégration ni script tiers sur le site).
 * Actif seulement si RESERVATION.libroUrl est rempli dans src/config.js.
 */
import { RESERVATION } from '../config.js';

/** Lien Libro valide (https uniquement), sinon null. */
export function libroUrl() {
  const raw = (RESERVATION.libroUrl || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    console.warn('[Libro] Lien invalide dans src/config.js : le formulaire du site reste actif.');
    return null;
  }
}

export function initLibro() {
  const url = libroUrl();
  if (!url) return false;

  // Tous les liens « Réserver » de la page ouvrent Libro dans un nouvel onglet
  document.querySelectorAll('a[href="#reservation"], [data-libro-link]').forEach((a) => {
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    const label = a.getAttribute('aria-label') || a.textContent.trim();
    a.setAttribute('aria-label', `${label} (ouvre Libro dans un nouvel onglet)`);
  });

  // La section Réservation affiche le bouton Libro à la place du formulaire du site
  const section = document.querySelector('#reservation');
  section?.classList.add('is-libro');
  section?.querySelector('.libro')?.removeAttribute('hidden');
  section?.querySelector('.rform')?.setAttribute('hidden', '');
  const lead = section?.querySelector('.reserve__lead');
  if (lead) {
    lead.textContent =
      'Réservez votre table en quelques secondes sur Libro. Pour ce soir ou pour toute question, appelez-nous :';
  }
  return true;
}

/**
 * Réservations via Libro, dans une fenêtre par-dessus le site.
 * Actif seulement si RESERVATION.libroUrl est rempli dans src/config.js.
 *
 * - Le module Libro (iframe) n'est chargé qu'au premier clic sur « Réserver » :
 *   tant que personne ne réserve, rien de Libro n'est chargé (aucun témoin, aucune requête).
 * - Les liens gardent l'adresse Libro : Ctrl/Cmd + clic ou clic du milieu ouvre un onglet,
 *   et le lien « nouvel onglet » de la fenêtre sert de solution de secours.
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

let dialog = null;
let lenisRef = null;
let lastFocus = null;

function buildDialog(url) {
  const d = document.createElement('dialog');
  d.className = 'libro-modal';
  d.setAttribute('data-lenis-prevent', '');
  d.setAttribute('aria-labelledby', 'libro-modal-title');
  d.innerHTML = `
    <div class="libro-modal__bar">
      <p class="libro-modal__title" id="libro-modal-title">Réserver une table</p>
      <a class="libro-modal__ext" href="${url}" target="_blank" rel="noopener">Ouvrir dans un nouvel onglet</a>
      <button type="button" class="libro-modal__close" aria-label="Fermer la réservation">
        <span aria-hidden="true">✕</span>
      </button>
    </div>
    <div class="libro-modal__body">
      <div class="libro-modal__loading" role="status">
        <span class="libro-modal__spinner" aria-hidden="true"></span>
        <p>Chargement de la réservation…</p>
        <p class="libro-modal__slow">Le chargement prend du temps ?
          <a href="${url}" target="_blank" rel="noopener">Ouvrir la réservation dans un nouvel onglet</a></p>
      </div>
    </div>
    <p class="libro-modal__note">
      Réservation gérée par Libro (OpenTable), qui peut utiliser des témoins.
      <a href="/politique-confidentialite.html" target="_blank" rel="noopener">Confidentialité</a>
    </p>`;
  document.body.appendChild(d);

  d.querySelector('.libro-modal__close').addEventListener('click', () => d.close());
  // Clic sur le fond sombre = fermer
  d.addEventListener('click', (e) => {
    if (e.target === d) d.close();
  });
  d.addEventListener('close', () => {
    lenisRef?.start();
    document.documentElement.classList.remove('has-modal');
    lastFocus?.focus?.({ preventScroll: true });
  });
  return d;
}

/**
 * Prépare la fenêtre et commence à charger Libro sans l'afficher.
 * Appelé dès que le visiteur appuie sur un bouton « Réserver » (avant même la fin du clic).
 */
function prepare() {
  const url = libroUrl();
  if (!url) return null;
  dialog ??= buildDialog(url);
  const body = dialog.querySelector('.libro-modal__body');
  // Chargé une seule fois : fermer puis rouvrir garde la réservation en cours
  if (!body.querySelector('iframe')) {
    const frame = document.createElement('iframe');
    frame.title = 'Réservation Libro — L\'Académie';
    frame.setAttribute('allow', 'payment');
    frame.loading = 'eager';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.addEventListener('load', () => body.classList.add('is-loaded'), { once: true });
    frame.src = url;
    body.appendChild(frame);
    // Après 8 s sans réponse, on propose l'onglet séparé
    setTimeout(() => body.classList.add('is-slow'), 8000);
  }
  return dialog;
}

/**
 * Ouvre seulement la connexion réseau vers Libro (DNS + chiffrement) quand le visiteur
 * survole ou cible un bouton « Réserver ». Aucune page Libro n'est chargée, aucun témoin.
 */
let warmed = false;
function warm() {
  if (warmed) return;
  warmed = true;
  const origin = new URL(libroUrl()).origin;
  for (const rel of ['dns-prefetch', 'preconnect']) {
    const l = document.createElement('link');
    l.rel = rel;
    l.href = origin;
    document.head.appendChild(l);
  }
}

export function openLibro() {
  const d = prepare();
  if (!d) return;
  lastFocus = document.activeElement;
  lenisRef?.stop();
  document.documentElement.classList.add('has-modal');
  d.showModal();
  d.querySelector('.libro-modal__close').focus();
}

export function initLibro({ lenis } = {}) {
  const url = libroUrl();
  if (!url) return false;
  lenisRef = lenis ?? null;

  // Tous les liens « Réserver » ouvrent la fenêtre Libro
  document.querySelectorAll('a[href="#reservation"], [data-libro-link]').forEach((a) => {
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-haspopup', 'dialog');
  });
  // Les boutons qui ouvrent la réservation
  const trigger = (el) => el?.closest?.('a[aria-haspopup="dialog"], [data-reserve-drink]');
  // Survol / clavier : on ouvre la connexion à l'avance (gagne souvent 0,5 à 1 s)
  document.addEventListener('pointerover', (e) => trigger(e.target) && warm(), { passive: true });
  document.addEventListener('focusin', (e) => trigger(e.target) && warm());
  // Appui (souris ou doigt) : Libro commence à charger avant même la fin du clic
  document.addEventListener('pointerdown', (e) => {
    if (e.button === 0 && trigger(e.target)) {
      warm();
      prepare();
    }
  }, { passive: true });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[aria-haspopup="dialog"]');
    if (!a || a.href !== url) return;
    // Ctrl/Cmd/Maj + clic : on laisse le navigateur ouvrir un onglet
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    openLibro();
  });

  // La section Réservation affiche le bouton Libro à la place du formulaire du site
  const section = document.querySelector('#reservation');
  section?.classList.add('is-libro');
  section?.querySelector('.libro')?.removeAttribute('hidden');
  section?.querySelector('.rform')?.setAttribute('hidden', '');
  const lead = section?.querySelector('.reserve__lead');
  if (lead) {
    lead.textContent =
      'Réservez votre table en quelques secondes, sans quitter le site. Pour ce soir ou pour toute question, appelez-nous :';
  }
  return true;
}

import '@fontsource/playfair-display/latin-400.css';
import '@fontsource/manrope/latin-300.css';
import '@fontsource/manrope/latin-400.css';
import './styles/main.css';

import { RESTAURANT, RESERVATION } from './config.js';

// Remplit la politique avec les coordonnées de src/config.js
const p = RESTAURANT.confidentialite ?? {};
const values = {
  ...p,
  adresse: `${RESTAURANT.adresse}, ${RESTAURANT.ville}`,
};

document.querySelectorAll('[data-p]').forEach((el) => {
  el.textContent = values[el.dataset.p] ?? '';
});
document.querySelectorAll('[data-p-mail]').forEach((el) => {
  el.href = `mailto:${p.courriel}`;
  el.textContent = p.courriel;
});
if ((RESERVATION.libroUrl || '').trim()) {
  document.querySelectorAll('[data-if-libro]').forEach((el) => el.removeAttribute('hidden'));
}
document.querySelectorAll('[data-p-tel]').forEach((el) => {
  el.href = `tel:${RESTAURANT.telephoneLien}`;
  el.textContent = RESTAURANT.telephone;
});

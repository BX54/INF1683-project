import { gsap } from 'gsap';
import { finePointer, reduced } from './motion.js';

const CLICKABLE = 'a, button, [role="tab"], [role="radio"], [data-cursor], label, summary';

export function initCursor() {
  if (!finePointer) return;
  const root = document.querySelector('.cursor');
  if (!root) return;
  document.documentElement.classList.add('has-cursor');

  const ring = root.querySelector('.cursor__ring');
  const dot = root.querySelector('.cursor__dot');
  const label = root.querySelector('.cursor__label');

  const speed = reduced ? 0.01 : 1;
  const dotX = gsap.quickTo(dot, 'x', { duration: 0.12 * speed, ease: 'power3' });
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.12 * speed, ease: 'power3' });
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.5 * speed, ease: 'power3' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.5 * speed, ease: 'power3' });

  gsap.set([dot, ring], { x: innerWidth / 2, y: innerHeight / 2 });
  root.classList.add('is-hidden');

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      root.classList.remove('is-hidden');
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    },
    { passive: true }
  );

  document.addEventListener('pointerover', (e) => {
    const t = e.target;
    const field = t.closest('input:not([type="hidden"]), textarea');
    const hit = t.closest(CLICKABLE);
    const lbl = t.closest('[data-cursor-label]');
    root.classList.toggle('is-text', !!field);
    root.classList.toggle('is-hover', !!hit && !field && !lbl);
    root.classList.toggle('is-label', !!lbl);
    label.textContent = lbl ? lbl.dataset.cursorLabel : '';
  });

  document.documentElement.addEventListener('pointerleave', () => root.classList.add('is-hidden'));
  window.addEventListener('pointerdown', () => gsap.to(ring, { scale: 0.8, duration: 0.2 }));
  window.addEventListener('pointerup', () => gsap.to(ring, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }));
}

/** Boutons « aimantés » qui suivent légèrement la souris. */
export function initMagnetic() {
  if (!finePointer || reduced) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.38);
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' });
    });
  });
}

/** Lueur qui suit la souris (variables CSS --mx / --my). */
export function trackGlow(el) {
  if (!finePointer) return;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  });
}

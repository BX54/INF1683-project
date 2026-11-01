import { gsap } from 'gsap';
import { reduced } from './motion.js';

const fontsReady = () =>
  Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 400))]);

/** Logo qui se dessine en or, compteur, puis ouverture en rideau. */
export function playIntro() {
  const intro = document.querySelector('.intro');
  if (!intro) return Promise.resolve();

  return new Promise((resolve) => {
    // Rien n'est enregistré dans le navigateur : l'intro est jouée à chaque visite.
    const done = () => intro.remove();

    if (reduced) {
      gsap.to(intro, { autoAlpha: 0, duration: 0.4, delay: 0.2, onComplete: () => (done(), resolve()) });
      return;
    }

    fontsReady().then(() => {
      const word = intro.querySelector('.intro__word');
      const num = intro.querySelector('.intro__num');
      const count = { v: 0 };

      // Intro express (~1 s) : le logo s'écrit en or puis le rideau s'ouvre aussitôt,
      // pour ne pas retarder l'affichage du contenu (vitesse et référencement).
      num.parentElement.hidden = true;
      const tl = gsap.timeline({ onComplete: done });
      // Le nom est déjà visible en or (CSS) dès le premier affichage ; seuls les ornements se dessinent.
      tl.from(intro.querySelectorAll('.draw'), { drawSVG: '50% 50%', duration: 0.5, stagger: 0.04, ease: 'power2.out' })
        .from(word, { scale: 0.97, transformOrigin: '50% 50%', duration: 0.6, ease: 'power2.out' }, 0)
        .to('.intro__inner', { autoAlpha: 0, scale: 0.98, duration: 0.3, ease: 'power2.in' }, 0.6)
        .to('.intro__panel--top', { yPercent: -101, duration: 0.6, ease: 'expo.inOut' }, 0.6)
        .to('.intro__panel--bottom', { yPercent: 101, duration: 0.6, ease: 'expo.inOut' }, 0.6)
        .add(resolve, 0.75);
    });
  });
}

import { gsap } from 'gsap';
import { reduced } from './motion.js';

const fontsReady = () =>
  Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2200))]);

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

      const tl = gsap.timeline({ onComplete: done });
      tl.timeScale(1.25);

      tl.from(intro.querySelectorAll('.draw'), {
        drawSVG: '50% 50%',
        duration: 1.5,
        stagger: 0.12,
        ease: 'power2.inOut',
      })
        .to(word, { strokeDashoffset: 0, duration: 2.3, ease: 'power2.inOut' }, 0.15)
        .to(count, {
          v: 100,
          duration: 2.5,
          ease: 'power2.inOut',
          onUpdate: () => (num.textContent = Math.round(count.v)),
        }, 0)
        .to(word, { fillOpacity: 1, duration: 0.9, ease: 'power1.out' }, '-=0.7')
        .to('.intro__sub', { opacity: 1, duration: 0.8 }, '<0.1')
        .to(word, { strokeOpacity: 0, duration: 0.6 }, '<0.3')
        .to('.intro__inner', { autoAlpha: 0, y: -16, scale: 0.97, duration: 0.7, ease: 'power3.in' }, '+=0.35')
        .to('.intro__panel--top', { yPercent: -101, duration: 1.2, ease: 'expo.inOut' }, '-=0.1')
        .to('.intro__panel--bottom', { yPercent: 101, duration: 1.2, ease: 'expo.inOut' }, '<')
        .add(resolve, '-=0.85');
    });
  });
}

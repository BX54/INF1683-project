import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reduced, splitWords } from './motion.js';

/** Titres mot par mot, apparitions douces et effets liés au défilement. */
export function initReveals() {
  // Découpe tous les titres (y compris celui du hero) dès maintenant pour éviter un saut visuel
  const heroTitle = document.querySelector('[data-split="hero"]');
  const heroWords = splitWords(heroTitle);
  if (!reduced) gsap.set(heroWords, { yPercent: 115, rotate: 3 });

  if (reduced) {
    document.querySelectorAll('[data-split]').forEach((el) => splitWords(el));
    return;
  }

  document.querySelectorAll('[data-split]:not([data-split="hero"])').forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 115,
      rotate: 4,
      duration: 1.3,
      ease: 'expo.out',
      stagger: 0.07,
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  });

  const reveals = [...document.querySelectorAll('[data-reveal]')].filter((el) => !el.closest('.hero'));
  ScrollTrigger.batch(reveals, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.12, overwrite: true }),
  });

  // Manifeste : les mots s'allument au fil du défilement
  const manifesto = document.querySelector('[data-scrub-text]');
  if (manifesto) {
    const words = splitWords(manifesto, 'sw');
    gsap.to(words, {
      color: '#F3EDE2',
      stagger: 0.1,
      ease: 'none',
      scrollTrigger: { trigger: manifesto, start: 'top 80%', end: 'bottom 50%', scrub: 0.6 },
    });
  }

  // Bouteille qui se dessine et sceau qui tourne
  const bottle = document.querySelectorAll('.bottle-draw');
  if (bottle.length) {
    gsap.from(bottle, {
      drawSVG: 0,
      ease: 'none',
      stagger: 0.08,
      scrollTrigger: { trigger: '.concept', start: 'top 70%', end: 'center 50%', scrub: 0.8 },
    });
  }
  gsap.to('.concept__seal svg', {
    rotate: 300,
    ease: 'none',
    scrollTrigger: { trigger: '.concept', start: 'top bottom', end: 'bottom top', scrub: 1 },
  });

  // Hero : léger parallaxe à la sortie
  gsap.to('.hero__content', {
    yPercent: -18,
    opacity: 0.1,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero__media', {
    yPercent: 12,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // Panneau ivoire « Nous trouver »
  gsap.from('.locale', {
    clipPath: 'inset(8% 6% 8% 6%)',
    duration: 1.6,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.locale', start: 'top 85%', once: true },
  });

  // Grand logo du pied de page
  gsap.from('.footer__mark span', {
    yPercent: 60,
    opacity: 0,
    duration: 1.6,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.footer', start: 'top 85%', once: true },
  });
}

/** Animation d'entrée du hero, déclenchée à la fin de l'intro. */
export function revealHero() {
  const words = document.querySelectorAll('.hero__title .w-i');
  if (reduced) {
    gsap.set('.hero [data-reveal]', { clearProps: 'all' });
    return;
  }
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to(words, { yPercent: 0, rotate: 0, duration: 1.6, stagger: 0.08 })
    .from('.hero__eyebrow', { opacity: 0, x: -30, duration: 1.2 }, 0.1)
    .to('.hero [data-reveal]', { opacity: 1, y: 0, duration: 1.3, stagger: 0.12 }, 0.5)
    .from(['.hero__counter', '.hero__dish'], { opacity: 0, y: 24, duration: 1.2, stagger: 0.1 }, 0.9)
    .from('.hero__scroll', { opacity: 0, y: 20, duration: 1 }, 1);
}

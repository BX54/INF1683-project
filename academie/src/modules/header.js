import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reduced } from './motion.js';

export function initHeader({ lenis }) {
  const header = document.querySelector('.header');
  const sticky = document.querySelector('.sticky-cta');
  const burger = document.querySelector('.burger');
  const menu = document.querySelector('.mobile-menu');

  // Masque l'en-tête en descendant, le révèle en remontant
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    const menuOpen = burger.getAttribute('aria-expanded') === 'true';
    header.classList.toggle('is-hidden', !menuOpen && y > 240 && y > lastY + 2);
    if (y < lastY - 2 || y < 240) header.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Bouton « Réserver » fixe : visible après le hero, caché sur la réservation
  const updateSticky = () => {
    const pastHero = window.scrollY > window.innerHeight * 0.6;
    const res = document.querySelector('#reservation').getBoundingClientRect();
    const onReserve = res.top < window.innerHeight * 0.8 && res.bottom > 0;
    const foot = document.querySelector('.footer').getBoundingClientRect().top < window.innerHeight * 0.9;
    sticky.classList.toggle('is-visible', pastHero && !onReserve && !foot);
  };
  window.addEventListener('scroll', updateSticky, { passive: true });
  updateSticky();

  // Lien actif dans la navigation
  const links = [...document.querySelectorAll('.nav__link')];
  links.forEach((link) => {
    const section = document.querySelector(link.getAttribute('href'));
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => link.classList.toggle('is-active', self.isActive),
    });
  });

  // Menu mobile
  const items = menu.querySelectorAll('li');
  // Pendant l'ouverture, tout le reste de la page est inactif (clavier et lecteurs d'écran)
  let inertes = [];
  const arrierePlan = () => [
    ...[...document.body.children].filter((el) => el !== menu && el !== header && !el.contains(menu) && el.tagName !== 'SCRIPT'),
    ...[...header.children].filter((el) => !el.contains(burger)),
    ...[...burger.parentElement.children].filter((el) => el !== burger),
  ];
  const open = () => {
    inertes = arrierePlan().filter((el) => !el.inert);
    inertes.forEach((el) => (el.inert = true));
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Fermer le menu');
    menu.hidden = false;
    lenis?.stop();
    document.body.style.overflow = 'hidden';
    if (!reduced) {
      gsap.fromTo(menu, { clipPath: 'circle(0% at 92% 4%)' }, { clipPath: 'circle(150% at 92% 4%)', duration: 0.9, ease: 'expo.inOut' });
      gsap.fromTo(items, { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.8, ease: 'expo.out', delay: 0.3 });
    }
    menu.querySelector('a')?.focus({ preventScroll: true });
  };
  const close = ({ rendreFocus = true } = {}) => {
    inertes.forEach((el) => (el.inert = false));
    inertes = [];
    if (rendreFocus) burger.focus({ preventScroll: true });
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Ouvrir le menu');
    document.body.style.overflow = '';
    lenis?.start();
    if (reduced) {
      menu.hidden = true;
      return;
    }
    gsap.to(menu, {
      clipPath: 'circle(0% at 92% 4%)',
      duration: 0.6,
      ease: 'expo.in',
      onComplete: () => (menu.hidden = true),
    });
  };
  burger.addEventListener('click', () => (burger.getAttribute('aria-expanded') === 'true' ? close() : open()));
  menu.addEventListener('click', (e) => {
    // Lien choisi : le focus suit la destination (géré par le défilement des ancres)
    if (e.target.closest('a')) close({ rendreFocus: false });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) close();
  });
  window.addEventListener('resize', () => {
    // Même seuil que le CSS : au-delà de 1240 px, le burger disparaît
    if (window.innerWidth > 1240 && !menu.hidden) close({ rendreFocus: false });
  });
}

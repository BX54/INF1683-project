/**
 * Accueil : diaporama photo du hero, bandeau « histoire & chef » et plats signature.
 * Textes et photos dans src/data/accueil.json.
 */
import { gsap } from 'gsap';
import { accueil, menu, getPlat, escapeHtml } from './data.js';
import { reduced, formatPrice } from './motion.js';
import { scrollToEl } from './smooth.js';
import { trackGlow } from './cursor.js';
import { platSrcset, heroSlidesHtml } from './img.js';

const pad = (n) => String(n).padStart(2, '0');

// ---------------------------------------------------------------------
// Hero : diaporama des plats signature
// ---------------------------------------------------------------------
let heroApi = null;

export function initHeroSlides() {
  const media = document.querySelector('.hero__media');
  if (!media) return;
  const slides = accueil.hero.diapos;
  const duration = accueil.hero.duree ?? 6;

  media.innerHTML = heroSlidesHtml(slides);

  const els = [...media.querySelectorAll('.hero__slide')];
  const loadSlide = (el) =>
    el.querySelectorAll('[data-src], [data-srcset]').forEach((n) => {
      if (n.dataset.srcset) n.srcset = n.dataset.srcset;
      if (n.dataset.src) n.src = n.dataset.src;
      n.removeAttribute('data-src');
      n.removeAttribute('data-srcset');
    });
  // La photo suivante est chargée environ 2 s avant son apparition (jamais pendant l'arrivée sur la page)
  const loadNext = () => els.length > 1 && loadSlide(els[(index + 1) % els.length]);
  const whenLoaded = (fn) =>
    document.readyState === 'complete' ? fn() : window.addEventListener('load', fn, { once: true });
  const cur = document.querySelector('.hero__count-cur');
  const tot = document.querySelector('.hero__count-tot');
  const bar = document.querySelector('.hero__count-bar b');
  const name = document.querySelector('.hero__dish-name');
  tot.textContent = pad(slides.length);
  name.textContent = slides[0].plat;
  gsap.set(els.slice(1), { autoAlpha: 0 });

  let index = 0;
  let timer = null;
  let kenBurns = null;
  let barTween = null;
  let preTimer = null;

  const zoom = (el) => {
    kenBurns?.kill();
    if (reduced) return;
    kenBurns = gsap.fromTo(el.querySelector('img'), { scale: 1.14 }, { scale: 1.02, duration: duration + 2, ease: 'none' });
  };

  const go = (next) => {
    if (next === index) return;
    const from = els[index];
    const to = els[next];
    loadSlide(to);
    index = next;
    gsap.set(to, { zIndex: 2 });
    gsap.set(from, { zIndex: 1 });
    gsap.fromTo(
      to,
      { autoAlpha: 0, clipPath: 'inset(0% 0% 0% 100%)' },
      {
        autoAlpha: 1,
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 1.6,
        ease: 'expo.inOut',
        onComplete: () => gsap.set(from, { autoAlpha: 0 }),
      }
    );
    zoom(to);
    gsap.timeline()
      .to([cur, name], { yPercent: -100, opacity: 0, duration: 0.4, ease: 'power2.in' })
      .add(() => {
        cur.textContent = pad(next + 1);
        name.textContent = slides[next].plat;
      })
      .fromTo([cur, name], { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'expo.out' });
    progress();
  };

  const progress = () => {
    barTween?.kill();
    clearTimeout(timer);
    if (reduced || slides.length < 2) return;
    barTween = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration, ease: 'none' });
    clearTimeout(preTimer);
    preTimer = setTimeout(() => whenLoaded(loadNext), Math.max(0, duration - 2) * 1000);
    timer = setTimeout(() => go((index + 1) % slides.length), duration * 1000);
  };

  let started = false;
  const pause = () => {
    clearTimeout(timer);
    barTween?.pause();
    kenBurns?.pause();
  };
  const resume = () => {
    if (!started) return;
    kenBurns?.resume();
    progress();
  };

  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? resume() : pause()), { threshold: 0.2 });
  io.observe(media);
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));

  heroApi = {
    start() {
      started = true;
      if (!reduced) {
        gsap.fromTo(media, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'expo.inOut' });
      }
      zoom(els[0]);
      progress();
    },
  };
}

export const startHeroSlides = () => heroApi?.start();

// ---------------------------------------------------------------------
// Bandeau histoire & chef
// ---------------------------------------------------------------------
export function initStory() {
  const root = document.querySelector('.story');
  if (!root) return;
  const { histoire, chef } = accueil;
  const set = (key, text) => {
    const el = root.querySelector(`[data-story="${key}"]`);
    if (el) el.textContent = text ?? '';
  };
  set('histoire-surtitre', histoire.surtitre);
  set('histoire-titre', histoire.titre);
  set('histoire-texte', histoire.texte);
  set('salle-legende', histoire.legende);
  set('chef-surtitre', chef.surtitre);
  set('chef-titre', chef.titre);
  set('chef-nom', chef.nom);
  set('chef-texte', chef.texte);
  const salle = root.querySelector('[data-story="salle-img"]');
  salle.src = histoire.image;
  salle.alt = histoire.legende ?? '';
  const chefImg = root.querySelector('[data-story="chef-img"]');
  chefImg.src = chef.image;
  chefImg.alt = `Portrait — ${chef.nom}`;

  if (reduced) return;
  const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 78%', once: true } });
  tl.fromTo(
    root.querySelectorAll('.story__photo'),
    { clipPath: 'inset(0% 0% 100% 0%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', stagger: 0.2 }
  )
    .from(root.querySelectorAll('.story__photo img'), { scale: 1.3, duration: 2, ease: 'expo.out', stagger: 0.2 }, 0.2)
    .from(
      root.querySelectorAll('.story__text > *:not(.story__sprig)'),
      { y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06 },
      0.5
    )
    .from(root.querySelectorAll('.story__sprig path'), { drawSVG: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.1 }, 0.9);
}

// ---------------------------------------------------------------------
// Plats signature + raccourcis vers la carte
// ---------------------------------------------------------------------
export function initSignatures() {
  const root = document.querySelector('.signatures');
  if (!root) return;
  const cards = root.querySelector('.signatures__cards');
  const list = root.querySelector('.signatures__list');

  const catOf = (id) => menu.categories.find((c) => c.plats.some((p) => p.id === id))?.id;

  cards.innerHTML = accueil.signatures
    .map(getPlat)
    .filter(Boolean)
    .map(
      (p) => `<a class="sig" href="#menu" data-menu-tab="${catOf(p.id)}" data-cursor-label="Voir">
        <div class="sig__media"><img src="${p.image}"${platSrcset(p.image, '(max-width: 720px) 90vw, 320px')} alt="${escapeHtml(p.nom)}" width="1200" height="1200" loading="lazy" decoding="async" /></div>
        <div class="sig__body">
          <h3 class="sig__name">${escapeHtml(p.nom)}</h3>
          <p class="sig__desc">${escapeHtml(p.description)}</p>
          <div class="sig__foot"><span class="sig__price">${escapeHtml(formatPrice(p.prix))}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></div>
        </div>
      </a>`
    )
    .join('');
  cards.querySelectorAll('.sig').forEach(trackGlow);

  // Raccourcis vers la carte : catégories choisies dans accueil.json (toutes si la liste est absente)
  const shortcuts = accueil.raccourcis?.length
    ? accueil.raccourcis.map((id) => menu.categories.find((c) => c.id === id)).filter(Boolean)
    : menu.categories;
  list.innerHTML = shortcuts
    .map(
      (c) => `<li><a href="#menu" data-menu-tab="${c.id}" data-cursor>${escapeHtml(c.nom)}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></a></li>`
    )
    .join('');

  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-menu-tab]');
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent('academie:menu-tab', { detail: { id: a.dataset.menuTab } }));
    scrollToEl(document.querySelector('#menu'));
  });

  if (reduced) return;
  gsap.from(cards.children, {
    y: 70,
    opacity: 0,
    duration: 1.3,
    ease: 'expo.out',
    stagger: 0.12,
    scrollTrigger: { trigger: root, start: 'top 75%', once: true },
  });
  gsap.from(list.children, {
    x: 30,
    opacity: 0,
    duration: 1,
    ease: 'expo.out',
    stagger: 0.06,
    scrollTrigger: { trigger: root, start: 'top 75%', once: true },
  });
}

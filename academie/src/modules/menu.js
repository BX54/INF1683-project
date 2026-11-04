import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { menu, escapeHtml } from './data.js';
import { reduced, finePointer, formatPrice } from './motion.js';
import { platSrcset } from './img.js';
import { scrollToEl } from './smooth.js';

export function initMenu() {
  const section = document.querySelector('.menu');
  if (!section) return;
  const tabs = section.querySelector('.menu__tabs');
  const grid = section.querySelector('.menu__grid');
  const catName = section.querySelector('.menu__cat-name');
  const catHook = section.querySelector('.menu__cat-hook');
  const catNote = section.querySelector('.menu__cat-note');

  tabs.innerHTML = menu.categories
    .map(
      (c, i) => `<button type="button" class="tab" role="tab" id="tab-${c.id}" aria-controls="menu-panel"
        aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-id="${c.id}">
        <span class="tab__num">${String(i + 1).padStart(2, '0')}</span><span class="tab__name">${escapeHtml(c.nom)}</span>
        <span class="tab__count">${c.plats.length}</span></button>`
    )
    .join('');
  grid.id = 'menu-panel';

  const card = (p) => `
    <article class="dish${p.image ? '' : ' dish--text'}">
      ${p.image ? `<div class="dish__media">
        <img src="${p.image}"${platSrcset(p.image, '(max-width: 720px) 92px, (max-width: 1100px) 45vw, 340px')} alt="${escapeHtml(p.nom)}" width="1200" height="1200" loading="lazy" decoding="async" />
      </div>` : ''}
      <div class="dish__body">
        <div class="dish__top">
          <h4 class="dish__name">${escapeHtml(p.nom)}</h4>
          <span class="dish__leader" aria-hidden="true"></span>
          <span class="dish__price">${escapeHtml(formatPrice(p.prix))}</span>
        </div>
        ${p.description ? `<p class="dish__desc">${escapeHtml(p.description)}</p>` : ''}
        ${p.tags?.length ? `<div class="dish__tags">${p.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      </div>
    </article>`;

  let currentId = null;
  const show = (id, animate = true) => {
    if (id === currentId) return;
    const cat = menu.categories.find((c) => c.id === id);
    currentId = id;

    tabs.querySelectorAll('.tab').forEach((t) => {
      const on = t.dataset.id === id;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
    });
    grid.setAttribute('aria-labelledby', `tab-${id}`);

    const render = () => {
      catName.textContent = cat.nom;
      catHook.textContent = cat.accroche ?? '';
      catNote.textContent = cat.note ?? '';
      catNote.hidden = !cat.note;
      grid.innerHTML = cat.plats.map(card).join('');
      grid.querySelectorAll('.dish').forEach(tilt);
      ScrollTrigger.refresh();
      if (!animate || reduced) return;
      gsap.fromTo(catName, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, ease: 'expo.out' });
      gsap.fromTo(
        grid.children,
        { y: 50, opacity: 0, rotateX: -8 },
        { y: 0, opacity: 1, rotateX: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07, clearProps: 'transform' }
      );
    };

    if (animate && !reduced && grid.children.length) {
      gsap.to(grid.children, { y: -20, opacity: 0, duration: 0.3, stagger: 0.03, ease: 'power2.in', onComplete: render });
      gsap.to(catName, { yPercent: -40, opacity: 0, duration: 0.3, ease: 'power2.in' });
    } else render();
  };

  const panel = section.querySelector('.menu__panel');
  const mobile = window.matchMedia('(max-width: 900px)');

  /*
   * Changement de catégorie choisi par le visiteur.
   * - La grille garde sa hauteur pendant la transition : une catégorie courte (ex. Tartares)
   *   ne fait plus « sauter » la page jusqu'à la section suivante.
   * - Si le haut de la catégorie est sorti de l'écran, on y remonte en douceur.
   */
  const choose = (id) => {
    if (id === currentId) return;
    grid.style.minHeight = `${grid.offsetHeight}px`;
    const header = document.querySelector('.header')?.offsetHeight ?? 0;
    const offset = mobile.matches ? header + tabs.offsetHeight + 12 : 120;
    const above = panel.getBoundingClientRect().top < offset - 4;
    if (above) scrollToEl(panel, -offset);
    show(id);
    clearTimeout(choose.t);
    choose.t = setTimeout(() => (grid.style.minHeight = ''), above && !reduced ? 1700 : 450);
  };

  // Sur mobile, recentre l'onglet dans la barre horizontale (sans faire défiler la page)
  const centerTab = (t) => {
    if (tabs.scrollWidth <= tabs.clientWidth) return;
    tabs.scrollTo({ left: t.offsetLeft - (tabs.clientWidth - t.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
  };

  tabs.addEventListener('click', (e) => {
    const t = e.target.closest('.tab');
    if (!t) return;
    choose(t.dataset.id);
    centerTab(t);
  });
  tabs.addEventListener('keydown', (e) => {
    const list = [...tabs.querySelectorAll('.tab')];
    const i = list.indexOf(document.activeElement);
    if (i < 0) return;
    let n = null;
    if (['ArrowDown', 'ArrowRight'].includes(e.key)) n = (i + 1) % list.length;
    if (['ArrowUp', 'ArrowLeft'].includes(e.key)) n = (i - 1 + list.length) % list.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = list.length - 1;
    if (n === null) return;
    e.preventDefault();
    list[n].focus({ preventScroll: true });
    choose(list[n].dataset.id);
    centerTab(list[n]);
  });

  show(menu.categories[0].id, false);
  document.addEventListener('academie:menu-tab', (e) => {
    if (e.detail?.id) show(e.detail.id);
  });

  // Apparition initiale des cartes
  if (!reduced) {
    gsap.from(grid.children, {
      y: 60,
      opacity: 0,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.08,
      scrollTrigger: { trigger: grid, start: 'top 85%', once: true },
    });
    gsap.from(tabs.children, {
      x: -30,
      opacity: 0,
      duration: 1,
      ease: 'expo.out',
      stagger: 0.06,
      scrollTrigger: { trigger: tabs, start: 'top 85%', once: true },
    });
  }
}

/** Inclinaison 3D et reflet doré qui suivent la souris. */
function tilt(el) {
  if (!finePointer) return;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    if (reduced) return;
    el.style.setProperty('--ry', `${(px - 0.5) * 7}deg`);
    el.style.setProperty('--rx', `${(0.5 - py) * 7}deg`);
  });
  el.addEventListener('pointerleave', () => {
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  });
}

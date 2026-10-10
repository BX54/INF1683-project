/**
 * L'accord parfait — sélecteur de boisson, verre qui se remplit, 3 plats recommandés.
 * Les données viennent de src/data/accords.json (et des plats de menu.json).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { accords, getPlat, escapeHtml } from './data.js';
import { reduced } from './motion.js';
import { trackGlow } from './cursor.js';
import { scrollToEl } from './smooth.js';

const SVGNS = 'http://www.w3.org/2000/svg';

// Silhouettes de verres (viewBox 0 0 200 320)
const GLASSES = {
  ballon: {
    body: 'M52 22 C44 92 50 150 100 172 C150 150 156 92 148 22 Z',
    stem: 'M100 172 L100 284 M56 290 C72 283 128 283 144 290',
    highlight: 'M64 48 C60 88 64 122 80 146',
    full: 96,
    empty: 182,
    bottom: 166,
    spread: 30,
  },
  flute: {
    body: 'M80 14 C76 90 80 168 100 196 C120 168 124 90 120 14 Z',
    stem: 'M100 196 L100 286 M64 292 C78 285 122 285 136 292',
    highlight: 'M87 34 C85 90 87 140 94 170',
    full: 40,
    empty: 204,
    bottom: 190,
    spread: 9,
  },
  biere: {
    body: 'M62 20 C55 62 58 98 70 132 C76 160 70 222 72 290 C72 295 76 298 82 298 L118 298 C124 298 128 295 128 290 C130 222 124 160 130 132 C142 98 145 62 138 20 Z',
    stem: 'M80 304 L120 304 M100 304 L100 304',
    highlight: 'M71 44 C67 76 70 104 79 128',
    full: 54,
    empty: 304,
    bottom: 290,
    spread: 24,
  },
  tumbler: {
    body: 'M50 82 L62 290 C62 295 66 298 72 298 L128 298 C134 298 138 295 138 290 L150 82 Z',
    stem: 'M70 304 L130 304 M100 304 L100 304',
    highlight: 'M63 108 L72 272',
    full: 118,
    empty: 306,
    bottom: 292,
    spread: 34,
  },
};

export function initAccord() {
  const section = document.querySelector('.accord');
  if (!section) return;

  const svg = section.querySelector('.glass__svg');
  const outline = svg.querySelector('.glass__outline');
  const clip = svg.querySelector('.glass__clip');
  const highlight = svg.querySelector('.glass__highlight');
  const stem = svg.querySelector('.glass__stem');
  const wave = svg.querySelector('.glass__wave');
  const foam = svg.querySelector('.glass__foam');
  const ice = svg.querySelector('.glass__ice');
  const bubblesG = svg.querySelector('.glass__bubbles');
  const stopA = svg.querySelector('.liquid-stop-a');
  const stopB = svg.querySelector('.liquid-stop-b');
  const captionDrink = section.querySelector('.glass__caption-drink');
  const captionHint = section.querySelector('.glass__caption-hint');

  const drinksEl = section.querySelector('.selector__drinks');
  const profileGroup = section.querySelector('.selector__group--profile');
  const profileLegend = section.querySelector('.selector__legend--profile');
  const profilesEl = section.querySelector('.selector__profiles');
  const introEl = section.querySelector('.selector__intro');
  const grid = section.querySelector('.pairings__grid');
  const empty = section.querySelector('.pairings__empty');

  // Filet versé dans le verre
  const pour = document.createElementNS(SVGNS, 'line');
  pour.setAttribute('class', 'glass__pour');
  pour.setAttribute('x1', 100);
  pour.setAttribute('x2', 100);
  pour.setAttribute('y1', -80);
  pour.setAttribute('y2', -80);
  pour.setAttribute('stroke-width', 3);
  pour.setAttribute('stroke-linecap', 'round');
  pour.setAttribute('opacity', 0);
  svg.insertBefore(pour, outline);

  // Glaçons
  const [ice1, ice2] = ice.querySelectorAll('rect');
  ice1.setAttribute('x', 74); ice1.setAttribute('y', -6); ice1.setAttribute('transform', 'rotate(14 89 9)');
  ice2.setAttribute('x', 106); ice2.setAttribute('y', 0); ice2.setAttribute('width', 26); ice2.setAttribute('height', 26);
  ice2.setAttribute('transform', 'rotate(-10 119 13)');

  foam.setAttribute('opacity', 0.95);
  foam.setAttribute('rx', 6);

  // État du liquide
  let shapeKey = 'ballon';
  const liquid = { level: GLASSES.ballon.empty, amp: 0, phase: 0, foam: 0 };
  const colors = { a: '#A3243B', b: '#5E0B1A' };
  const current = { drink: null, profile: null };

  const setShape = (key) => {
    const g = GLASSES[key];
    outline.setAttribute('d', g.body);
    clip.setAttribute('d', g.body);
    highlight.setAttribute('d', g.highlight);
    stem.setAttribute('d', g.stem);
  };
  setShape(shapeKey);

  const draw = () => {
    const { level, amp, phase } = liquid;
    let d = `M-10 ${level.toFixed(2)}`;
    for (let x = -10; x <= 210; x += 10) {
      const y = level + Math.sin(x * 0.045 + phase) * amp + Math.sin(x * 0.09 - phase * 1.3) * amp * 0.4;
      d += ` L${x} ${y.toFixed(2)}`;
    }
    d += ' L210 330 L-10 330 Z';
    wave.setAttribute('d', d);
    foam.setAttribute('y', level - 16 * liquid.foam);
    foam.setAttribute('height', 20 * liquid.foam);
    ice.setAttribute('transform', `translate(0 ${level - 8 + Math.sin(phase * 0.8) * 1.5})`);
    pour.setAttribute('y2', level);
  };
  draw();

  // Ondulation continue tant que la section est visible
  const animateWave = () => {
    liquid.phase += 0.035;
    draw();
  };
  if (!reduced) {
    ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: ({ isActive }) => (isActive ? gsap.ticker.add(animateWave) : gsap.ticker.remove(animateWave)),
    });
  }

  const setColors = (a, b, duration = 0.8) => {
    const from = { ...colors };
    const lerpA = gsap.utils.interpolate(from.a, a);
    const lerpB = gsap.utils.interpolate(from.b, b);
    const p = { t: 0 };
    return gsap.to(p, {
      t: 1,
      duration: reduced ? 0 : duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        colors.a = lerpA(p.t);
        colors.b = lerpB(p.t);
        stopA.setAttribute('stop-color', colors.a);
        stopB.setAttribute('stop-color', colors.b);
        pour.setAttribute('stroke', colors.a);
      },
    });
  };

  // Bulles montantes
  let bubbleTweens = [];
  const clearBubbles = () => {
    bubbleTweens.forEach((t) => t.kill());
    bubbleTweens = [];
    bubblesG.replaceChildren();
  };
  const startBubbles = () => {
    clearBubbles();
    if (reduced) return;
    const g = GLASSES[shapeKey];
    const n = shapeKey === 'flute' ? 16 : 22;
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS(SVGNS, 'circle');
      const x = 100 + gsap.utils.random(-g.spread, g.spread);
      c.setAttribute('cx', x);
      c.setAttribute('cy', g.bottom);
      c.setAttribute('r', gsap.utils.random(1, 2.6));
      bubblesG.append(c);
      const tw = gsap.fromTo(
        c,
        { attr: { cy: g.bottom - gsap.utils.random(0, 8) }, opacity: 0 },
        {
          attr: { cy: g.full + 4, cx: x + gsap.utils.random(-4, 4) },
          opacity: 1,
          duration: gsap.utils.random(1.6, 3.6),
          ease: 'power1.in',
          repeat: -1,
          delay: gsap.utils.random(0, 3),
        }
      );
      bubbleTweens.push(tw);
    }
  };

  let tl;
  const fill = (drink, profile) => {
    const nextShape = drink.verre in GLASSES ? drink.verre : 'ballon';
    const a = profile?.reflet ?? drink.reflet;
    const b = profile?.couleur ?? drink.couleur;
    const sameDrink = current.drink === drink.id;
    const g = GLASSES[nextShape];

    section.style.setProperty('--drink', b);
    section.style.setProperty('--drink-light', a);
    section.classList.add('has-drink');

    tl?.kill();

    if (reduced) {
      shapeKey = nextShape;
      setShape(nextShape);
      setColors(a, b);
      liquid.level = g.full;
      liquid.foam = drink.mousse ? 1 : 0;
      gsap.set(ice, { opacity: nextShape === 'tumbler' ? 1 : 0 });
      draw();
      return;
    }

    tl = gsap.timeline({ onUpdate: draw });

    if (sameDrink) {
      // Changement de profil : la couleur vire et le vin ondule
      tl.add(setColors(a, b, 1.1), 0).fromTo(liquid, { amp: 6 }, { amp: 1.4, duration: 1.6, ease: 'elastic.out(1, 0.4)' }, 0);
      return;
    }

    const wasFilled = liquid.level < GLASSES[shapeKey].empty - 2;
    if (wasFilled) {
      tl.add(clearBubbles)
        .to(liquid, { level: GLASSES[shapeKey].empty, amp: 3, foam: 0, duration: 0.6, ease: 'power2.in' })
        .to(ice, { opacity: 0, duration: 0.3 }, '<');
    }

    if (nextShape !== shapeKey) {
      const label = 'morph';
      tl.addLabel(label)
        .to(outline, { morphSVG: g.body, duration: 0.8, ease: 'expo.inOut' }, label)
        .to(clip, { morphSVG: g.body, duration: 0.8, ease: 'expo.inOut' }, label)
        .to(highlight, { morphSVG: g.highlight, duration: 0.8, ease: 'expo.inOut' }, label)
        .to(stem, { morphSVG: g.stem, duration: 0.8, ease: 'expo.inOut' }, label)
        .add(() => (shapeKey = nextShape));
    }

    tl.add(() => {
      shapeKey = nextShape;
      liquid.level = g.empty;
    })
      .add(setColors(a, b, 0.4))
      .set(pour, { attr: { opacity: 1, y1: -80 } })
      .fromTo(pour, { attr: { 'stroke-width': 0.5 } }, { attr: { 'stroke-width': 3 }, duration: 0.25 })
      .fromTo(
        liquid,
        { amp: 5 },
        { level: g.full, amp: 1.4, duration: 1.8, ease: 'power2.out' },
        '<'
      )
      .to(liquid, { foam: drink.mousse ? 1 : 0, duration: 0.8, ease: 'power2.out' }, '-=0.9')
      .to(pour, { attr: { y1: g.full - 2, opacity: 0 }, duration: 0.5, ease: 'power2.in' }, '-=1.1')
      .to(ice, { opacity: nextShape === 'tumbler' ? 1 : 0, duration: 0.6 }, '-=0.8')
      .add(() => (drink.bulles ? startBubbles() : clearBubbles()), '-=0.6');
  };

  // Rendu des cartes de plats
  const renderPairings = (list, drinkName) => {
    const cards = list
      .map(({ id, pourquoi }, i) => {
        const plat = getPlat(id);
        if (!plat) return '';
        return `
        <article class="pair">
          <div class="pair__media">
            <img src="${plat.image}" alt="${escapeHtml(plat.nom)}" width="1200" height="1200" loading="lazy" decoding="async" />
            <span class="pair__index">0${i + 1}</span>
            <span class="pair__cat">${escapeHtml(plat.categorie)}</span>
          </div>
          <div class="pair__body">
            <h3 class="pair__name">${escapeHtml(plat.nom)}</h3>
            <p class="pair__desc">${escapeHtml(plat.description)}</p>
            <p class="pair__why"><strong>Pourquoi ça marche</strong>${escapeHtml(pourquoi)}</p>
          </div>
        </article>`;
      })
      .join('');

    const show = () => {
      empty.hidden = true;
      grid.innerHTML =
        cards +
        `<div class="pairings__cta"><button type="button" class="btn btn--link" data-reserve-drink>
          <span class="btn__label">Réserver avec ${escapeHtml(drinkName)}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button></div>`;
      const els = grid.querySelectorAll('.pair');
      els.forEach(trackGlow);
      if (!reduced) {
        gsap.fromTo(
          els,
          { clipPath: 'inset(100% 0% 0% 0%)', y: 60 },
          { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12, clearProps: 'clipPath' }
        );
        gsap.from(grid.querySelectorAll('.pair__media img'), { scale: 1.3, duration: 1.6, ease: 'expo.out', stagger: 0.12 });
      }
    };

    const old = grid.querySelectorAll('.pair, .pairings__cta');
    if (old.length && !reduced) {
      gsap.to(old, { y: -24, opacity: 0, duration: 0.35, stagger: 0.05, ease: 'power2.in', onComplete: show });
    } else {
      show();
    }
  };

  const clearPairings = (message) => {
    const old = grid.querySelectorAll('.pair, .pairings__cta');
    const finish = () => {
      grid.innerHTML = '';
      empty.hidden = false;
      empty.textContent = message;
    };
    if (old.length && !reduced) gsap.to(old, { opacity: 0, y: -20, duration: 0.3, onComplete: finish });
    else finish();
  };

  // Choix
  const select = (drinkId, profileId = null) => {
    const drink = accords.boissons.find((d) => d.id === drinkId);
    if (!drink) return;
    const profile = drink.profils?.find((p) => p.id === profileId) ?? null;

    setChecked(drinksEl, drinkId);
    fill(drink, profile);
    current.drink = drink.id;
    current.profile = profile?.id ?? null;

    captionDrink.textContent = profile ? `${drink.nom} ${profile.nom.toLowerCase()}` : drink.nom;
    captionHint.textContent = profile ? profile.exemples : drink.profils ? drink.question : 'Bien choisi';
    if (!reduced) gsap.fromTo([captionDrink, captionHint], { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'expo.out' });

    introEl.textContent = drink.intro;
    if (!reduced) gsap.fromTo(introEl, { opacity: 0 }, { opacity: 1, duration: 1 });

    if (drink.profils) {
      const wasHidden = profileGroup.hidden;
      profileGroup.hidden = false;
      profileLegend.textContent = drink.question ?? 'Profil';
      if (wasHidden || !profilesEl.children.length) {
        profilesEl.innerHTML = drink.profils
          .map(
            (p) => `<button type="button" class="chip chip--profile" role="radio" aria-checked="false" data-value="${p.id}">
              <strong>${escapeHtml(p.nom)}</strong><small>${escapeHtml(p.exemples)}</small></button>`
          )
          .join('');
        profilesEl.querySelectorAll('.chip').forEach(trackGlow);
        if (!reduced) gsap.from(profilesEl.children, { y: 20, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'expo.out' });
      }
      setChecked(profilesEl, profile?.id ?? null);
      if (profile) renderPairings(profile.plats, `un rouge ${profile.nom.toLowerCase()}`);
      else clearPairings('Léger, fruité ou corsé ? Précisez votre rouge pour découvrir vos trois accords.');
    } else {
      profileGroup.hidden = true;
      profilesEl.innerHTML = '';
      renderPairings(drink.plats, drink.id === 'sansalcool' ? 'une boisson sans alcool' : `${drink.nom.toLowerCase()}`);
    }
  };

  drinksEl.innerHTML = accords.boissons
    .map(
      (d) => `<button type="button" class="chip" role="radio" aria-checked="false" data-value="${d.id}" style="--c:${d.reflet}">
        <span class="chip__dot" aria-hidden="true"></span>${escapeHtml(d.nom)}</button>`
    )
    .join('');
  drinksEl.querySelectorAll('.chip').forEach(trackGlow);
  setChecked(drinksEl, null);

  radioGroup(drinksEl, (v) => select(v));
  radioGroup(profilesEl, (v) => select(current.drink, v));

  // « Réserver avec cette boisson »
  grid.addEventListener('click', (e) => {
    if (!e.target.closest('[data-reserve-drink]')) return;
    document.dispatchEvent(new CustomEvent('academie:boisson', { detail: { id: current.drink } }));
    scrollToEl(document.querySelector('#reservation'));
  });
}

/** Groupe de boutons radio accessible (clic + flèches du clavier). */
export function radioGroup(container, onSelect) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[role="radio"]');
    if (!btn || btn.disabled) return;
    onSelect(btn.dataset.value, btn);
  });
  container.addEventListener('keydown', (e) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    if (!keys.includes(e.key)) return;
    const items = [...container.querySelectorAll('[role="radio"]:not(:disabled)')];
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const next = items[(i + dir + items.length) % items.length];
    next.focus();
    onSelect(next.dataset.value, next);
  });
}

export function setChecked(container, value) {
  const items = container.querySelectorAll('[role="radio"]');
  items.forEach((el) => {
    const on = el.dataset.value === value;
    el.setAttribute('aria-checked', on ? 'true' : 'false');
    el.tabIndex = on || (!value && el === items[0]) ? 0 : -1;
  });
}

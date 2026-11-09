import { gsap } from 'gsap';
import { equipe, escapeHtml } from './data.js';
import { reduced } from './motion.js';

export function initTeam() {
  const grid = document.querySelector('.team__grid');
  if (!grid) return;

  // Section masquée (src/data/equipe.json → "afficher": false) : on retire aussi les liens vers elle
  if (equipe.afficher === false) {
    document.querySelector('#equipe')?.setAttribute('hidden', '');
    document.querySelectorAll('a[href="#equipe"]').forEach((a) => (a.closest('li') ?? a).setAttribute('hidden', ''));
    return;
  }

  // Photo de groupe (equipe.json → photoEquipe), affichée en grand au-dessus des éventuels portraits
  const groupe = equipe.photoEquipe?.image
    ? `<figure class="team__photo">
        <img src="${equipe.photoEquipe.image}" srcset="${equipe.photoEquipe.image.replace(/\.webp$/, '-900.webp')} 900w, ${
          equipe.photoEquipe.image
        } 1600w" sizes="(max-width: 900px) 100vw, 90vw" alt="${escapeHtml(equipe.photoEquipe.legende || "L'équipe")}"
          width="1600" height="1066" loading="lazy" decoding="async" />
        ${equipe.photoEquipe.legende ? `<figcaption>${escapeHtml(equipe.photoEquipe.legende)}</figcaption>` : ''}
      </figure>`
    : '';

  // Le membre « vedette » (le chef) passe en premier
  const membres = [...equipe.membres].sort((a, b) => (b.vedette ? 1 : 0) - (a.vedette ? 1 : 0));

  grid.innerHTML = groupe + membres
    .map(
      (m) => `
      <article class="member${m.vedette ? ' member--vedette' : ''}" tabindex="0">
        <div class="member__frame">
          <img src="${m.image}" alt="Portrait — ${escapeHtml(m.nom)}, ${escapeHtml(m.role)}" width="800" height="1000" loading="lazy" decoding="async" />
          ${m.citation ? `<p class="member__quote">« ${escapeHtml(m.citation)} »</p>` : ''}
        </div>
        <div class="member__info">
          <p class="member__role">${escapeHtml(m.role)}</p>
          <h3 class="member__name">${escapeHtml(m.nom)}</h3>
        </div>
      </article>`
    )
    .join('');

  if (reduced) return;

  const photo = grid.querySelector('.team__photo');
  if (photo) {
    gsap.fromTo(
      photo,
      { clipPath: 'inset(0% 0% 100% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: photo, start: 'top 85%', once: true } }
    );
  }

  const members = grid.querySelectorAll('.member');
  members.forEach((m, i) => {
    const frame = m.querySelector('.member__frame');
    const img = m.querySelector('img');
    const info = m.querySelector('.member__info');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: m, start: 'top 85%', once: true },
      delay: (i % 3) * 0.12,
    });
    tl.fromTo(
      frame,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' }
    )
      .from(img, { scale: 1.4, duration: 2, ease: 'expo.out', clearProps: 'transform' }, 0.2)
      .from(info.children, { y: 24, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out' }, 0.8);
  });

  // Léger décalage vertical au défilement pour la profondeur
  gsap.utils.toArray('.member:not(.member--vedette) .member__frame').forEach((f, i) => {
    gsap.to(f, {
      y: i % 2 ? -40 : -20,
      ease: 'none',
      scrollTrigger: { trigger: grid, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

}

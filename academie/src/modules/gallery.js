import { gsap } from 'gsap';
import { galerie, escapeHtml } from './data.js';
import { platSrcset } from './img.js';

/** Galerie : défilement horizontal piloté par le scroll (ordinateur), glisser natif (mobile). */
export function initGallery() {
  const section = document.querySelector('.gallery');
  if (!section) return;
  const pin = section.querySelector('.gallery__pin');
  const track = section.querySelector('.gallery__track');
  const back = section.querySelector('.gallery__backword');
  const bar = section.querySelector('.gallery__progress i');
  const intro = section.querySelector('.gallery__intro');
  const total = String(galerie.photos.length).padStart(2, '0');

  track.innerHTML = galerie.photos
    .map(
      (p, i) => `
      <figure class="shot shot--${p.format || 'portrait'}">
        <div class="shot__frame">
          <img src="${p.image}"${platSrcset(p.image, '(max-width: 900px) 75vw, 40vw')} alt="${escapeHtml(p.legende)}" width="1200" height="1200" loading="lazy" decoding="async" />
        </div>
        <figcaption>${escapeHtml(p.legende)}<span>${String(i + 1).padStart(2, '0')} / ${total}</span></figcaption>
      </figure>`
    )
    .join('');

  const shots = [...track.querySelectorAll('.shot')];
  const mm = gsap.matchMedia();

  mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
    section.classList.remove('is-native');
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

    const scroll = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        pin: true,
        start: 'top top',
        end: () => `+=${distance()}`,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          gsap.set(bar, { scaleX: self.progress });
          gsap.set(intro, { opacity: 1 - gsap.utils.clamp(0, 1, self.progress * 6), y: -self.progress * 120 });
        },
      },
    });

    gsap.to(back, {
      x: () => -distance() * 0.3,
      ease: 'none',
      scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${distance()}`, scrub: 1.5, invalidateOnRefresh: true },
    });

    shots.forEach((shot) => {
      const img = shot.querySelector('img');
      gsap.fromTo(
        img,
        { xPercent: -8 },
        {
          xPercent: 8,
          ease: 'none',
          scrollTrigger: { trigger: shot, containerAnimation: scroll, start: 'left right', end: 'right left', scrub: true },
        }
      );
      gsap.fromTo(
        shot.querySelector('.shot__frame'),
        { clipPath: 'inset(12% 12% 12% 12%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          ease: 'none',
          scrollTrigger: { trigger: shot, containerAnimation: scroll, start: 'left 100%', end: 'left 55%', scrub: true },
        }
      );
    });
  });

  mm.add('(max-width: 900px), (prefers-reduced-motion: reduce)', () => {
    section.classList.add('is-native');
    gsap.set(intro, { clearProps: 'opacity,transform' });
    return () => section.classList.remove('is-native');
  });
}

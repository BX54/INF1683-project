import '@fontsource/playfair-display/latin-400.css';
import '@fontsource/playfair-display/latin-500.css';
import '@fontsource/playfair-display/latin-400-italic.css';
import '@fontsource/manrope/latin-300.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import 'lenis/dist/lenis.css';
import './styles/main.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

import { reduced } from './modules/motion.js';
import { initSmoothScroll } from './modules/smooth.js';
import { playIntro } from './modules/intro.js';
import { initCursor, initMagnetic } from './modules/cursor.js';
import { initHeader } from './modules/header.js';
import { initReveals, revealHero } from './modules/reveals.js';
import { initAccord } from './modules/accord.js';
import { initMenu } from './modules/menu.js';
import { initGallery } from './modules/gallery.js';
import { initTeam } from './modules/team.js';
import { initReservation } from './modules/reservation.js';
import { initInfos } from './modules/infos.js';
import { initServices } from './modules/services.js';
import { initHeroSlides, startHeroSlides, initStory, initSignatures } from './modules/accueil.js';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MorphSVGPlugin);

const lenis = initSmoothScroll();

// Contenu piloté par les fichiers JSON / config
initInfos();
initHeroSlides();
initStory();
initSignatures();
initMenu();
initAccord();
initGallery();
initTeam();
initReservation({ lenis });
initServices();

// Interactions globales
initHeader({ lenis });
initCursor();
initMagnetic();
initReveals();

// Particules dorées (Three.js chargé à la demande pour alléger le premier rendu)
const canvas = document.querySelector('.hero__canvas');
const particlesReady = import('./modules/particles.js')
  .then(({ initParticles }) => initParticles(canvas))
  .catch((err) => console.warn('Particules désactivées :', err));

lenis?.stop();
playIntro().then(() => {
  document.body.classList.remove('is-loading');
  lenis?.start();
  revealHero();
  startHeroSlides();
  particlesReady.then((p) => p?.reveal());
  ScrollTrigger.refresh();
});

if (reduced) document.documentElement.classList.add('reduced');

/**
 * « Nos services » : salle de réception, service traiteur et demande de soumission.
 * Textes dans src/data/services.json ; envoi via src/modules/envoi.js.
 */
import { gsap } from 'gsap';
import { RESERVATION } from '../config.js';
import { services, escapeHtml } from './data.js';
import { reduced } from './motion.js';
import { radioGroup, setChecked } from './accord.js';
import { trackGlow } from './cursor.js';
import { sendForm } from './envoi.js';

const DATE_LONGUE = new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function initServices() {
  const root = document.querySelector('.services');
  if (!root) return;

  // ---------- Textes ----------
  root.querySelectorAll('[data-sv]').forEach((el) => (el.textContent = services[el.dataset.sv] ?? ''));
  root.querySelector('[data-sv-title]').innerHTML = `${escapeHtml(services.titre)} <em class="gold-text">${escapeHtml(
    services.titreAccent
  )}</em>`;

  // ---------- Cartes de services ----------
  const grid = root.querySelector('.services__grid');
  grid.innerHTML = services.services
    .map(
      (s, i) => `
      <article class="svc svc--${escapeHtml(s.id)}">
        <div class="svc__media">
          <img src="${s.image}" alt="${escapeHtml(s.titre)}" width="1400" height="1000" loading="lazy" decoding="async" />
          <p class="svc__figure"><span class="svc__num">${escapeHtml(s.chiffre)}</span><span class="svc__unit">${escapeHtml(
            s.chiffreLabel
          )}</span></p>
        </div>
        <div class="svc__body">
          <p class="svc__index">0${i + 1}</p>
          <h3 class="svc__title">${escapeHtml(s.titre)}</h3>
          <p class="svc__text">${escapeHtml(s.texte)}</p>
          <ul class="svc__points">${s.points.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
          <a href="#soumission" class="link-arrow" data-quote-type="${s.id === 'salle' ? 'Salle de réception' : 'Service traiteur'}" data-cursor>
            Demander une soumission
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
        </div>
      </article>`
    )
    .join('');
  grid.querySelectorAll('.svc').forEach(trackGlow);

  // ---------- Formulaire ----------
  const form = root.querySelector('.qform');
  const done = root.querySelector('.quote__done');
  const types = form.querySelector('.qform__types');
  const occasion = form.elements.occasion;
  const options = (list) => list.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
  occasion.innerHTML = options(services.occasions);
  form.elements.salle.innerHTML = options(services.salles ?? []);
  form.elements.mode.innerHTML = options(services.modesTraiteur ?? []);
  /*
   * Listes déroulantes remplacées par des pastilles (même style que « Type de service »).
   * La liste <select> reste cachée dans le formulaire : c'est elle qui garde la valeur envoyée.
   */
  const chipify = (select) => {
    const field = select.closest('.field');
    const label = field.querySelector('label');
    const group = document.createElement('div');
    group.className = 'qform__chips';
    group.setAttribute('role', 'radiogroup');
    const labelId = `${select.id}-label`;
    const title = document.createElement('p');
    title.className = 'rform__label';
    title.id = labelId;
    title.textContent = label.textContent;
    label.replaceWith(title);
    group.setAttribute('aria-labelledby', labelId);
    group.innerHTML = [...select.options]
      .map(
        (o) =>
          `<button type="button" class="chip chip--sm" role="radio" aria-checked="false" data-value="${escapeHtml(o.value)}">${escapeHtml(
            o.textContent
          )}</button>`
      )
      .join('');
    select.hidden = true;
    select.tabIndex = -1;
    field.classList.add('field--chips');
    field.appendChild(group);
    const pick = (v) => {
      select.value = v;
      setChecked(group, v);
    };
    radioGroup(group, pick);
    group.querySelectorAll('.chip').forEach(trackGlow);
    pick(select.options[0]?.value ?? '');
    return pick;
  };
  const pickers = [occasion, form.elements.salle, form.elements.mode].map(chipify);

  const blocSalle = form.querySelector('[data-for="salle"]');
  const blocTraiteur = form.querySelector('[data-for="traiteur"]');

  // Date : à partir de demain
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  form.elements.date.min = iso(tomorrow);

  let type = 'Salle de réception';
  const setType = (v) => {
    type = v;
    setChecked(types, v);
    // Champs utiles seulement selon le service choisi
    blocSalle.hidden = v === 'Service traiteur';
    blocTraiteur.hidden = v === 'Salle de réception';
  };
  radioGroup(types, setType);
  setType(type);
  types.querySelectorAll('.chip').forEach(trackGlow);

  // Liens « Demander une soumission » des cartes : présélectionnent le service
  grid.addEventListener('click', (e) => {
    const a = e.target.closest('[data-quote-type]');
    if (a) setType(a.dataset.quoteType);
  });

  // Format du téléphone
  const tel = form.elements.telephone;
  tel.addEventListener('input', () => {
    const d = tel.value.replace(/\D/g, '').replace(/^1(?=\d{10})/, '').slice(0, 10);
    tel.value = d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d;
  });

  const rules = {
    nom: (v) => (v.trim().length >= 2 ? '' : 'Indiquez votre nom.'),
    telephone: (v) => (v.replace(/\D/g, '').length === 10 ? '' : 'Entrez un numéro à 10 chiffres.'),
    courriel: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Entrez une adresse courriel valide.'),
    date: (v) => (v && v >= form.elements.date.min ? '' : 'Choisissez une date à venir.'),
    invites: (v) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) return "Indiquez le nombre d'invités.";
      return '';
    },
  };
  const validate = (name) => {
    const input = form.elements[name];
    const msg = rules[name](input.value);
    const err = form.querySelector(`#q-${name}-err`);
    if (err) err.textContent = msg;
    input.closest('.field')?.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) input.setAttribute('aria-describedby', err.id);
    return !msg;
  };
  Object.keys(rules).forEach((name) => {
    const input = form.elements[name];
    input.addEventListener('blur', () => input.value && validate(name));
    input.addEventListener('input', () => input.closest('.field')?.classList.contains('is-invalid') && validate(name));
  });

  const submit = form.querySelector('[type="submit"]');
  const status = form.querySelector('.rform__status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.elements._gotcha?.value) {
      form.reset();
      return;
    }
    const invalid = Object.keys(rules).filter((n) => !validate(n));
    if (invalid.length) {
      form.elements[invalid[0]].focus();
      status.textContent = 'Quelques détails à compléter.';
      status.classList.add('is-error');
      return;
    }

    const [y, m, d] = form.elements.date.value.split('-').map(Number);
    const dateLisible = DATE_LONGUE.format(new Date(y, m - 1, d));
    const data = {
      type_demande: `Soumission — ${type}`,
      nom: form.elements.nom.value.trim(),
      telephone: form.elements.telephone.value.trim(),
      courriel: form.elements.courriel.value.trim(),
      occasion: occasion.value,
      date: form.elements.date.value,
      date_lisible: dateLisible,
      invites: Number(form.elements.invites.value),
      salle: blocSalle.hidden ? '—' : form.elements.salle.value,
      traiteur: blocTraiteur.hidden ? '—' : form.elements.mode.value,
      message: form.elements.message.value.trim() || '—',
      _subject: `SOUMISSION ${type} — ${occasion.value} — ${form.elements.nom.value.trim()} — ${dateLisible} (${form.elements.invites.value} pers.)`,
    };

    submit.classList.add('is-loading');
    submit.disabled = true;
    status.classList.remove('is-error');
    status.textContent = 'Envoi en cours…';
    try {
      await sendForm(data, { formspreeId: RESERVATION.soumissionFormspreeId });
      status.textContent = '';
      showDone(data);
      form.reset();
      [occasion, form.elements.salle, form.elements.mode].forEach((sel, i) => pickers[i](sel.options[0]?.value ?? ''));
      setType('Salle de réception');
    } catch (err) {
      console.error(err);
      status.classList.add('is-error');
      status.textContent = "Oups, l'envoi n'a pas fonctionné. Réessayez ou appelez-nous.";
    } finally {
      submit.classList.remove('is-loading');
      submit.disabled = false;
    }
  });

  const showDone = (data) => {
    done.querySelector('.quote__done-title').textContent = `Merci, ${data.nom.split(' ')[0]} !`;
    done.querySelector('.quote__done-text').textContent =
      `Votre demande (${data.type_demande.replace('Soumission — ', '').toLowerCase()}, ${data.occasion.toLowerCase()}, ` +
      `${data.invites} invités, ${data.date_lisible}) est bien reçue. Nous vous répondrons ${services.delaiReponse ?? 'sous peu'} ` +
      'par courriel ou par téléphone.';
    form.hidden = true;
    done.hidden = false;
    done.focus({ preventScroll: true });
    if (reduced) return;
    gsap.fromTo(done, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' });
    gsap.fromTo(done.querySelectorAll('.confirm__ring'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut', stagger: 0.15 });
    gsap.fromTo(done.querySelector('.confirm__check'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, delay: 0.9, ease: 'power3.out' });
  };

  done.querySelector('.quote__again').addEventListener('click', () => {
    done.hidden = true;
    form.hidden = false;
    form.elements.nom.focus();
  });

  // ---------- Animations d'entrée ----------
  if (reduced) return;
  root.querySelectorAll('.svc').forEach((card, i) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 80%', once: true }, delay: i * 0.12 });
    tl.fromTo(card.querySelector('.svc__media'), { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' })
      .from(card.querySelector('.svc__media img'), { scale: 1.3, duration: 1.8, ease: 'expo.out' }, 0.2)
      .add(() => countUp(card.querySelector('.svc__num')), 0.5)
      .from(card.querySelectorAll('.svc__body > *'), { y: 24, opacity: 0, duration: 1, stagger: 0.06, ease: 'expo.out' }, 0.6);
  });
  // Compteur animé (« 200 », « 100 % ») ; un chiffre non numérique reste tel quel
  function countUp(el) {
    const m = el.textContent.match(/^(\d+)(.*)$/);
    if (!m) return;
    const target = Number(m[1]);
    const o = { v: 0 };
    gsap.to(o, { v: target, duration: 1.6, ease: 'power2.out', onUpdate: () => (el.textContent = `${Math.round(o.v)}${m[2]}`) });
  }

  gsap.from(root.querySelector('.quote'), {
    y: 60,
    opacity: 0,
    duration: 1.3,
    ease: 'expo.out',
    scrollTrigger: { trigger: root.querySelector('.quote'), start: 'top 85%', once: true },
  });
}

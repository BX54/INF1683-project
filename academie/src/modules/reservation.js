/**
 * Réservation : calendrier, créneaux, couverts, boisson, validation et envoi
 * (Formspree, EmailJS ou mode démo — voir src/config.js).
 */
import { gsap } from 'gsap';
import { RESERVATION, RESTAURANT } from '../config.js';
import { accords, getPlat, suggestions, escapeHtml } from './data.js';
import { reduced } from './motion.js';
import { radioGroup, setChecked } from './accord.js';
import { trackGlow } from './cursor.js';

const MOIS = new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' });
const DATE_LONGUE = new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
const DATE_COURTE = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short' });

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const formatHeure = (h) => h.replace(':', ' h ');

export function initReservation({ lenis }) {
  const form = document.querySelector('.rform');
  if (!form) return;

  const state = { date: null, heure: null, personnes: 2, boisson: null };
  const today = startOfDay(new Date());
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + (RESERVATION.joursOuverts ?? 60));
  let view = new Date(today.getFullYear(), today.getMonth(), 1);

  // ---------- Billet (résumé en direct) ----------
  const ticket = (key, value) => {
    const el = document.querySelector(`[data-t="${key}"]`);
    if (!el || el.textContent === value) return;
    el.textContent = value;
    el.classList.remove('is-updated');
    void el.offsetWidth;
    el.classList.add('is-updated');
  };
  const ticketNo = document.querySelector('[data-ticket-no]');
  if (ticketNo) ticketNo.textContent = String(Math.floor(1000 + Math.random() * 9000));

  // ---------- Calendrier ----------
  const calGrid = form.querySelector('.calendar__grid');
  const calMonth = form.querySelector('.calendar__month');
  const prevBtn = form.querySelector('[data-cal="prev"]');
  const nextBtn = form.querySelector('[data-cal="next"]');
  const closed = new Set(RESERVATION.joursFermes ?? []);

  const renderCalendar = (dir = 0) => {
    calMonth.textContent = MOIS.format(view);
    const first = new Date(view);
    const offset = (first.getDay() + 6) % 7; // lundi = 0
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    let html = '';
    for (let i = 0; i < offset; i++) html += '<span aria-hidden="true"></span>';
    for (let d = 1; d <= days; d++) {
      const date = new Date(view.getFullYear(), view.getMonth(), d);
      const disabled = date < today || date > maxDate || closed.has(date.getDay());
      const key = iso(date);
      html += `<button type="button" class="day${+date === +today ? ' is-today' : ''}" data-date="${key}"
        aria-pressed="${state.date === key}" ${disabled ? 'disabled' : ''}
        aria-label="${DATE_LONGUE.format(date)}${disabled ? ' (indisponible)' : ''}">${d}</button>`;
    }
    calGrid.innerHTML = html;
    prevBtn.disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    nextBtn.disabled = new Date(view.getFullYear(), view.getMonth() + 1, 1) > maxDate;
    if (dir && !reduced) {
      gsap.fromTo(calGrid.children, { x: 24 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, stagger: 0.008, ease: 'expo.out' });
      gsap.fromTo(calMonth, { y: 10 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 });
    }
  };
  prevBtn.addEventListener('click', () => {
    view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
    renderCalendar(-1);
  });
  nextBtn.addEventListener('click', () => {
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    renderCalendar(1);
  });
  calGrid.addEventListener('click', (e) => {
    const b = e.target.closest('.day');
    if (!b || b.disabled) return;
    state.date = b.dataset.date;
    form.elements.date.value = state.date;
    calGrid.querySelectorAll('.day').forEach((d) => d.setAttribute('aria-pressed', d === b));
    if (!reduced) gsap.fromTo(b, { scale: 0.7 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
    const [y, m, d] = state.date.split('-').map(Number);
    ticket('date', DATE_COURTE.format(new Date(y, m - 1, d)));
    clearError('date');
    renderSlots();
  });
  renderCalendar();

  // ---------- Créneaux ----------
  const slots = form.querySelector('.slots');
  const renderSlots = () => {
    const now = new Date();
    const isToday = state.date === iso(today);
    slots.innerHTML = RESERVATION.creneaux
      .map((h) => {
        const [hh, mm] = h.split(':').map(Number);
        const past = isToday && hh * 60 + mm < now.getHours() * 60 + now.getMinutes() + 60;
        if (past && state.heure === h) state.heure = null;
        return `<button type="button" class="slot" role="radio" data-value="${h}" aria-checked="${state.heure === h}"
          ${past ? 'disabled aria-disabled="true"' : ''}>${formatHeure(h)}</button>`;
      })
      .join('');
    setChecked(slots, state.heure);
    if (!state.heure) {
      form.elements.heure.value = '';
      ticket('heure', '—');
    }
  };
  radioGroup(slots, (h, btn) => {
    state.heure = h;
    form.elements.heure.value = h;
    setChecked(slots, h);
    ticket('heure', formatHeure(h));
    clearError('heure');
    if (!reduced) gsap.fromTo(btn, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  });
  renderSlots();

  // ---------- Couverts ----------
  const out = form.querySelector('.stepper__value');
  const [minus, plus] = form.querySelectorAll('.stepper__btn');
  const setGuests = (n) => {
    state.personnes = Math.max(1, Math.min(RESERVATION.personnesMax ?? 12, n));
    out.textContent = state.personnes;
    form.elements.personnes.value = state.personnes;
    minus.disabled = state.personnes <= 1;
    plus.disabled = state.personnes >= (RESERVATION.personnesMax ?? 12);
    ticket('personnes', String(state.personnes));
  };
  form.querySelector('.stepper').addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    setGuests(state.personnes + Number(b.dataset.step));
    if (!reduced) gsap.fromTo(out, { y: -8 * Number(b.dataset.step), opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
  });
  setGuests(2);

  // ---------- Boisson ----------
  const chips = form.querySelector('.drink-chips');
  chips.innerHTML = accords.boissons
    .map(
      (d) => `<button type="button" class="chip" role="radio" aria-checked="false" data-value="${d.id}" style="--c:${d.reflet}">
        <span class="chip__dot" aria-hidden="true"></span>${escapeHtml(d.court ?? d.nom)}</button>`
    )
    .join('');
  chips.querySelectorAll('.chip').forEach(trackGlow);
  const setDrink = (id) => {
    state.boisson = state.boisson === id ? null : id;
    form.elements.boisson.value = state.boisson ?? '';
    setChecked(chips, state.boisson);
    const d = accords.boissons.find((x) => x.id === state.boisson);
    ticket('boisson', d ? d.court ?? d.nom : '—');
  };
  radioGroup(chips, setDrink);
  setChecked(chips, null);
  document.addEventListener('academie:boisson', (e) => {
    if (e.detail?.id) {
      state.boisson = null;
      setDrink(e.detail.id);
    }
  });

  // ---------- Champs texte ----------
  const tel = form.elements.telephone;
  tel.addEventListener('input', () => {
    const digits = tel.value.replace(/\D/g, '').replace(/^1(?=\d{10})/, '').slice(0, 10);
    let f = digits;
    if (digits.length > 6) f = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    else if (digits.length > 3) f = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    tel.value = f;
  });
  form.elements.nom.addEventListener('input', () => {
    ticket('nom', form.elements.nom.value.trim() || '—');
  });

  // ---------- Validation ----------
  const rules = {
    nom: (v) => (v.trim().length >= 2 ? '' : 'Indiquez votre nom.'),
    telephone: (v) => (v.replace(/\D/g, '').length === 10 ? '' : 'Entrez un numéro à 10 chiffres, ex. (819) 555-1234.'),
    courriel: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Entrez une adresse courriel valide.'),
    date: () => (state.date ? '' : 'Choisissez une date dans le calendrier.'),
    heure: () => (state.heure ? '' : 'Choisissez une heure.'),
  };

  const errorEl = (name) =>
    form.querySelector(`[data-error="${name}"]`) ?? form.elements[name]?.closest('.field')?.querySelector('.field__error');

  const setError = (name, msg) => {
    const el = errorEl(name);
    if (!el) return;
    el.textContent = msg;
    const input = form.elements[name];
    const field = input?.closest('.field');
    field?.classList.toggle('is-invalid', !!msg);
    if (input && input.type !== 'hidden') {
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (el.id) input.setAttribute('aria-describedby', el.id);
    }
  };
  function clearError(name) {
    setError(name, '');
  }
  const validate = (name) => {
    const msg = rules[name](form.elements[name]?.value ?? '');
    setError(name, msg);
    return !msg;
  };

  ['nom', 'telephone', 'courriel'].forEach((name) => {
    const input = form.elements[name];
    input.addEventListener('blur', () => input.value && validate(name));
    input.addEventListener('input', () => input.closest('.field').classList.contains('is-invalid') && validate(name));
  });

  // ---------- Envoi ----------
  const submit = form.querySelector('[type="submit"]');
  const status = form.querySelector('.rform__status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Champ piège rempli : c'est un robot. On simule un succès sans rien envoyer.
    if (form.elements._gotcha?.value) {
      form.reset();
      return;
    }
    const invalid = Object.keys(rules).filter((n) => !validate(n));
    if (invalid.length) {
      const first = invalid[0];
      const target =
        form.elements[first]?.type !== 'hidden' ? form.elements[first] : form.querySelector(`[data-field="${first}"]`);
      target?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      if (target?.focus && target.tagName !== 'DIV') target.focus({ preventScroll: true });
      if (!reduced) gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
      status.textContent = 'Quelques détails à compléter.';
      status.classList.add('is-error');
      return;
    }

    const boisson = accords.boissons.find((b) => b.id === state.boisson);
    const [y, m, d] = state.date.split('-').map(Number);
    const dateLongue = DATE_LONGUE.format(new Date(y, m - 1, d));
    const data = {
      nom: form.elements.nom.value.trim(),
      telephone: form.elements.telephone.value.trim(),
      courriel: form.elements.courriel.value.trim(),
      date: state.date,
      date_lisible: dateLongue,
      heure: state.heure,
      personnes: state.personnes,
      boisson: boisson?.nom ?? 'Non précisée',
      demandes: form.elements.demandes.value.trim() || '—',
      _subject: `Réservation — ${form.elements.nom.value.trim()} — ${dateLongue} ${state.heure} (${state.personnes} pers.)`,
    };

    submit.classList.add('is-loading');
    submit.disabled = true;
    status.classList.remove('is-error');
    status.textContent = 'Envoi en cours…';

    try {
      await send(data);
      status.textContent = '';
      showConfirmation(data, state.boisson, lenis);
      form.reset();
      ['nom', 'telephone', 'courriel'].forEach(clearError);
      state.date = null;
      state.heure = null;
      state.boisson = null;
      form.elements.date.value = '';
      renderCalendar();
      renderSlots();
      setChecked(chips, null);
      setGuests(2);
      ['nom', 'date', 'heure', 'boisson'].forEach((k) => ticket(k, '—'));
    } catch (err) {
      console.error(err);
      status.classList.add('is-error');
      status.innerHTML = `Oups, l'envoi n'a pas fonctionné. Réessayez ou appelez-nous au <a href="tel:${RESTAURANT.telephoneLien}">${escapeHtml(RESTAURANT.telephone)}</a>.`;
    } finally {
      submit.classList.remove('is-loading');
      submit.disabled = false;
    }
  });
}

async function send(data) {
  const { service, formspreeId, emailjs } = RESERVATION;

  if (service === 'formspree' && formspreeId) {
    const res = await fetch(`https://formspree.io/f/${formspreeId}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, _replyto: data.courriel }),
    });
    if (!res.ok) throw new Error(`Formspree : ${res.status}`);
    return;
  }

  if (service === 'emailjs' && emailjs?.serviceId && emailjs?.templateId && emailjs?.publicKey) {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: emailjs.serviceId,
        template_id: emailjs.templateId,
        user_id: emailjs.publicKey,
        template_params: data,
      }),
    });
    if (!res.ok) throw new Error(`EmailJS : ${res.status} ${await res.text()}`);
    return;
  }

  if (service !== 'demo') {
    console.warn(`[Réservation] Le service « ${service} » n'est pas complètement configuré dans src/config.js — mode démo utilisé.`);
  }
  console.info('[Réservation — mode démo] Demande reçue :', data);
  await new Promise((r) => setTimeout(r, 1100));
}

function showConfirmation(data, boissonId, lenis) {
  const modal = document.querySelector('.confirm');
  const card = modal.querySelector('.confirm__card');
  const prenom = data.nom.split(' ')[0];
  modal.querySelector('.confirm__title').textContent = `Merci, ${prenom} !`;
  modal.querySelector('.confirm__text').innerHTML = `Votre demande pour <strong>${data.personnes} personne${
    data.personnes > 1 ? 's' : ''
  }</strong>, le <strong>${escapeHtml(data.date_lisible)}</strong> à <strong>${formatHeure(
    data.heure
  )}</strong>, est bien reçue. Nous vous confirmons la réservation très vite, par téléphone ou par courriel.`;

  const sugg = modal.querySelector('.confirm__suggest');
  const list = suggestions(boissonId);
  if (list.length) {
    const b = accords.boissons.find((x) => x.id === boissonId);
    sugg.hidden = false;
    sugg.querySelector('.confirm__suggest-title').textContent = `En accord avec votre ${b.court?.toLowerCase() ?? b.nom.toLowerCase()}`;
    sugg.querySelector('.confirm__suggest-list').innerHTML = list
      .map(({ id }) => getPlat(id))
      .filter(Boolean)
      .map((p) => `<li>${escapeHtml(p.nom)}</li>`)
      .join('');
  } else {
    sugg.hidden = true;
  }

  modal.hidden = false;
  lenis?.stop();
  const closeBtn = modal.querySelector('.confirm__close');
  const lastFocus = document.activeElement;
  closeBtn.focus();

  if (!reduced) {
    gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    gsap.fromTo(card, { y: 40, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 1, ease: 'expo.out' });
    const tl = gsap.timeline({ delay: 0.3 });
    tl.fromTo(modal.querySelectorAll('.confirm__ring'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut', stagger: 0.15 })
      .fromTo(modal.querySelector('.confirm__check'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power3.out' }, '-=0.4')
      .fromTo(modal.querySelector('.confirm__seal'), { rotate: -20 }, { rotate: 0, duration: 1.6, ease: 'expo.out' }, 0)
      .from(card.querySelectorAll('.confirm__title, .confirm__text, .confirm__suggest li, .confirm__close'), {
        y: 20,
        opacity: 0,
        stagger: 0.08,
        duration: 0.9,
        ease: 'expo.out',
      }, 0.4);
  }

  const close = () => {
    const end = () => {
      modal.hidden = true;
      lenis?.start();
      lastFocus?.focus?.({ preventScroll: true });
    };
    if (reduced) end();
    else gsap.to(modal, { opacity: 0, duration: 0.4, onComplete: end });
    closeBtn.removeEventListener('click', close);
    modal.removeEventListener('click', onBackdrop);
    document.removeEventListener('keydown', onKey);
  };
  const onBackdrop = (e) => e.target === modal && close();
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      e.preventDefault();
      closeBtn.focus();
    }
  };
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', onBackdrop);
  document.addEventListener('keydown', onKey);
}

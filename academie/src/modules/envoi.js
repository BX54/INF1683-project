/**
 * Envoi des formulaires (réservation, soumission) vers le service choisi dans src/config.js :
 * Formspree, EmailJS ou mode démo. Rien n'est conservé dans le navigateur.
 *
 * Jamais de faux succès : si le service n'est pas configuré, ou s'il refuse la demande,
 * la promesse échoue et le formulaire affiche une erreur (la saisie est conservée).
 * Le mode « demo » ne fonctionne qu'en développement (npm run dev).
 */
import { RESERVATION } from '../config.js';

const DELAI_MS = 15_000;

async function poster(url, init) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DELAI_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`Envoi refusé (${res.status})`);
    return res;
  } finally {
    clearTimeout(t);
  }
}

export async function sendForm(data, { formspreeId: idOverride } = {}) {
  const { service, emailjs } = RESERVATION;
  const formspreeId = idOverride || RESERVATION.formspreeId;

  if (service === 'formspree') {
    if (!formspreeId) throw new Error('Formspree : identifiant manquant dans src/config.js');
    await poster(`https://formspree.io/f/${encodeURIComponent(formspreeId)}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, _replyto: data.courriel }),
    });
    return;
  }

  if (service === 'emailjs') {
    if (!emailjs?.serviceId || !emailjs?.templateId || !emailjs?.publicKey) throw new Error('EmailJS : réglages incomplets dans src/config.js');
    await poster('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: emailjs.serviceId,
        template_id: emailjs.templateId,
        user_id: emailjs.publicKey,
        template_params: data,
      }),
    });
    return;
  }

  if (service === 'demo' && import.meta.env.DEV) {
    console.info('[Formulaire — mode démo] Aucune donnée envoyée ni conservée.', data._subject);
    await new Promise((r) => setTimeout(r, 900));
    return;
  }

  throw new Error(`Service d'envoi « ${service} » non configuré pour la production (src/config.js)`);
}

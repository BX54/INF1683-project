/**
 * Envoi des formulaires (réservation, soumission) vers le service choisi dans src/config.js :
 * Formspree, EmailJS ou mode démo. Rien n'est conservé dans le navigateur.
 */
import { RESERVATION } from '../config.js';

export async function sendForm(data, { formspreeId: idOverride } = {}) {
  const { service, emailjs } = RESERVATION;
  const formspreeId = idOverride || RESERVATION.formspreeId;

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
    console.warn(`[Formulaire] Le service « ${service} » n'est pas complètement configuré dans src/config.js — mode démo utilisé.`);
  }
  console.info('[Formulaire — mode démo] Aucune donnée envoyée ni conservée. Configurez le service dans src/config.js.');
  await new Promise((r) => setTimeout(r, 1100));
}

/* =====================================================================
   CONFIGURATION DU SITE — L'Académie
   Tout ce qui change souvent se trouve ici : coordonnées, heures,
   créneaux de réservation et service d'envoi du formulaire.
   ===================================================================== */

export const RESTAURANT = {
  nom: "L'Académie",
  adresse: '[ADRESSE EXACTE], boulevard Maloney',
  ville: 'Gatineau, QC',
  // Affiché tel quel :
  telephone: '[TÉLÉPHONE]',
  // Utilisé pour le lien « appeler » (chiffres seulement, avec +1) :
  telephoneLien: '+18190000000',
  courriel: '',
  // Lignes d'horaire affichées dans le pied de page.
  heures: [
    { jours: 'Lundi – Dimanche', heures: "[HEURES D'OUVERTURE]" },
  ],
  // Recherche Google Maps utilisée pour la carte intégrée.
  carteRecherche: "Restaurant L'Académie, boulevard Maloney, Gatineau, QC",
  reseaux: {
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
  },
};

export const RESERVATION = {
  /*
   * Service d'envoi : 'formspree', 'emailjs' ou 'demo'.
   * En mode 'demo', rien n'est envoyé : la confirmation s'affiche et
   * la demande est affichée dans la console (pratique pour tester).
   */
  service: 'demo',

  // Formspree : créez un formulaire sur https://formspree.io
  // et collez ici son identifiant (ex. 'xyzabcd' tiré de formspree.io/f/xyzabcd).
  formspreeId: '',

  // EmailJS : https://www.emailjs.com → Email Services, Email Templates, Account.
  emailjs: {
    serviceId: '',
    templateId: '',
    publicKey: '',
  },

  // Créneaux proposés (heure de début de la réservation).
  creneaux: ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],

  // Jours fermés : 0 = dimanche, 1 = lundi, … 6 = samedi. Ex. [1, 2] pour lundi et mardi.
  joursFermes: [],

  // Nombre de jours à l'avance où l'on peut réserver.
  joursOuverts: 60,

  personnesMax: 12,
};

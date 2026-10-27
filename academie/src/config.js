/* =====================================================================
   CONFIGURATION DU SITE — L'Académie
   Tout ce qui change souvent se trouve ici : coordonnées, heures,
   créneaux de réservation et service d'envoi du formulaire.
   ===================================================================== */

export const RESTAURANT = {
  nom: "L'Académie",
  adresse: '25, chemin de la Savane',
  ville: 'Gatineau (Québec)',
  // Affiché tel quel :
  telephone: '819 600-1300',
  // Utilisé pour le lien « appeler » (chiffres seulement, avec +1) :
  telephoneLien: '+18196001300',
  courriel: 'lacademiegatineau@gmail.com',
  // Lignes d'horaire affichées dans le pied de page.
  heures: [
    { jours: 'Tous les jours', heures: '11 h 30 – 22 h' },
  ],
  // Recherche Google Maps utilisée pour la carte intégrée.
  carteRecherche: "Restaurant L'Académie, 25 chemin de la Savane, Gatineau, QC",
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
  creneaux: [
    '11:30', '12:00', '12:30', '13:00', '13:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
  ],

  // Jours fermés : 0 = dimanche, 1 = lundi, … 6 = samedi. Ex. [1, 2] pour lundi et mardi.
  joursFermes: [],

  // Nombre de jours à l'avance où l'on peut réserver.
  joursOuverts: 60,

  personnesMax: 12,
};

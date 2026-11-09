/* =====================================================================
   CONFIGURATION DU SITE — L'Académie
   Tout ce qui change souvent se trouve ici : coordonnées, heures,
   créneaux de réservation et service d'envoi du formulaire.
   ===================================================================== */

export const RESTAURANT = {
  nom: "L'Académie",
  adresse: '25, chemin de la Savane',
  ville: 'Gatineau (Québec)',
  // Pour Google (données structurées). Code postal confirmé par le restaurant.
  codePostal: 'J8T 8A4',
  // Adresse du site une fois en ligne (ex. 'https://lacademiegatineau.ca') : sert à l'adresse canonique,
  // à l'image de partage et au sitemap. Laissez vide tant que le nom de domaine n'est pas choisi.
  siteUrl: 'https://restaurantlacademiegatineau.com',
  // Affiché tel quel :
  telephone: '819 600-1300',
  // Utilisé pour le lien « appeler » (chiffres seulement, avec +1) :
  telephoneLien: '+18196001300',
  courriel: 'lacademiegatineau@gmail.com',
  // Lignes d'horaire affichées dans le pied de page.
  heures: [
    { jours: 'Tous les jours', heures: '11 h 30 – 22 h' },
  ],
  // Mêmes heures, au format lu par Google (jours en anglais, heures sur 24 h).
  heuresGoogle: [
    {
      jours: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      ouverture: '11:30',
      fermeture: '22:00',
    },
  ],
  // Gamme de prix affichée par Google ($ à $$$$).
  gammePrix: '$$',
  // Recherche Google Maps utilisée pour la carte intégrée.
  carteRecherche: "Restaurant L'Académie, 25 chemin de la Savane, Gatineau, QC",
  // Liens vers les pages du restaurant. Laissez vide ('') pour masquer le lien.
  reseaux: {
    facebook: '',
    instagram: '',
  },
  /*
   * Livraison : liens vers la page du restaurant sur chaque plateforme
   * (ex. 'https://www.ubereats.com/ca-fr/store/...'). Laissez vide ('') pour masquer une plateforme.
   * La section « Commander » n'apparaît que si au moins un lien est rempli.
   */
  livraison: {
    uberEats: '',
    doorDash: '',
    skipTheDishes: '',
  },

  // Loi 25 : responsable de la protection des renseignements personnels.
  // Par défaut, c'est la personne ayant la plus haute autorité dans l'entreprise (le propriétaire).
  confidentialite: {
    responsable: 'Kossi, chef propriétaire',
    titre: 'Responsable de la protection des renseignements personnels',
    courriel: 'lacademiegatineau@gmail.com',
    // Durée de conservation des demandes de réservation (à confirmer par le restaurant).
    conservation: '12 mois',
    // Date de la dernière mise à jour de la politique.
    miseAJour: '1er novembre 2026',
  },
};

export const RESERVATION = {
  /*
   * Service d'envoi : 'formspree', 'emailjs' ou 'demo'.
   * En mode 'demo', rien n'est envoyé : la confirmation s'affiche et
   * la demande est affichée dans la console (pratique pour tester).
   */
  service: 'formspree',

  /*
   * Libro : collez ici le lien de réservation Libro du restaurant
   * (Libro › Mon restaurant › Paramètres › Widget de réservation).
   * Dès qu'il est rempli, tous les boutons « Réserver » ouvrent Libro dans un nouvel onglet
   * et le formulaire de réservation du site est remplacé par un bouton Libro.
   * Laissez vide ('') pour garder le formulaire du site.
   */
  libroUrl: 'https://widgets.libroreserve.com/WEB/QC016878045883/book',

  // Formspree : créez un formulaire sur https://formspree.io
  // et collez ici son identifiant (ex. 'xyzabcd' tiré de formspree.io/f/xyzabcd).
  formspreeId: 'xgaanbpo',

  // EmailJS : https://www.emailjs.com → Email Services, Email Templates, Account.
  emailjs: {
    serviceId: '',
    templateId: '',
    publicKey: '',
  },

  // Créneaux proposés (heure de début de la réservation).
  // Toutes les 15 minutes ; dernière réservation à 20 h 30 : la cuisine ferme à 21 h.
  creneaux: [
    '11:30', '11:45', '12:00', '12:15', '12:30', '12:45', '13:00', '13:15',
    '13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15',
    '15:30', '15:45', '16:00', '16:15', '16:30', '16:45', '17:00', '17:15',
    '17:30', '17:45', '18:00', '18:15', '18:30', '18:45', '19:00', '19:15',
    '19:30', '19:45', '20:00', '20:15', '20:30',
  ],

  // Jours fermés : 0 = dimanche, 1 = lundi, … 6 = samedi. Ex. [1, 2] pour lundi et mardi.
  joursFermes: [],

  // Nombre de jours à l'avance où l'on peut réserver.
  joursOuverts: 60,

  personnesMax: 12,

  // Demandes de soumission (salle / traiteur) : même formulaire Formspree par défaut.
  // Pour les recevoir séparément, créez un 2e formulaire Formspree et collez son identifiant ici.
  soumissionFormspreeId: '',

  // Délai de confirmation annoncé aux clients (sous le bouton et dans le message de remerciement).
  delaiConfirmation: 'en moins de 24 h',
};

# L'Académie — site web

Site vitrine immersif du restaurant **L'Académie** (Apportez votre vin, cuisine française et italienne), 25, chemin de la Savane, Gatineau.

**Stack :** Vite · JavaScript · GSAP (ScrollTrigger, DrawSVG, MorphSVG) · Lenis · Three.js · polices auto-hébergées (Playfair Display, Manrope).

## Démarrer

```bash
cd academie
npm install
npm run dev        # http://localhost:5173
npm run build      # version de production dans dist/
npm run preview    # tester la version de production
```

Le dossier `dist/` produit par `npm run build` peut être déposé tel quel chez n'importe quel hébergeur statique (Netlify, Vercel, OVH, cPanel…).

## Structure

```
academie/
├─ index.html                     Structure des 9 sections
├─ public/
│  ├─ favicon.svg
│  └─ images/
│     ├─ ambiance/                Photos du hero, de la salle, de la table (.webp)
│     ├─ plats/                   Photos des plats (.webp)
│     └─ equipe/                  Portraits de l'équipe (.webp)
├─ scripts/generate-placeholders.mjs   Crée les images de remplacement
└─ src/
   ├─ config.js                   ← Coordonnées, heures, réservation
   ├─ data/
   │  ├─ accueil.json             ← Hero, histoire, chef, plats signature
   │  ├─ menu.json                ← La carte
   │  ├─ accords.json             ← L'accord parfait
   │  ├─ equipe.json              ← L'équipe
   │  └─ galerie.json             ← Photos de la galerie
   ├─ modules/                    Un fichier par section / effet
   └─ styles/main.css             Couleurs, typographie, mises en page
```

## Remplacer les photos

1. Exportez vos photos en **WebP** (qualité 75–80 %). Tailles conseillées :
   - plats : **1200 × 1200 px** (carré ; le site recadre automatiquement) ;
   - équipe : **800 × 1000 px** (portrait 4:5) ;
   - hero (`ambiance/hero-1.webp` à `hero-3.webp`) : **2400 × 1500 px**, plat cadré **à droite**
     (le texte occupe la gauche) ;
   - salle (`ambiance/salle.webp`) : **1000 × 1250 px**, portrait.
2. Donnez-leur **exactement le même nom** que l'image de remplacement, puis écrasez-la dans
   `public/images/plats/` ou `public/images/equipe/` (ex. `filet-mignon.webp`, `chef.webp`).
3. Rechargez la page. C'est tout.

> Pour convertir en WebP : [squoosh.app](https://squoosh.app) (gratuit, dans le navigateur).

**Versions allégées automatiques.** `npm run dev` et `npm run build` créent seuls des versions plus légères
(`xxx-600.webp` pour les plats, `hero-N-1200.webp` et `hero-N-m.webp` pour l'accueil) : le navigateur charge la plus petite
qui suffit à l'écran. Ne les modifiez pas : remplacez seulement la photo d'origine, elles seront recréées.

Pour un **nouveau** plat ou membre, ajoutez l'entrée dans le JSON correspondant puis lancez
`npm run images` : le script crée une image de remplacement pour chaque fichier manquant,
**sans jamais écraser** vos vraies photos.

## Modifier l'accueil — `src/data/accueil.json`

- `hero.diapos` : les photos du diaporama et le nom du plat affiché en bas à droite (« Plat signature »).
  Ajoutez ou retirez des diapos librement ; `hero.duree` règle le temps d'affichage (en secondes).
- `histoire` et `chef` : textes du bandeau sous le hero.
- `signatures` : les 3 plats mis en avant avant la carte (leurs `id` dans `menu.json`).
- `raccourcis` : les catégories listées à droite des plats signature.

## Salle de réception et traiteur — `src/data/services.json`

- Textes, chiffres (« 200 invités »), listes et photos (`/images/ambiance/salle-reception.webp`, `traiteur.webp`) des deux services.
- `occasions` : la liste déroulante du formulaire de soumission.
- `delaiReponse` : délai de réponse annoncé (« en moins de 48 h »).
- Les demandes de soumission arrivent dans le même Formspree que les réservations, avec un sujet qui commence par **« SOUMISSION »**.
  Pour les recevoir dans un formulaire séparé, mettez son identifiant dans `src/config.js` → `soumissionFormspreeId`.
- `salles` et `modesTraiteur` : choix proposés dans le formulaire (grande salle ou salle privée ; livraison ou cueillette). Ils ne s'affichent que pour le service concerné.

## Modifier le menu — `src/data/menu.json`

Chaque catégorie contient une liste de plats :

```json
{
  "id": "filet-mignon",
  "nom": "Filet mignon, sauce au poivre",
  "description": "Bœuf tendre saisi, sauce au cognac…",
  "prix": "46",
  "image": "/images/plats/filet-mignon.webp",
  "tags": ["Signature"]
}
```

- `id` : identifiant unique, sans espace ni accent (il sert aussi aux accords).
- `prix` : le nombre seulement, le « $ » est ajouté automatiquement.
- `tags` : facultatif (« Végétarien », « Épicé », « Signature »…).
- `image` : facultatif. Sans image, l'article s'affiche en carte texte élégante. Pour ajouter la photo d'un plat qui n'en a pas : déposez `public/images/plats/<id>.webp`, puis ajoutez `"image": "/images/plats/<id>.webp"` au plat.
- `prix` peut contenir plusieurs montants (`"8 · repas 14"`) : le « $ » est ajouté après chaque nombre. « Prix du marché » s'affiche tel quel.
- `note` (catégorie, facultatif) : texte encadré sous le titre, par exemple les conditions des spéciaux.
- Pour ajouter une catégorie, copiez un bloc `{ "id", "nom", "accroche", "plats" }`.

Les prix sont ceux du menu du restaurant : modifiez-les ici quand ils changent.

## Modifier les accords — `src/data/accords.json`

Chaque boisson recommande 3 plats en citant leur `id` du menu, avec une phrase « pourquoi » :

```json
{
  "id": "blanc",
  "nom": "Vin blanc",
  "verre": "ballon",
  "couleur": "#D9B85A",
  "reflet": "#F4DD8E",
  "intro": "Vif ou beurré, le blanc révèle…",
  "plats": [
    { "id": "moules-marinieres", "pourquoi": "Le vin de la cuisson est celui qu'on boit…" }
  ]
}
```

- `verre` : `ballon`, `flute`, `biere` ou `tumbler` (forme du verre animé).
- `couleur` / `reflet` : teinte du liquide (foncé / clair).
- `bulles: true` : bulles qui montent ; `mousse: true` : col de mousse (bière).
- Le **vin rouge** utilise `profils` (léger, fruité, corsé), chacun avec ses propres `plats`.

Si un `id` ne correspond à aucun plat du menu, un avertissement s'affiche dans la console du navigateur.

## Coordonnées, heures et réservation — `src/config.js`

```js
export const RESTAURANT = {
  adresse: '25, chemin de la Savane',
  telephone: '819 600-1300',         // affiché
  telephoneLien: '+18196001300',     // utilisé pour « appeler »
  courriel: 'lacademiegatineau@gmail.com',
  heures: [{ jours: 'Tous les jours', heures: '11 h 30 – 22 h' }],
  reseaux: { facebook: '…', instagram: '…' },
};
```

Modifiez ces valeurs au besoin. La carte Google Maps utilise `carteRecherche`.

### Livraison (Uber Eats, DoorDash, SkipTheDishes)

Dans `src/config.js` → `RESTAURANT.livraison`, collez le lien de la page du restaurant sur chaque plateforme.
Dès qu'un lien est rempli, une section « L'Académie chez vous » apparaît sous la carte, avec un bouton par
plateforme (nouvel onglet), un lien dans le menu mobile, une mention dans la politique de confidentialité et
une action « Commander » dans les données structurées Google. Simples liens : aucun script tiers.

### Commande en ligne (livraison et cueillette)

Réglages dans `src/config.js` → `COMMANDE` :
- `actif` : `true` affiche un bouton « Commander » sur chaque plat de la carte, la section « L'Académie chez vous » et la barre « Ma commande » ;
- `secteurs` : secteurs de Gatineau, frais de livraison et codes postaux (3 premiers caractères). Le client ne voit pas de grille de prix : les frais sont ajoutés à sa facture dès qu'il saisit son code postal. Un code absent de la liste = hors zone (cueillette proposée). `minimumLivraison` : minimum avant frais ;
- `heures` et `delaiMinutes` : le client choisit « Dès que possible » ou « Choisir l'heure » (de 11 h 30 à 21 h, par tranches de 15 min) ; `paiements` : choix affichés (paiement à la réception) ;
- `taxes` (TPS, TVQ), `sansGluten` (supplément par catégorie) et `rabais` (ex. spécial pâtes du dimanche au mercredi).

Les formats viennent du prix dans `menu.json` : `"13 · gratinés 16"` propose « Régulier 13 $ » ou « Gratinés 16 $ ».
Un plat « Prix du marché » ne peut pas être commandé en ligne.
Chaque commande arrive **par courriel** (Formspree), avec un sujet qui commence par **« COMMANDE »** ; le restaurant rappelle le client
pour confirmer. Pour un formulaire séparé, mettez son identifiant dans `COMMANDE.formspreeId`.
Le panier n'est jamais enregistré dans le navigateur (Loi 25) : il se vide si la page est rechargée.

### Réservations avec Libro

Dans `src/config.js`, `RESERVATION.libroUrl` contient l'adresse du module de réservation Libro
(Libro › Widget Customization › « Integration tag for your website » : l'adresse `src` de l'iframe). Dès qu'il est rempli :
- tous les boutons « Réserver » (en-tête, hero, bouton mobile, menu, accords) ouvrent une **fenêtre de réservation
  par-dessus le site** : le client réserve sans quitter la page (Ctrl/Cmd + clic ouvre plutôt un nouvel onglet) ;
- la section Réservation affiche un bouton « Réserver sur Libro » à la place du formulaire du site ;
- la politique de confidentialité mentionne Libro et ses témoins.

Le module Libro n'est chargé **qu'au clic** sur « Réserver » : avant, rien de Libro n'est chargé et le site ne stocke rien.
Une fois ouvert, Libro peut déposer ses propres témoins (mentionné dans la fenêtre et dans la politique).
Les en-têtes de sécurité (`public/_headers`, `vercel.json`) autorisent uniquement `*.libroreserve.com` dans une iframe.
Laissez `libroUrl: ''` pour garder le formulaire du site.

### Configurer l'envoi des réservations

Dans `RESERVATION`, choisissez le `service` :

| Service | Étapes |
|---|---|
| `'demo'` (par défaut) | Rien n'est envoyé. La confirmation s'affiche et la demande apparaît dans la console. Pratique pour tester. |
| `'formspree'` | 1. Créez un compte sur [formspree.io](https://formspree.io), puis un formulaire. 2. Copiez son identifiant (`https://formspree.io/f/`**`xyzabcd`**). 3. `service: 'formspree', formspreeId: 'xyzabcd'`. Vous recevez chaque réservation par courriel. |
| `'emailjs'` | 1. Sur [emailjs.com](https://www.emailjs.com) : ajoutez un *Email Service* (Gmail, Outlook…) et créez un *Email Template*. 2. Dans le modèle, utilisez les variables `{{nom}}`, `{{telephone}}`, `{{courriel}}`, `{{date_lisible}}`, `{{heure}}`, `{{personnes}}`, `{{boisson}}`, `{{demandes}}`. 3. Renseignez `serviceId`, `templateId` et `publicKey` (Account → General). |

Autres réglages :

- `creneaux` : heures proposées (`['17:00', '17:30', …]`) ;
- `joursFermes` : jours sans réservation (`0` = dimanche, `1` = lundi… ex. `[1, 2]`) ;
- `joursOuverts` : jusqu'à combien de jours à l'avance on peut réserver ;
- `personnesMax` : nombre maximal de couverts en ligne.

## Accessibilité et performance

- `prefers-reduced-motion` est respecté : pas de défilement doux, d'animations ni de particules en mouvement, et la galerie se parcourt au glissé.
- Three.js est chargé à part, après le premier rendu, et mis en pause hors écran. Le nombre de particules est réduit sur mobile.
- Images en WebP avec `loading="lazy"`. La carte n'est chargée qu'à l'approche du pied de page.
- Navigation au clavier (onglets du menu, sélecteurs, calendrier), libellés ARIA et lien d'évitement.
- Les polices sont servies depuis le site lui-même : aucune requête vers Google Fonts.

## Loi 25 et sécurité

Déjà en place :
- **Avis de collecte** sous le formulaire de réservation (finalités, transfert hors Québec, durée de conservation, droits) et lien vers la **politique de confidentialité** (`politique-confidentialite.html`).
- **Responsable de la protection des renseignements personnels** affiché dans le pied de page et la politique : à régler dans `src/config.js` → `RESTAURANT.confidentialite` (nom, courriel, durée de conservation, date de mise à jour).
- Aucun renseignement de santé demandé : les allergies sont à signaler sur place.
- **Aucune donnée stockée dans le navigateur** : ni témoin (cookie), ni localStorage/sessionStorage, ni IndexedDB, ni service worker. Pas de carte Google intégrée (un lien ouvre Google Maps), aucun outil de suivi, aucun contenu tiers.
- **Anti-robots** : champ piège invisible dans le formulaire.
- **En-têtes de sécurité HTTP** (CSP, HSTS, anti-iframe…) : `public/_headers` (Netlify, Cloudflare Pages) et `vercel.json` (Vercel).
  Si vous modifiez le petit script en ligne de `index.html`, recalculez son empreinte `sha256` dans ces deux fichiers.

À faire par le restaurant (hors du code) :
1. Désigner par écrit le ou la responsable, et mettre son nom dans `src/config.js`.
2. Faire une **évaluation des facteurs relatifs à la vie privée** (EFVP) pour l'envoi des réservations vers Formspree/EmailJS et Gmail (serveurs hors Québec), et la garder au dossier.
3. Tenir un **registre des incidents de confidentialité** et une procédure de suppression des demandes après la durée de conservation.
4. Pour EmailJS : limiter la clé publique au nom de domaine du site (Account → Security).
5. Faire relire la politique par un ou une juriste si possible.

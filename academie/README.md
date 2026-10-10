# L'Académie — site web

Site vitrine immersif du restaurant **L'Académie** (Apportez votre vin, cuisine française et italienne), boulevard Maloney, Gatineau.

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
│     ├─ plats/                   Photos des plats (.webp)
│     └─ equipe/                  Portraits de l'équipe (.webp)
├─ scripts/generate-placeholders.mjs   Crée les images de remplacement
└─ src/
   ├─ config.js                   ← Coordonnées, heures, réservation
   ├─ data/
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
   - équipe : **800 × 1000 px** (portrait 4:5).
2. Donnez-leur **exactement le même nom** que l'image de remplacement, puis écrasez-la dans
   `public/images/plats/` ou `public/images/equipe/` (ex. `filet-mignon.webp`, `chef.webp`).
3. Rechargez la page. C'est tout.

> Pour convertir en WebP : [squoosh.app](https://squoosh.app) (gratuit, dans le navigateur).

Pour un **nouveau** plat ou membre, ajoutez l'entrée dans le JSON correspondant puis lancez
`npm run images` : le script crée une image de remplacement pour chaque fichier manquant,
**sans jamais écraser** vos vraies photos.

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
- Pour ajouter une catégorie, copiez un bloc `{ "id", "nom", "accroche", "plats" }`.

Les prix fournis sont des **exemples** : ajustez-les.

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
  adresse: '[ADRESSE EXACTE], boulevard Maloney',
  telephone: '[TÉLÉPHONE]',          // affiché
  telephoneLien: '+18190000000',     // utilisé pour « appeler »
  heures: [{ jours: 'Mardi – Samedi', heures: '17 h – 22 h' }],
  reseaux: { facebook: '…', instagram: '…' },
};
```

Remplacez les valeurs entre crochets. La carte Google Maps utilise `carteRecherche`.

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

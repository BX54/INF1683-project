# L'Académie — consignes pour Claude Code

Site vitrine du restaurant L'Académie (Apportez votre vin), 25, chemin de la Savane, Gatineau.
Vite + JavaScript (sans framework), GSAP, Lenis, Three.js. Tout le site est en français.

## Règle n° 1 : ne pas casser le visuel
- La direction artistique est **figée** : noir (#0B0B0B), charbon (#161412), or (#C9A24B / #E6C77A),
  ivoire (#F3EDE2), titres en Playfair Display (majuscules, accent en italique doré), texte en Manrope.
- Ne change pas la structure de `index.html`, les classes CSS existantes, les variables de `:root`
  dans `src/styles/main.css`, ni l'ordre des sections, **sauf demande explicite**.
- Pas de nouveau framework (React, Tailwind, Bootstrap…) ni de nouvelle police.
- Pour un ajustement visuel, ajoute des règles CSS ciblées à la fin de `src/styles/main.css`
  plutôt que de réécrire les blocs existants.
- Fais la plus petite modification qui répond à la demande. Ne « améliore » rien d'autre.

## Où modifier le contenu (dans 90 % des cas, uniquement ces fichiers)
| Quoi | Fichier |
|---|---|
| Adresse, téléphone, courriel, heures, réseaux, créneaux de réservation, service d'envoi (Formspree/EmailJS) | `src/config.js` |
| Menu (catégories, plats, prix, notes des spéciaux) | `src/data/menu.json` |
| Accords boisson → 3 plats (ids de `menu.json`) | `src/data/accords.json` |
| Hero (diaporama), histoire, chef, plats signature, raccourcis | `src/data/accueil.json` |
| Équipe | `src/data/equipe.json` |
| Galerie | `src/data/galerie.json` |
| Photos | `public/images/plats/`, `public/images/equipe/`, `public/images/ambiance/` (WebP, mêmes noms de fichiers) |

Tout `id` cité dans `accords.json`, `accueil.json` ou `galerie.json` doit exister dans `menu.json`.
Les prix s'écrivent sans « $ » (ajouté automatiquement) : `"14"`, `"8 · repas 14"`, `"Prix du marché"`.

## Structure du code
- `src/main.js` : point d'entrée, initialise les modules.
- `src/modules/` : un module par section ou effet (intro, accueil/hero, accord, menu, gallery, team,
  reservation, infos, header, cursor, particles, reveals, smooth, motion, data).
- `prefers-reduced-motion` doit rester respecté (voir `reduced` dans `src/modules/motion.js`).

## Vérifier avant de dire « terminé »
```
npm run build      # doit finir sans erreur
npm run dev        # http://localhost:5173 : vérifier la section modifiée, sur ordinateur ET en largeur mobile
```
Aucune erreur dans la console du navigateur. Si une modification casse l'affichage, annule-la.

## Git
Avant chaque série de modifications : `git add . && git commit -m "avant : <description>"`,
pour pouvoir revenir en arrière avec `git checkout .` ou `git reset --hard HEAD`.

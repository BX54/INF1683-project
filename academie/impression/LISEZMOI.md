# Code QR des tables

Le code QR mène à **https://restaurantlacademiegatineau.com/#menu** (la carte du site).
Il ne change jamais : si le menu est modifié sur le site, les QR déjà imprimés restent bons.

| Fichier | Usage |
|---|---|
| `chevalet-qr-a-plier-lettre.pdf` | Chevalet de table à plier, sur feuille Lettre (cartonnée de préférence) : couper, plier au pointillé |
| `chevalet-qr-10x15.pdf` | Carte 10 × 15 cm pour un présentoir ou un porte-menu acrylique |
| `qr-carte-lacademie.png` / `.svg` | QR seul, ivoire et noir (pour un imprimeur, une affiche, un menu papier) |
| `qr-carte-noir-blanc.png` | QR seul, noir sur blanc |

Impression : 100 %, sans « ajuster à la page ». Garder le QR d'au moins 3 × 3 cm.
Pour régénérer : `pip install segno reportlab fonttools brotli`, puis `python3 generer-chevalet.py <dossier>`
(le dossier doit contenir les polices Playfair Display et Manrope au format .ttf).

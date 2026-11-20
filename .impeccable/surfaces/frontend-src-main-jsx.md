---
version: 1
slug: "frontend-src-main-jsx"
primary_target: "frontend/src/main.jsx"
related_targets: ["frontend/src/style.css","frontend/src/engine/room.js"]
---

# Écrans du jeu

Mode : application de jeu, construction directe dans React. Refonte visuelle demandée ; le gameplay, les scores et les données restent ceux des sprints validés.

## Direction contract

THESIS: le niveau est l'écran principal ; l'UI est un menu et un HUD de FPS rétro, avec une mission lisible et des commandes natives.

OWN-WORLD: acier olive et graphite, rouge braise, chiffres et titres Barlow Condensed massifs, texte Barlow clair. Surfaces carrées, rivets discrets, textures industrielles pixelisées ; vert réservé à la sortie et à la réussite.

STORY: lire la mission, choisir Jouer, explorer toute la fenêtre, suivre la vie dans le HUD, reprendre en pause puis enregistrer son score à la fin.

FIRST VIEWPORT: accueil à gauche avec grand titre et bouton Jouer, plan réel du petit niveau à droite, classement compact et commandes en dessous. En jeu, Canvas sur toute la fenêtre avec HUD en bas et menu centré en pause/résultat. Plein écran natif disponible par bouton dédié.

FORM: seed: none (pinned). L'utilisateur a demandé « l'ambiance du jeu doom » et « mettre le jeu en plein ecran », après avoir choisi « Accueil et menus ». Ses messages précédents fixent le premier Doom comme référence.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

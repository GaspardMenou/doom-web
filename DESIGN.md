---
name: "Doom Web"
description: "FPS rétro à l’ambiance du premier Doom, avec acier olive, rouge braise et HUD pleine fenêtre."
colors:
  ink: "#e9e3d4"
  muted: "#b7b8a5"
  line: "#626653"
  red: "#c43b2e"
  bright-red: "#f8735d"
  green: "#b5d778"
  shell: "#11130f"
  action-surface: "#a93428"
  action-ink: "#fff1dc"
  secondary-surface: "#30362b"
  focus: "#f4c782"
  field-surface: "#0f150d"
  field-ink: "#f0ebdc"
  menu-surface: "#20251cef"
  hud-value: "#f0d29c"
  health: "#ff8767"
  error-surface: "#491e19"
  error-border: "#ef8d78"
  error-ink: "#ffdbd1"
typography:
  display:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "clamp(80px, 10vw, 148px)"
    fontWeight: 800
    lineHeight: 0.8
    letterSpacing: "-0.025em"
  headline:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "clamp(26px, 2.6vw, 36px)"
    fontWeight: 800
    lineHeight: 1.15
  title:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.07em"
  action:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.03em"
  action-secondary:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.03em"
  field:
    fontFamily: "Barlow, sans-serif"
    fontSize: "17px"
    fontWeight: 400
  hud:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "47px"
    fontWeight: 800
    lineHeight: 0.95
rounded:
  square: "0px"
spacing:
  "10": "10px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "30": "30px"
components:
  button-primary:
    backgroundColor: "{colors.action-surface}"
    textColor: "{colors.action-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.square}"
    padding: "14px 24px"
  button-secondary:
    backgroundColor: "{colors.secondary-surface}"
    textColor: "{colors.action-ink}"
    typography: "{typography.action-secondary}"
    rounded: "{rounded.square}"
    padding: "14px 24px"
  button-utility:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "9px 10px"
  score-field:
    backgroundColor: "{colors.field-surface}"
    textColor: "{colors.field-ink}"
    typography: "{typography.field}"
    rounded: "{rounded.square}"
    padding: "13px 14px"
  score-submit:
    backgroundColor: "#a93427"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.square}"
    padding: "12px 16px"
  menu-panel:
    backgroundColor: "{colors.menu-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "30px 34px"
    width: "min(100%, 580px)"
  player-hud:
    typography: "{typography.hud}"
    height: "124px"
---

# Design System: Doom Web

## Overview

**Creative North Star: "Ambiance du jeu Doom — premier Doom (1993)"**

« Ambiance du jeu Doom » est la direction confirmée : le premier Doom (1993) fournit le langage du FPS rétro. L’acier olive, le graphite, le rouge braise et les caractères condensés donnent aux menus et au HUD le même caractère que le secteur exploré.

Le décor est pixelisé ; les commandes restent du texte HTML net. Les titres sont massifs, les surfaces carrées et les informations de jeu concentrées dans une barre basse. Le jeu occupe la fenêtre et propose le plein écran natif. Les menus de pause et de résultat se superposent au niveau en gardant le HUD visible.

Les images du couloir et du pistolet sont des créations originales générées, avec provenance à côté des fichiers dans `frontend/public/art/`. Les textures industrielles du niveau sont produites dans le projet. Cette direction ne fournit aucune autorisation de reprendre les assets originaux de Doom.

**Key Characteristics:**

- Acier olive et graphite, accents rouge braise, réussite et sortie vertes.
- Titres Barlow Condensed lourds ; texte courant Barlow lisible.
- Angles droits, filets et biseaux sombres, profondeur industrielle.
- Canvas pleine fenêtre, HUD bas et menus superposés.
- Art pixelisé original ; focus clavier visible et mouvement réduit respecté.

## Colors

La palette associe des neutres olive et graphite à une braise rouge, avec un vert de sortie et des chiffres chauds. Les primitives exactes figurent dans le frontmatter ; les six noms courts reprennent les propriétés CSS existantes.

### Primary

- **Braise** (`red`) et **Braise vive** (`bright-red`) : accents de l’identité et repère de menace sur le plan.
- **Braise d’action** (`action-surface`) et **Ivoire d’action** (`action-ink`) : commandes principales ; les variantes de survol restent dans la même famille rouge.
- **Vie** (`health`) : nombre de PV, complété par la jauge et son libellé.
- **Erreur** (`error-surface`, `error-border`, `error-ink`) : messages récupérables, avec texte explicite.

### Secondary

- **Vert de sortie** (`green`) : famille du repère de sortie et de la réussite ; le plan et le résultat emploient leurs nuances existantes.

### Tertiary

- **Ambre de focus** (`focus`) : contour clavier contrasté.
- **Ambre de compteur** (`hud-value`) : valeurs principales du HUD.

### Neutral

- **Ivoire usé** (`ink`) : texte principal ; **Olive clair** (`muted`) : informations secondaires.
- **Filet olive** (`line`) : primitive de séparation déclarée dans la racine CSS ; les composants ont aussi leurs filets contextuels.
- **Graphite** (`shell`) : fond de l’application et assombrissement du décor.
- **Acier olive** (`secondary-surface`) : commandes secondaires.
- **Cavité de saisie** (`field-surface`) et **Ivoire de saisie** (`field-ink`) : pseudo, sur fond sombre.
- **Panneau olive** (`menu-surface`) : menus de pause et de résultat translucides.

**The Mission Color Rule.** Le vert signale la sortie et la réussite ; le rouge porte les actions, les menaces et la perte de vie. Le libellé complète toujours le code couleur.

## Typography

**Display Font:** Barlow Condensed, avec sans-serif de secours.

**Body Font:** Barlow, avec sans-serif de secours.

Les polices sont auto-hébergées dans `frontend/public/fonts/`, avec les licences OFL. Barlow Condensed extra-gras structure les titres, les boutons d’action et les compteurs. Barlow régulier et semi-gras assurent la lecture des consignes, des commandes, du classement et du formulaire. Aucun alphabet pixelisé n’est appliqué au texte de l’interface.

### Hierarchy

- **Display** : titre d’accueil en capitales ; sa taille fluide, son interlettrage serré et son interligne compact sont les tokens `display`.
- **Headline** : phrase de mission en capitales ; le titre des menus a une taille fluide distincte (`clamp(46px, 6vw, 72px)`).
- **Title** : titre du classement ; le titre du plan utilise une taille légèrement inférieure (22px).
- **Body** : texte de mission limité à 39ch ; il passe à 17px sous le seuil de 900px. Les paragraphes des menus utilisent aussi 17px, avec un interligne de 1.5.
- **Label** : libellés du HUD en capitales, espacés ; les aides et légendes restent en Barlow.
- **Action** : boutons principaux et secondaires en capitales. Le bouton Jouer amplifie la même forme avec un texte de 30px.
- **HUD** : chiffres tabulaires ; la taille descend à 40px sous 900px, puis 38px sous 640px. L’arme et l’objectif utilisent un corps plus petit.

## Layout

La coque suit la hauteur dynamique de la fenêtre (`100dvh`). Hors jeu, le contenu a une largeur maximale de 1440px et des marges internes horizontales de 5vw. L’accueil utilise une grille à deux colonnes (`1.2fr .8fr`), puis `1fr .7fr` sous 900px. Sous 640px, les blocs s’empilent, le classement passe d’une grille à deux colonnes à une colonne et les formulaires peuvent revenir à la ligne.

En jeu, le Canvas couvre la largeur disponible et la hauteur au-dessus du HUD. La hauteur réservée au HUD vient de `--hud-height` : 124px, puis 104px sous 640px. Il comporte cinq cellules sur grand écran et trois sur petit écran ; l’arme et l’objectif sont alors masqués, tandis que munitions, vie et ennemi restent affichés. Le bouton de plein écran et la pause sont dans la barre haute superposée.

Les menus sont centrés dans l’espace du jeu, limités à 580px et défilables quand la hauteur manque. Sur petit écran ils s’alignent en haut avec une marge pour la barre de commandes. Les espacements réutilisent surtout les pas du frontmatter ; les compositions gardent leurs mesures contextuelles. Au-delà de 1700px, l’accueil réserve davantage de hauteur à sa grille.

## Elevation & Depth

La profondeur vient du décor assombri, des couches olive translucides, de filets contrastés et de biseaux internes. Les ombres sont structurelles : elles détachent un menu ou creusent un bouton. Le HUD associe un dégradé d’acier et de fines lignes horizontales ; le titre d’accueil possède une ombre typographique étagée. Le contour sombre de la vue renforce l’espace du niveau sans capturer les événements de pointeur.

### Shadow Vocabulary

- **Bouton biseauté** : deux ombres internes claires et sombres, puis une ombre externe courte ; à l’appui, le biseau devient une cavité.
- **Plan** : ombre portée douce sous un panneau sombre.
- **Menu** : ombre portée profonde et mince reflet interne supérieur.
- **HUD** : ombre vers le haut, séparant la barre basse de la vue.

Les valeurs exactes et les sélecteurs d’origine sont dans le sidecar.

**The Live View Rule.** En jeu, la vue remplit l’espace au-dessus du HUD ; pause et résultat se placent devant elle sans masquer la barre d’état.

## Shapes

Les formes sont rectangulaires, à angles droits. Les boutons et les champs ont un rayon nul. Des bordures fines délimitent les panneaux et les commandes ; les touches clavier sont de petits rectangles bordés. Le réticule est une croix SVG fine, et les icônes utilitaires sont des tracés SVG ouverts. Les éléments du plan restent géométriques et distinguent départ, ennemi et sortie par forme, texte et couleur.

## Components

### Buttons

Les actions ont le poids de commandes mécaniques. Le bouton principal utilise la braise d’action, un filet chaud et le biseau partagé ; le secondaire reprend sa forme en acier olive. Le survol éclaire fond et bordure, l’appui creuse le bouton. Le bouton Jouer est plus haut et sépare son libellé de la flèche. Les commandes utilitaires restent transparentes au repos et reçoivent un fond olive au survol.

Les changements de fond et de bordure durent 150ms. Le focus clavier dessine un contour ambre (3px, décalage de 5px). Un bouton désactivé descend à une opacité de 0.45 et perd le curseur d’action.

### Cards / Containers

Le panneau de menu est une plaque olive translucide, carrée, bordée et ombrée. Son titre rouge devient vert à la victoire. Le plan est un panneau plus étroit qui contient le tracé réel du niveau et sa légende ; le classement est une bande basse compacte avec séparateurs, rangs et scores tabulaires. Les noms longs peuvent se couper pour préserver la mise en page.

### Inputs / Fields

Le pseudo utilise un champ rectangulaire creusé, une bordure olive claire et un curseur rouge vif. Son libellé reste visible au-dessus. Le bouton d’enregistrement est un bouton Barlow semi-gras, plus compact que les commandes principales. L’enregistrement expose un état en cours, une confirmation textuelle ou une erreur ; une erreur apparaît dans le panneau rouge bordé. Sur petit écran, champ et bouton prennent chacun une ligne.

### HUD

La barre d’état conserve des cellules alignées, séparées par des filets. Les valeurs sont grandes, chaudes et tabulaires. La vie a son propre accent rouge et une jauge native ; les textes complètent les symboles et les couleurs. L’arme pixelisée est centrée au bas de la vue, au-dessus du HUD, avec une largeur fluide (`clamp(180px, 26vw, 360px)`).

### Commands and overlays

Les commandes clavier sont de petites touches bordées accompagnées de verbes lisibles. Elles sont visibles à l’accueil et pendant les menus. La pause et le résultat couvrent la vue par un voile sombre, avec actions de reprise, nouvelle partie et retour. L’arrivée de l’accueil dure 280ms, avec un déplacement vertical de 8px et une opacité initiale de 0.85 ; les préférences de mouvement réduit suppriment animations et transitions.

## Do's and Don'ts

### Do:

- **Do** conserver les deux familles Barlow auto-hébergées et leur licence OFL.
- **Do** garder la hiérarchie entre action principale rouge, action secondaire olive et commande utilitaire transparente.
- **Do** conserver le focus visible, les messages textuels, les états désactivés et le respect de prefers-reduced-motion.
- **Do** préserver les pixels de la vue et de l’arme avec image-rendering: pixelated.
- **Do** accompagner chaque nouvel asset raster livré de sa provenance.

### Don't:

- **Don’t** remplacer les surfaces carrées par des pilules ou des cartes arrondies.
- **Don’t** étendre la palette vers le néon bleu ou violet du cyberpunk moderne.
- **Don’t** copier de sprites, textures ou logos du Doom original.
- **Don’t** transformer le HUD et les messages de jeu en éléments purement décoratifs.

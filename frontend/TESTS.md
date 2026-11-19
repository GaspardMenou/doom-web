# Comprendre les tests du front

Les 18 fichiers de tests Node et les 4 scénarios navigateur ont été relus avec le code qu'ils vérifient. La suite Node passe de **108 à 90 tests**. Ce nombre compte les tests déclarés, pas chaque assertion ni chaque exemple dans une boucle.

Le TDD aide à construire les règles progressivement. Les tests intermédiaires méritent ensuite la même relecture que le code : garder les règles distinctes, retirer les répétitions et simplifier les préparations.

## Ce qui a été retiré ou simplifié

- **Parcours répétés** : le test de campagne traversait déjà les trois cartes ; trois autres tests rejouaient exactement les mêmes trajets. Un seul parcours complet garde désormais aussi la vérification des gardes éliminés.
- **Faux tests de redémarrage** : des tests préparaient une partie perdue ou gagnée, puis appelaient simplement `newGame()` sans transmettre cet ancien état. Ils retestaient l'initialisation. Un test de création et d'isolement des parties reste dans `campaign.test.js` ; le vrai bouton Rejouer reste vérifié dans le navigateur.
- **Fin de partie** : une même règle « victoire ou défaite bloque les déplacements et les tirs » remplace les répétitions dans trois fichiers.
- **Tirs** : les cas cible devant/cible décalée existaient déjà dans le test des déplacements caméra/cible. Le mur devant la cible était testé deux fois. Les tests utilisent maintenant `castShot()`, appelé par le jeu, et un vrai tracé `Line` remplace l'ancienne grille de démonstration.
- **Rendu** : retrait des assertions qui imposaient le nombre exact d'objets Three.js, les dimensions internes des textures et tous les réglages visuels des matériaux. La correspondance entre le plan, les murs, la sortie et les gardes reste testée. Le chargement vérifie aussi que les bonnes images remplacent les textures de secours.
- **Trajets** : le chemin doit progresser sans traverser un mur. Le test n'impose plus un détour à droite quand un détour à gauche serait également correct. La régression au coin du mur reste couverte.
- **Petits exemples** : la formule du score garde ses exemples à 1, 2 et 3 PV dans un seul test. Les anciens exemples HTTP `/tasks/` et PATCH sont remplacés par `/scores/` et POST. Les réponses API invalides sont disposées ligne par ligne pour être lisibles.

Le test de collision avec le bloc central a simplement été déplacé de `victory.test.js` vers `game.test.js`, où il correspond au sujet du fichier. Les exemples de score et les deux sens de contournement sont rassemblés sans retirer leurs cas.

## Inventaire des tests Node

Les chemins sont relatifs à ce dossier.

| Fichier | Avant | Après | Ce qu'il protège |
| --- | ---: | ---: | --- |
| [api.test.js](src/api.test.js) | 4 | 4 | Réponse vide, erreur HTTP, corps JSON, panne réseau. |
| [campaign.test.js](src/campaign.test.js) | 11 | 8 | Parties indépendantes, niveaux suivants, PV conservés, campagne complète, repos initial sur chaque carte. |
| [combat.test.js](src/combat.test.js) | 7 | 3 | Raccordement de la boucle au combat et blocage des commandes après la fin. |
| [enemy.test.js](src/enemy.test.js) | 13 | 13 | Détection, poursuite, attaques, délais indépendants, murs, morts et fréquence d'images. |
| [enemyAnimation.test.js](src/enemyAnimation.test.js) | 3 | 3 | Repos, alternance des pas et pose d'attaque. |
| [fullscreen.test.js](src/fullscreen.test.js) | 4 | 4 | Entrée, sortie, incompatibilité et refus du navigateur. |
| [game.test.js](src/game.test.js) | 9 | 10 | Déplacement, regard, diagonale, fréquence d'images, collisions et temps écoulé. |
| [input.test.js](src/input.test.js) | 4 | 4 | AZERTY, directions, raccourcis simultanés et touches libérées. |
| [level.test.js](src/level.test.js) | 7 | 6 | Géométrie, rayons, glissement, ligne de vue et limites de sortie. |
| [levelsLayout.test.js](src/levelsLayout.test.js) | 6 | 6 | Plans valides, deux passages à l'Entrée et trajets possibles des gardes sur chaque carte. |
| [path.test.js](src/path.test.js) | 6 | 4 | Trajet direct, contournement dans les deux sens, destination inaccessible et coin du mur. |
| [playerStats.test.js](src/playerStats.test.js) | 3 | 3 | Contrat API valide, absence de parties, moyenne décimale et réponses invalides. |
| [roomImages.test.js](src/roomImages.test.js) | 2 | 2 | Images chargées, textures indépendantes et arrivée après démontage. |
| [score.test.js](src/score.test.js) | 3 | 2 | Formule de victoire et absence de points sans victoire. |
| [shoot.test.js](src/shoot.test.js) | 4 | 3 | Bon garde touché, tir manqué, deux impacts et arrêt des dégâts après sa mort. |
| [shooting.test.js](src/shooting.test.js) | 13 | 10 | Premier impact, murs, visée, transformations, objets ignorés et tir au contact. |
| [textures.test.js](src/textures.test.js) | 2 | 2 | Textures de secours utilisables et scène fidèle aux données du niveau. |
| [victory.test.js](src/victory.test.js) | 7 | 3 | Entrée dans la sortie, sortie manquée et priorité du coup fatal. |
| **Total** | **108** | **90** | |

## Quelques tests à lire pour commencer

1. **« avancer pendant une seconde déplace le joueur de trois mètres »** : mesure la vitesse, sans navigateur.
2. **« un tir atteint seulement l'ennemi identifié et le met en alerte »** : vérifie qu'un impact ne blesse pas tous les gardes.
3. **« la détection demande une vue dégagée et une distance de quatre mètres maximum »** : garde les cas à la limite, trop loin et derrière un mur.
4. **« les délais restent indépendants et diminuent aussi sans alerte »** : évite qu'une attaque remette le délai de tous les ennemis à zéro.
5. **« un coup fatal au moment d'entrer dans la sortie donne la défaite »** : fixe l'ordre entre combat et victoire.
6. **« une réponse API incomplète ou invalide produit une erreur compréhensible »** : protège l'affichage quand les données externes sont incorrectes.

Les tests de vitesse et de fréquence d'images se ressemblent, mais détectent des erreurs différentes : une mauvaise vitesse peut rester identique à 30 et 60 FPS ; une vitesse correcte à 60 FPS peut devenir fausse à 30 FPS. De même, le mur bloque une attaque, un tir ou un déplacement à des endroits différents du code.

## Scénarios navigateur

Ces quatre scripts ne font pas partie du nombre affiché par `npm test`.

| Script | Rôle conservé |
| --- | --- |
| [menus](tests/menus.playwright.js) | Accueil, pause/reprise, retour à l'accueil, Canvas redimensionné, tracé de tir et vraie sortie du premier niveau. |
| [guards](tests/guards.playwright.js) | Repos, approche réelle, poursuite, pause pendant la marche, attaque, deux tirs et arrêt des dégâts. |
| [campaign](tests/campaign.playwright.js) | Transitions, PV blessés conservés, formulaire final et vrai Rejouer du niveau 3 au niveau 1. Les sorties sont temporairement élargies pour atteindre rapidement les menus. |
| [player-stats](tests/player-stats.playwright.js) | Chargement, table, vide, erreurs, nouvel essai et largeur mobile, avec réponses API de test. |

Les pauses répétées au repos ont été retirées : la pause pendant une poursuite active est plus utile. Le redémarrage répété après le premier niveau a été retiré de `menus` ; `campaign` vérifie celui qui remet une campagne terminée au début avec les PV restaurés. L'attente fixe du redimensionnement est remplacée par une attente de la taille réellement obtenue.

## Vérification après nettoyage

- Les **90 tests Node passent**.
- Les trois scénarios navigateur modifiés (`menus`, `guards`, `campaign`) ont été relancés avec succès. La capture native de souris est simulée ; les tirs et le rendu sont réels.
- Cinq erreurs volontaires, introduites uniquement dans une copie temporaire du code, sont toujours détectées : seuil de détection incorrect, tirs après la fin, victoire malgré le coup fatal, position partagée entre parties et mauvais niveau utilisé par les déplacements.

Ces cinq sondes ciblent des risques précis ; elles ne constituent pas une analyse exhaustive de toutes les modifications possibles du code.

```sh
# Depuis frontend/
npm test
node --test src/shoot.test.js
node --test src/enemy.test.js
```

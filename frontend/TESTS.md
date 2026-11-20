# Comprendre les tests du front

Au sprint 7, les 18 fichiers de tests Node et les 4 scénarios navigateur ont été relus avec le code qu'ils vérifiaient. La suite était passée de **108 à 90 tests**. Le sprint 8 conserve ce nettoyage et ajoute des cas distincts pour les grandes cartes, les soins, les types d'ennemis, les projectiles et les placements reproductibles. Un nombre de tests compte les déclarations, pas chaque assertion ni chaque exemple dans une boucle.

Le TDD aide à construire les règles progressivement. Les tests intermédiaires méritent ensuite la même relecture que le code : garder les règles distinctes, retirer les répétitions et simplifier les préparations.

## Nettoyage du sprint 7 (historique)

- **Parcours répétés** : le test de campagne traversait déjà les trois cartes ; trois autres tests rejouaient exactement les mêmes trajets. Un seul parcours complet garde désormais aussi la vérification des gardes éliminés.
- **Faux tests de redémarrage** : des tests préparaient une partie perdue ou gagnée, puis appelaient simplement `newGame()` sans transmettre cet ancien état. Ils retestaient l'initialisation. Un test de création et d'isolement des parties reste dans `campaign.test.js` ; le vrai bouton Rejouer reste vérifié dans le navigateur.
- **Fin de partie** : une même règle « victoire ou défaite bloque les déplacements et les tirs » remplace les répétitions dans trois fichiers.
- **Tirs** : les cas cible devant/cible décalée existaient déjà dans le test des déplacements caméra/cible. Le mur devant la cible était testé deux fois. Les tests utilisent maintenant `castShot()`, appelé par le jeu, et un vrai tracé `Line` remplace l'ancienne grille de démonstration.
- **Rendu** : retrait des assertions qui imposaient le nombre exact d'objets Three.js, les dimensions internes des textures et tous les réglages visuels des matériaux. La correspondance entre le plan, les murs, la sortie et les gardes reste testée. Le chargement vérifie aussi que les bonnes images remplacent les textures de secours.
- **Trajets** : le chemin doit progresser sans traverser un mur. Le test n'impose plus un détour à droite quand un détour à gauche serait également correct. La régression au coin du mur reste couverte.
- **Petits exemples** : la formule du score garde ses exemples à 1, 2 et 3 PV dans un seul test. Les anciens exemples HTTP `/tasks/` et PATCH sont remplacés par `/scores/` et POST. Les réponses API invalides sont disposées ligne par ligne pour être lisibles.

Le test de collision avec le bloc central a simplement été déplacé de `victory.test.js` vers `game.test.js`, où il correspond au sujet du fichier. Les exemples de score et les deux sens de contournement sont rassemblés sans retirer leurs cas.

## Inventaire après le nettoyage du sprint 7 (historique)

Les chemins sont relatifs à ce dossier.

| Fichier | Avant | Après | Ce qu'il protège |
| --- | ---: | ---: | --- |
| [api.test.js](tests/unit/api.test.js) | 4 | 4 | Réponse vide, erreur HTTP, corps JSON, panne réseau. |
| [campaign.test.js](tests/unit/campaign.test.js) | 11 | 8 | Parties indépendantes, niveaux suivants, PV conservés, campagne complète, repos initial sur chaque carte. |
| [combat.test.js](tests/unit/combat.test.js) | 7 | 3 | Raccordement de la boucle au combat et blocage des commandes après la fin. |
| [enemy.test.js](tests/unit/enemy.test.js) | 13 | 13 | Détection, poursuite, attaques, délais indépendants, murs, morts et fréquence d'images. |
| [enemyAnimation.test.js](tests/unit/enemyAnimation.test.js) | 3 | 3 | Repos, alternance des pas et pose d'attaque. |
| [fullscreen.test.js](tests/unit/fullscreen.test.js) | 4 | 4 | Entrée, sortie, incompatibilité et refus du navigateur. |
| [game.test.js](tests/unit/game.test.js) | 9 | 10 | Déplacement, regard, diagonale, fréquence d'images, collisions et temps écoulé. |
| [input.test.js](tests/unit/input.test.js) | 4 | 4 | AZERTY, directions, raccourcis simultanés et touches libérées. |
| [level.test.js](tests/unit/level.test.js) | 7 | 6 | Géométrie, rayons, glissement, ligne de vue et limites de sortie. |
| [levelsLayout.test.js](tests/unit/levelsLayout.test.js) | 6 | 6 | Plans valides, deux passages à l'Entrée et trajets possibles des gardes sur chaque carte. |
| [path.test.js](tests/unit/path.test.js) | 6 | 4 | Trajet direct, contournement dans les deux sens, destination inaccessible et coin du mur. |
| [playerStats.test.js](tests/unit/playerStats.test.js) | 3 | 3 | Contrat API valide, absence de parties, moyenne décimale et réponses invalides. |
| [roomImages.test.js](tests/unit/roomImages.test.js) | 2 | 2 | Images chargées, textures indépendantes et arrivée après démontage. |
| [score.test.js](tests/unit/score.test.js) | 3 | 2 | Formule de victoire et absence de points sans victoire. |
| [shoot.test.js](tests/unit/shoot.test.js) | 4 | 3 | Bon garde touché, tir manqué, deux impacts et arrêt des dégâts après sa mort. |
| [shooting.test.js](tests/unit/shooting.test.js) | 13 | 10 | Premier impact, murs, visée, transformations, objets ignorés et tir au contact. |
| [textures.test.js](tests/unit/textures.test.js) | 2 | 2 | Textures de secours utilisables et scène fidèle aux données du niveau. |
| [victory.test.js](tests/unit/victory.test.js) | 7 | 3 | Entrée dans la sortie, sortie manquée et priorité du coup fatal. |
| **Total** | **108** | **90** | |

## Tests du sprint 8 : règles distinctes

Les tests de déplacement et de combat utilisent [arena.js](tests/fixtures/arena.js), une petite géométrie fixe. Les cartes jouables peuvent ainsi changer de taille ou de disposition sans casser un test qui mesure simplement une vitesse ou une collision.

| Fichiers | Ce que les nouveaux cas vérifient |
| --- | --- |
| [game](tests/unit/game.test.js), [input](tests/unit/input.test.js), [level](tests/unit/level.test.js) | Marche à 8 m/s, course à 12 avec Maj, diagonale normalisée, collisions en petits pas et soins utilisables une seule fois. |
| [mission](tests/unit/mission.test.js) | Une même graine reproduit les placements, une autre les change ; les emplacements restent praticables et la graine 31 ne superpose plus deux ennemis. Les rayons viennent du catalogue des types. |
| [enemy](tests/unit/enemy.test.js), [projectiles](tests/unit/projectiles.test.js) | Types d'ennemis, poursuite, attaques au contact et projectiles qui rencontrent le joueur ou un mur. |
| [shoot](tests/unit/shoot.test.js), [score](tests/unit/score.test.js) | Élimination et points attribués une seule fois, bonus de secteur et de victoire, points conservés après défaite. |
| [levelsLayout](tests/unit/levelsLayout.test.js) | Grandes tailles, placements valides et calmes au départ, deux routes par carte et accessibilité des gardes, soins et sas. |
| [campaign](tests/unit/campaign.test.js) | Une partie seedée indépendante de ses données, transitions conservant graine/PV/points, puis un seul parcours complet des trois secteurs. |

Le test de campagne utilise une visée parfaite et autant d'impacts que les PV du garde visible ; il vérifie le déplacement réel et les murs, sans représenter la difficulté d'un joueur humain. Les tests unitaires des projectiles restent nécessaires : cette visée parfaite élimine souvent une sentinelle avant qu'elle puisse tirer.

## Quelques tests à lire pour commencer

1. **« avancer pendant une seconde déplace le joueur de huit mètres »** : mesure la vitesse, sans navigateur.
2. **« un tir atteint seulement l'ennemi identifié et le met en alerte »** : vérifie qu'un impact ne blesse pas tous les gardes.
3. Le test de **détection dans `enemy.test.js`** : garde les cas à portée, trop loin et derrière un mur selon le type d'ennemi.
4. Le test des **délais d'attaque indépendants** : évite qu'une attaque remette le délai de tous les ennemis à zéro.
5. **« un coup fatal au moment d'entrer dans la sortie donne la défaite »** : fixe l'ordre entre combat et victoire.
6. **« une réponse API incomplète ou invalide produit une erreur compréhensible »** : protège l'affichage quand les données externes sont incorrectes.

Les tests de vitesse et de fréquence d'images se ressemblent, mais détectent des erreurs différentes : une mauvaise vitesse peut rester identique à 30 et 60 FPS ; une vitesse correcte à 60 FPS peut devenir fausse à 30 FPS. De même, le mur bloque une attaque, un tir ou un déplacement à des endroits différents du code.

## Scénarios navigateur

Ces quatre scripts ne font pas partie du nombre affiché par `npm test`.

| Script | Ce qu'il vérifie |
| --- | --- |
| [menus](tests/browser/menus.playwright.js) | Vrai trajet du secteur de 64 m, comparaison marche/course, graine de l'URL, redémarrage, plan M, tracé de tir, pause/reprise et Canvas redimensionné. |
| [guards](tests/browser/guards.playwright.js) | Arène contrôlée de 40 m avec les vrais placements seedés : repos, poursuite, pause, attaque, deux impacts, 100 points et soin. Second essai avec sentinelle : projectile esquivé, tir maintenu et 250 points. |
| [campaign](tests/browser/campaign.playwright.js) | Transitions vers les vraies cartes de 80 et 96 m, 2 PV conservés, 2700 points sans élimination, formulaire final et Rejouer. Une arène contrôlée permet d'obtenir la blessure ; les sorties sont temporairement élargies pour atteindre les menus. |
| [player-stats](tests/browser/player-stats.playwright.js) | Chargement, table, vide, erreurs, nouvel essai et largeur mobile, avec réponses API de test. |

La capture native de la souris est simulée ; la scène, les commandes, les tirs et les règles sont exécutés. Les scripts de jeu bloquent les POST de scores et ne polluent pas le classement. Ces scénarios ne remplacent pas un essai humain pour régler la difficulté. `menus` vérifie le redémarrage d'une même mission ; `campaign` vérifie le retour d'une campagne terminée au niveau 1 avec 3 PV et zéro point. Le redimensionnement attend la taille réellement obtenue.

## Vérification du nettoyage du sprint 7 (historique)

- Les **90 tests Node passent**.
- Les trois scénarios navigateur modifiés (`menus`, `guards`, `campaign`) ont été relancés avec succès. La capture native de souris est simulée ; les tirs et le rendu sont réels.
- Cinq erreurs volontaires, introduites uniquement dans une copie temporaire du code, sont toujours détectées : seuil de détection incorrect, tirs après la fin, victoire malgré le coup fatal, position partagée entre parties et mauvais niveau utilisé par les déplacements.

Ces cinq sondes ciblent des risques précis ; elles ne constituent pas une analyse exhaustive de toutes les modifications possibles du code.

```sh
# Depuis frontend/
npm test
node --test tests/unit/shoot.test.js
node --test tests/unit/enemy.test.js
```

## Vérification du sprint 8

Les tests de grands plans ont été constatés en échec sur les anciennes cartes puis au vert sur les nouvelles. Les tests de campagne ont été adaptés aux placements seedés, aux PV de chaque type et à la conservation des points. La régression de chevauchement avec la graine 31 a aussi été ajoutée. Après intégration, les **104 tests Node passent**, ainsi que le **build Vite (52 modules)**. Les trois scénarios navigateur modifiés `menus`, `guards` et `campaign` passent avec les limites décrites ci-dessus ; le scénario de statistiques garde ses réponses API contrôlées.

Une revue indépendante a en complément vérifié **900 missions** (graines 0 à 299 sur trois cartes), sans chevauchement, placement dans un mur ni détection au départ, et **8100 points de passage valides**. Ce contrôle borné est distinct des 104 déclarations de tests ; il ne couvre pas toutes les graines possibles.

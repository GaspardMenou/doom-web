# Doom Web

Projet de FPS rétro inspiré du premier Doom : React pour l'interface, Three.js dans un Canvas pour le jeu, FastAPI + SQLAlchemy pour les scores. Le sprint 8 propose trois secteurs de 64, 80 et 96 mètres de côté, des déplacements rapides, quatre types d'ennemis et des rencontres dont le placement varie à chaque nouvelle campagne. Les PV sont conservés entre les niveaux ; le résultat peut être enregistré après la dernière sortie ou une défaite.

L'utilisateur a implémenté l'API des joueurs et de leurs statistiques. Le front utilise les routes de score et `GET /players/` pour afficher les résultats par pseudo ; le contrat est décrit dans `frontend/API_CONTRACT.md`.

## Première version convenue

- Solo sur ordinateur : explorer trois secteurs de 64, 80 puis 96 mètres et atteindre leurs sas d'extraction.
- Une arme, munitions illimitées, 3 PV maximum, des soins et 12, 18 puis 24 ennemis mêlant gardes, traqueurs, colosses et sentinelles.
- Marche à 8 m/s, course à 12 m/s avec Maj, plan en jeu avec M ; accueil, pause, niveaux suivants, victoire/défaite et classement.
- Statistiques par pseudo affichées à partir de la réponse réelle de l'API ; aucune donnée de démonstration injectée dans l'application.
- Développement en TDD et petits sprints. Pour chaque comportement : test en échec, code minimal, tests au vert, nettoyage et vérification dans le navigateur.
- Rendu prévu le 20 novembre 2026 après-midi.

## Socle fourni

Le backend fourni savait lire un classement vide. Le sprint 5 ajoute l'enregistrement et la relecture des scores dans SQLite. Les consignes de départ sont conservées ci-dessous avec les étapes réalisées.

## Lancer

Dans `backend/` : `uv sync --locked`, `uv run pytest -q` (22 tests), puis `uv run uvicorn scores:create_app --factory --reload --port 8001`.

Dans `frontend/` : `npm ci`, `npm test`, puis `npm run dev`. Ouvrir `http://127.0.0.1:5175`. Chaque terminal reste dans son dossier. L'[inventaire des tests](frontend/TESTS.md) explique leur rôle et les simplifications effectuées.

Les sections des sprints 1 à 7 ci-dessous conservent l'historique pédagogique et les validations de chaque étape. La pièce de 10 m, le cube unique, `targetHealth` et `shoot(state, true)` appartiennent à ces anciennes versions. Les tests ont depuis été adaptés ; pour comprendre le fonctionnement actuel, commencer par le sprint 8.

## Organisation du frontend

`frontend/src/main.jsx` reste le point d'entrée, avec `style.css` pour les styles communs. Les scripts sont regroupés par rôle :

- `src/game/` : règles du jeu, ennemis, collisions, missions, projectiles et score ; `src/game/levels/` contient les cartes.
- `src/engine/` : scène Three.js, rendu, textures, tirs, clavier et plein écran.
- `src/components/` : composants React du HUD, du plan, du formulaire et des statistiques.
- `src/api/` : client HTTP et validation des statistiques reçues.
- `tests/unit/`, `tests/browser/` et `tests/fixtures/` : tests Node, scénarios navigateur et données de test communes.

Les chemins ci-dessus sont relatifs à `frontend/`. `npm test` lance tous les tests unitaires ; les scénarios navigateur restent séparés.

## Sprint 1 : comprendre dans l'ordre (historique)

1. `frontend/tests/unit/game.test.js` : commencer par le premier test, « avancer pendant une seconde déplace le joueur de trois mètres ». Il vérifie une règle sans navigateur ni Three.js.
2. `frontend/src/game/game.js` : `newGame()` place le joueur ; `advance()` calcule sa prochaine position. `x` représente gauche/droite, `z` avant/arrière. La vitesse est multipliée par le temps écoulé, pas par le nombre d'images.
3. Les tests suivants ajoutaient les directions, le regard, la diagonale et les murs. Au sprint 1, la pièce mesurait 10 mètres ; avec un rayon de 0,25 mètre, le joueur restait entre -4,75 et +4,75. Les dimensions viennent maintenant du niveau courant ; les collisions sont dans `level.js`.
4. `frontend/src/engine/input.js` et `input.test.js` : les touches physiques WASD correspondent à ZQSD sur AZERTY ; les flèches fonctionnent aussi. Une perte de focus remet les touches à zéro.
5. `frontend/src/engine/room.js` : le sol quadrillé et les murs colorés, puis la cloison et la sortie ajoutées au sprint 4. `canvas.js` branche la caméra, `PointerLockControls`, les commandes et la boucle d'affichage. Les règles de déplacement restent dans `game.js`.
6. `frontend/src/main.jsx` : React monte le jeu dans le Canvas et affiche les boutons. Les positions ne passent pas par un état React à chaque image.

Pour ne lancer que le premier test depuis `frontend/` :

```sh
node --test --test-name-pattern='avancer pendant' tests/unit/game.test.js
```

Les tests ont été écrits en échec avant les règles correspondantes. Ils remplacent ceux de l'ancien jeu 2D ; les tests du client API sont conservés. Pour essayer : cliquer sur **Entrer dans la pièce**, marcher avec ZQSD/WASD ou les flèches, regarder avec la souris, puis appuyer sur Échap pour mettre en pause. **Revenir au centre** réinitialise la position et le regard.

Vérification du sprint : les 17 tests et le build passent, la pièce WebGL s'affiche. L'utilisateur a confirmé dans son navigateur que la souris contrôle le regard et que ZQSD permet de marcher. Cette validation est manuelle ; les tests automatisés couvrent les règles de déplacement, les collisions et les entrées clavier.

## Sprint 2 : tirer sur une cible (historique)

- Entrer dans la pièce, viser le cube rouge au centre de l'écran, puis tirer au clic gauche ou avec Espace. Un appui donne un tir, sans limite de munitions. Le clic d'entrée capture seulement la souris.
- La cible commence avec 2 points de vie : elle devient orange après un impact, puis disparaît au second. Un tir manqué ne lui enlève pas de vie ; les murs arrêtent les tirs.
- Échap et Pause bloquent les tirs. Recommencer restaure la position, le regard et la cible rouge à 2 points de vie. La cible d'entraînement reste traversable.

Au sprint 2, le premier test de `frontend/tests/unit/shoot.test.js` appelait `shoot(newGame(), true)` pour enlever un point de vie sans modifier l'état précédent. Depuis le sprint 7, `shoot(state, enemyId)` reçoit l'identifiant du garde touché, car plusieurs gardes sont présents.

`frontend/tests/unit/shooting.test.js` teste ensuite la visée avec de vraies géométries Three.js, sans navigateur. `hitsTarget()` dans `shooting.js` lance un rayon depuis le centre de la caméra et prend uniquement le premier impact visible : un mur situé avant la cible bloque le tir. `canvas.js` relie ce résultat aux clics, aux dégâts et à l'affichage.

```sh
node --test tests/unit/shoot.test.js
```

Les tests de dégâts et de visée ont été lancés en échec avant leur implémentation. Vérification du sprint : 30 tests au vert et build validé ; contrôle navigateur du clic d'entrée, des dégâts, de la destruction, du reset, des tirs manqués et de la pause. Pour ce contrôle automatisé, seule la capture native de la souris est simulée ; la scène Three.js, les tirs et les règles de jeu sont réels. Les commandes souris/clavier natives avaient été confirmées par l'utilisateur au sprint 1.

## Sprint 3 : poursuite, attaques et défaite (historique)

Le cube rouge du sprint 2 devient l'ennemi. Dans cet état historique, il garde 2 PV et `targetHealth` désigne sa vie. Depuis le sprint 7, chaque garde possède sa propre propriété `health` dans `state.enemies`. Le joueur commence avec 3 PV, affichés avec une barre de vie.

- L'ennemi poursuit le joueur à 1 mètre par seconde et s'arrête à 1 mètre de lui.
- À portée, il retire 1 PV, puis attend une seconde avant la prochaine attaque. S'éloigner permet d'éviter ses coups ; Pause fige aussi le combat.
- À 0 PV, le joueur perd : la souris est libérée, « Défaite » reste affiché et les déplacements, les tirs et la reprise sont bloqués.
- Deux impacts tuent l'ennemi : il disparaît, cesse de poursuivre et d'attaquer. Le joueur peut continuer à explorer ; la sortie et la victoire viendront au sprint 4.
- Recommencer restaure les positions, le regard, les vies et le délai d'attaque.

Pour comprendre, lire `frontend/tests/unit/enemy.test.js` dans l'ordre : poursuite, arrêt à portée, attaque, délai entre les coups, puis défaite. `advanceEnemy()` dans `enemy.js` contient ces règles sans Three.js. `game.js` l'appelle après le mouvement du joueur ; `combat.test.js` vérifie ce raccordement, le blocage après défaite et le reset.

```sh
node --test tests/unit/enemy.test.js
node --test tests/unit/combat.test.js
```

Les tests ont été observés en échec avant l'implémentation, puis les 47 tests et le build sont passés au vert. Le contrôle navigateur couvre la poursuite visible, la pause, les trois attaques jusqu'à la défaite, le blocage après défaite, le reset complet et l'arrêt des dégâts après la mort de l'ennemi. Seule la capture native de la souris est simulée pendant ce contrôle automatisé. L'utilisateur a également confirmé dans son navigateur que le combat, la défaite, le redémarrage et les deux tirs pour tuer l'ennemi fonctionnent.

Au sprint 3, la poursuite était directe. Le sprint 4 adapte le trajet aux obstacles intérieurs. Le contact reste non solide : le joueur peut traverser le cube.

## Sprint 4 : explorer et atteindre la sortie (historique)

Au sprint 4, le niveau était une pièce de 10 m, divisée par une cloison avec un passage à droite. La sortie était le carré vert au sol, dans la partie gauche de la seconde zone. Le joueur et l'ennemi gardaient leurs positions et leurs vies du sprint 3. Ce plan a été remplacé au sprint 7.

1. **Le mur bloque, le passage laisse passer.** Lire le premier test de `frontend/tests/unit/level.test.js`, puis `canStand()` dans `level.js`. Les mêmes coordonnées servent à dessiner le mur et à tester les collisions. `moveInLevel()` essaie séparément les deux axes pour permettre de longer un mur.
2. **Entrer vivant dans la sortie fait gagner.** Commencer par le premier test de `frontend/tests/unit/victory.test.js` : le joueur a 1 PV, l'ennemi est vivant, un petit pas le fait entrer dans le carré. `atExit()` vérifie la position ; à la fin de `advance()`, `game.js` passe à `status: 'won'` si le joueur a survécu. Un coup fatal pendant ce même pas donne la défaite.
3. **L'ennemi contourne la cloison.** `path.test.js` puis `path.js` ajoutent une petite recherche en largeur : des cases voisines sont essayées jusqu'à trouver un chemin. `enemy.test.js` vérifie le détour dans les deux sens, les coins et les attaques bloquées par le mur. Ce morceau est plus avancé ; il peut se lire après les deux premières étapes.
4. **La victoire termine la partie.** `canvas.js` affiche le résultat et libère la souris. Les déplacements, les tirs et la reprise restent bloqués jusqu'à Recommencer, qui rétablit le niveau, les vies et le regard.

Pour commencer par une seule règle depuis `frontend/` :

```sh
node --test --test-name-pattern='entrer vivant' tests/unit/victory.test.js
```

Puis lancer `node --test tests/unit/level.test.js tests/unit/victory.test.js`, et enfin `npm test`.

Les tests du niveau et de la victoire ont été observés en échec avant leur implémentation. Les tests de trajet ont aussi révélé un blocage au coin de la cloison, corrigé avant intégration. Vérification : 71 tests au vert et build validé ; le contrôle navigateur couvre le tir bloqué par la cloison, le trajet complet sans tuer l'ennemi, la victoire avec 3 PV, la libération de la souris, le blocage après victoire et le redémarrage. Seule la capture native de la souris est simulée pour ce contrôle automatisé. L'utilisateur a également confirmé dans son navigateur que la victoire après le passage à droite et le redémarrage fonctionnent.

Limites de ce sprint : niveau fixe, trajet ennemi sur une grille d'un mètre, un seul ennemi et contact non solide. Pas encore de sauvegarde de résultat ; elle vient dans le sprint consacré au backend.

## Sprint 5 : enregistrer son résultat (historique)

Après une victoire ou une défaite, le joueur peut saisir un pseudo et enregistrer son score. Le Top 10 se recharge après l'enregistrement. Recharger la page ou redémarrer le backend conserve les résultats dans SQLite.

1. **Calculer les points.** Commencer par le premier test de `frontend/tests/unit/score.test.js`, puis les trois lignes de `score.js`. Une victoire rapporte 60 points + 10 par PV restant : 70, 80 ou 90 points. Une défaite vaut 0. La limite existante de l'API, de 0 à 90, reste inchangée.
2. **Envoyer et relire un score.** Dans `backend/tests/test_scores.py`, lire `test_post_score_then_read_leaderboard`. Il envoie un pseudo et 80 points, attend une réponse 201, puis relit le classement. La route POST dans `backend/scores/__init__.py` crée un `Score`, l'ajoute à la session, valide l'écriture avec `commit()`, recharge les champs générés avec `refresh()`, puis renvoie le résultat.
3. **Refuser les données invalides.** `ScoreCreate` conserve la validation fournie : pseudo nettoyé de 1 à 24 caractères, points entiers de 0 à 90 et aucun champ supplémentaire. Les tests vérifient qu'un rejet 422 n'écrit rien, les valeurs limites, le Top 10 trié par points décroissants puis ancienneté, et la persistance après recréation de l'application.
4. **Brancher le formulaire.** `frontend/src/components/ScoreForm.jsx` contient le pseudo, l'envoi et les états en cours/enregistré/erreur. `jsonBody()` de `api.js` prépare le POST. Le verrou `locked.current` est posé avant l'envoi pour bloquer deux soumissions simultanées. Une erreur conserve le pseudo et permet de réessayer ; un succès termine l'envoi pour cette partie.
5. **Actualiser le classement.** `main.jsx` affiche le formulaire seulement à la fin, puis relit le Top 10 après un succès. Un échec de cette lecture affiche une erreur tout en conservant « Score enregistré ». Une nouvelle lecture annule la précédente pour empêcher un ancien classement de remplacer le plus récent. Recommencer retire le formulaire ; celui de la partie suivante commence à zéro.

Pour lire un premier test à la fois :

```sh
# Depuis frontend/
node --test --test-name-pattern='une victoire rapporte' tests/unit/score.test.js
# Depuis backend/
uv run pytest -q tests/test_scores.py::test_post_score_then_read_leaderboard
```

Le test POST a échoué avec 405 avant l'ajout de la route. Le test du calcul a échoué avant la création de `score.js`, et le contrôle navigateur a constaté l'absence du champ Pseudo après une victoire avant l'ajout du formulaire. Vérification : 74 tests front, 21 tests back et build validés. Le contrôle navigateur utilise une base temporaire isolée et couvre victoire à 90 points, défaite à 0, pseudo blanc, double soumission, erreur puis nouvel essai, échec de lecture après sauvegarde, redémarrage pendant un POST et formulaire neuf à la partie suivante. La capture de la souris et les erreurs HTTP sont simulées ; les sauvegardes réussies utilisent le vrai backend. Le formulaire a été vérifié sur ordinateur et écran de 390 px, sans débordement. L'utilisateur a confirmé l'enregistrement et la relecture du classement après rechargement de la page.

Limites : classement de démonstration sans comptes, avec scores déclarés par le client. Si le serveur enregistre un POST mais que sa réponse réseau est perdue, un nouvel essai peut créer un doublon ; une clé d'idempotence sera nécessaire pour garantir l'unicité dans ce cas.

## Sprint 6 : accueil, menus et ambiance FPS rétro (historique)

L'accueil présente la mission, le plan réel du niveau, les commandes et le classement. **Jouer** lance une nouvelle partie et capture la souris. Le Canvas occupe toute la fenêtre, avec un HUD pour la vie, l'arme, les munitions et l'ennemi. Le bouton **Plein écran** demande aussi le mode natif du navigateur ; s'il est refusé, une erreur explique que la partie reste jouable dans la fenêtre.

- **Échap / Pause** fige les déplacements, le combat et le tracé du tir. **Reprendre** garde la position et les PV.
- **Recommencer**, en pause, remet la partie à zéro puis reprend. Après victoire ou défaite, le même parcours s'appelle **Rejouer**.
- **Retour à l'accueil** met le jeu en pause et retire le formulaire de résultat. Le prochain **Jouer** repart avec 3 PV et un ennemi neuf.
- Le classement et la sauvegarde du sprint 5 restent disponibles ; les règles et les routes de score sont conservées.

La refonte demandée utilise ui-ux-pro-max, design-taste-frontend et Impeccable : acier olive, rouge braise, titres Barlow Condensed, texte Barlow, menus carrés et HUD de FPS des années 90. Les fontes et leurs licences sont dans `frontend/public/fonts/`, sans chargement distant à l'exécution. `PRODUCT.md`, `DESIGN.md` et `.impeccable/surfaces/frontend-src-main-jsx.md` conservent les décisions pour les prochains sprints.

Pour comprendre dans l'ordre :

1. **Accueil ou partie.** Dans `main.jsx`, le booléen `home` choisit l'écran. `goHome()` appelle d'abord `pause()`. `start()` remet le jeu à zéro et rend le Canvas visible avant d'appeler `resume()` ; `flushSync()` force ce petit changement d'affichage à se terminer pendant le clic utilisateur, avant le focus et la capture de souris.
2. **Plein écran.** Lire le premier test de `frontend/tests/unit/fullscreen.test.js`, puis les cinq lignes de `fullscreen.js`. La fonction demande le plein écran sur l'élément du jeu ou le quitte s'il est actif. Le composant affiche l'erreur et garde la partie accessible si le navigateur refuse.
3. **Canvas à la bonne taille.** Dans `canvas.js`, `ResizeObserver` observe la zone de jeu. `resize()` adapte le rendu et le rapport largeur/hauteur de la caméra. Le ratio de pixels est plafonné à 2 ; le nettoyage libère l'observer et les textures.
4. **Afficher le tir.** Les deux premiers tests de `shooting.test.js` vérifient le point du premier impact et l'absence d'impact dans le vide. `castShot()` renvoie ce résultat, `hitsTarget()` conserve sa réponse booléenne. `showShot()` dans `canvas.js` dessine une ligne lumineuse jusqu'à l'impact, puis la fait disparaître en 100 ms. Les dégâts restent immédiats et la ligne ne bloque pas les tirs suivants.
5. **Lire les visuels séparément.** `Hud.jsx` affiche les données déjà connues. `LevelMap.jsx` dessine le plan depuis les coordonnées du niveau. `textures.js` crée des textures industrielles déterministes, utilisées par `room.js`, sans changer les murs ni les collisions.

```sh
# Depuis frontend/
node --test tests/unit/fullscreen.test.js
node --test tests/unit/shooting.test.js tests/unit/textures.test.js
```

TDD : le contrôle navigateur a constaté l'absence de Jouer avant l'accueil ; les tests plein écran, impact et textures ont été observés en échec avant leur implémentation. À la fin du sprint 6, les 82 tests front et le build passaient. Le scénario `frontend/tests/browser/menus.playwright.js`, depuis adapté au sprint 7, est exécutable avec l'outil Playwright `browser_run_code_unsafe` et son argument `filename` ; il est distinct des tests Node lancés par `npm test`. Dans sa version du sprint 6, il couvrait accueil, pause avec joueur blessé et scène immobile, reprise sans reset, retour, nouvelle partie, victoire, formulaire, rejouer et redimensionnement. Le contrôle du tracé avait donné 0 pixel jaune avant, 381 pendant le tir, 0 après. Ce scénario simulait seulement la capture native de souris et n'écrivait aucun score de test.

L'utilisateur a confirmé dans son navigateur que le plein écran natif, les tirs et les menus fonctionnent. Le navigateur automatisé refuse le plein écran avec « not granted » : son message de repli est vérifié, tandis que le mode natif est validé manuellement. Les captures couvrent accueil et résultat en 1440 px et 390 px, ainsi que jeu et pause sur ordinateur.

Deux illustrations originales ont été générées avec l'outil natif imagegen : `public/art/sector-entry.webp` pour l'accueil et `public/art/pistol-view.png` pour l'arme. Leurs prompts exacts et provenances sont conservés à côté des images ; aucun asset original de Doom n'est utilisé. À cette étape, les textures du niveau étaient produites par le code et l'ennemi restait cubique. Le sprint 7 remplace les murs par des images et le cube par des gardes animés ; les tirs restent instantanés avec un effet visuel, sur ordinateur avec clavier et souris.

## Sprint 7 : trois secteurs, plusieurs gardes et statistiques par pseudo (historique)

Chaque secteur possède ses propres coordonnées, gardes et image de mur. Le plan de l'accueil utilise ces données : il dessine les murs, les gardes, le départ et la sortie, sans tracer une route artificielle.

| Secteur | Taille | Forme | Gardes |
| --- | --- | --- | --- |
| Entrée | 12 m | Dépôt avec bloc central contournable à gauche ou à droite et petits îlots | 3 |
| Maintenance | 14 m | Quatre pièces reliées par des ouvertures de 2 m | 4 |
| Réacteur | 16 m | Arène avec piliers et couvertures dispersées | 5 |

Les gardes commencent au repos. Chacun détecte le joueur à 4 m ou moins avec une ligne de vue dégagée ; un tir reçu le met aussi en alerte. Une fois alerté, il poursuit même après une perte de vue, contourne les murs et abandonne au-delà de 6 m. Sa vitesse reste de 1 m/s. À 1 m ou moins avec une vue dégagée, il enlève 1 PV puis attend une seconde ; les délais sont propres à chaque garde. Deux impacts éliminent uniquement le garde visé.

La première et la deuxième sortie affichent **Niveau terminé**, puis **Niveau suivant**. Les PV restants sont conservés, tandis que la position et les gardes du nouveau niveau sont réinitialisés. Il n'y a ni pseudo ni score envoyé entre les niveaux. La dernière sortie affiche **Victoire** et propose le score de la campagne : 60 + 10 par PV restant, soit 70 à 90 points. Une défaite propose 0 point. **Jouer**, **Recommencer** et **Rejouer** repartent au premier niveau avec 3 PV.

Pour comprendre par petites étapes :

1. **Lire un plan.** Commencer par le premier test de `frontend/tests/unit/levelsLayout.test.js`, puis ouvrir `src/game/levels/entry.js`, `maintenance.js` et `reactor.js`. Un niveau contient `size`, `spawn`, `enemies`, `walls`, `exit` et `wallTexture`. Les tests vérifient les emplacements libres, les deux passages de l'Entrée et les trajets avec le vrai BFS.
2. **Créer les gardes sans modifier le plan.** Le premier test de `campaign.test.js`, puis `newGame()` dans `game.js`, montrent la copie des données. `state.enemies` contient pour chaque garde son `id`, sa position, ses 2 PV, son délai, son alerte et son mode. Le test suivant explique `nextLevel()` et la conservation des PV.
3. **Détecter avant de poursuivre.** Lire le premier test de `enemy.test.js`, puis les constantes et le début d'`advanceEnemy()` dans `enemy.js`. Continuer avec le test de perte de vue : la détection à 4 m exige une vue libre, la poursuite mémorisée s'arrête seulement au-delà de 6 m. Les attaques et la défaite suivent les règles déjà apprises.
4. **Tirer sur le bon garde.** Le premier test de `shoot.test.js` appelle maintenant `shoot(state, enemy.id)`. Un identifiant inconnu ou `null` représente un tir manqué. `castShot()` garde le premier impact Three.js ; `canvas.js` récupère l'identifiant de ce garde avant d'appliquer les dégâts. Un mur bloque toujours le tir.
5. **Animer sans changer les dégâts.** `enemyAnimation.test.js`, puis les quelques lignes d'`enemyFrame()` dans `enemyAnimation.js`, sélectionnent une pose de repos, deux poses de marche alternées à six images par seconde et une pose d'attaque. `room.js` et `canvas.js` appliquent ces quatre poses au sprite orienté vers la caméra. Les textures de murs viennent de `public/art/walls/` et le garde de `public/art/enemy-guard-sheet.png` ; prompts et provenance accompagnent les assets.
6. **Afficher uniquement les données de l'API.** Lire le premier test de `playerStats.test.js`, puis `readPlayerStats()` dans `playerStats.js`. `PlayerStats.jsx` demande `GET /players/` lors de l'ouverture des statistiques et affiche pseudo, parties, total et moyenne. Chargement, réponse vide, erreur, réponse mal formée et nouvel essai sont prévus. Le front ne calcule pas ces agrégats et n'ajoute aucune route backend ; le format attendu est dans `frontend/API_CONTRACT.md`.
7. **Relier les écrans.** Dans `main.jsx`, `campaignWon` distingue la dernière victoire des sorties intermédiaires. Le formulaire est proposé après cette dernière victoire ou une défaite. `Hud.jsx` affiche le nom et le numéro du niveau ainsi que les gardes encore vivants ; le passage au niveau suivant recharge la scène dans `canvas.js`.

```sh
# Depuis frontend/, lire puis lancer une petite règle à la fois.
node --test --test-name-pattern='détection demande' tests/unit/enemy.test.js
node --test tests/unit/shoot.test.js tests/unit/enemyAnimation.test.js
node --test tests/unit/levelsLayout.test.js tests/unit/campaign.test.js
node --test tests/unit/playerStats.test.js
npm test
```

Validation initiale du sprint 7 : **108 tests Node front**, build et quatre scénarios navigateur ci-dessous réussis. La relecture demandée ensuite a ramené la suite à **90 tests**, en supprimant les doublons et en simplifiant les assertions ; les décisions sont détaillées dans [TESTS.md](frontend/TESTS.md). Un seul parcours de campagne traverse maintenant les trois cartes avec une visée parfaite contre les gardes visibles, sans tirer à travers les murs. Il vérifie les règles, les collisions, les transitions et les PV ; il ne mesure pas la difficulté pour un joueur humain.

Les scénarios navigateur se lancent séparément avec `browser_run_code_unsafe` et leur `filename` :

- `frontend/tests/browser/menus.playwright.js` : accueil, pause, reprise, taille du Canvas, tracé du tir et vrai trajet du premier niveau.
- `frontend/tests/browser/guards.playwright.js` : vrai déplacement vers un garde, détection, poursuite et animation visibles, dégâts au contact, deux tirs pour l'éliminer et arrêt de ses attaques.
- `frontend/tests/browser/campaign.playwright.js` : captures de chaque plan avant modification, perte réelle d'un PV au premier niveau, puis sorties temporairement élargies uniquement dans le navigateur pour vérifier les menus, les PV conservés, le formulaire final et Rejouer. Les sorties sont restaurées après chaque victoire et par rechargement ; ce scénario ne prétend pas parcourir réellement toute la campagne.
- `frontend/tests/browser/player-stats.playwright.js` : réponses de statistiques interceptées dans le navigateur pour vérifier le contrat et les états d'affichage, sans créer de données en base.

La capture native de souris est simulée dans les scénarios de jeu. Les vérifications navigateur sont distinctes de `npm test`, et les scénarios de campagne et de gardes bloquent les POST de scores. Les résultats de la CI correspondent au commit publié et restent à consulter séparément.

L'API des joueurs a ensuite été réalisée par l'utilisateur, par petites étapes : un pseudo unique identifie un `Player`, et chaque `Score` lui est associé par `player_id`. À chaque score, le backend crée ou réutilise le joueur puis actualise ses statistiques dans la même transaction. `ScoreRead` extrait le pseudo avec `AliasPath("player", "player")` : le front reçoit toujours `player` en texte, ainsi que le nouvel identifiant `player_id`.

Le test backend `test_second_score_updates_player_stats` envoie 80 puis 90 points pour Ada : un seul joueur est conservé, avec 170 points, 2 parties et une moyenne de 85. La suite backend compte désormais 22 tests. Les deux tables et leurs données sont stockées dans le même fichier SQLite.

Les six visuels raster livrés au sprint 7 ont leurs prompts exacts et leur provenance à côté des images :

| Usage | Image | Prompt et provenance |
| --- | --- | --- |
| Accueil | [sector-entry.webp](frontend/public/art/sector-entry.webp) | [Provenance](frontend/public/art/sector-entry.provenance.json) |
| Arme | [pistol-view.png](frontend/public/art/pistol-view.png) | [Prompt](frontend/public/art/pistol-view.prompt.json) |
| Garde, quatre poses | [enemy-guard-sheet.png](frontend/public/art/enemy-guard-sheet.png) | [Prompts et provenance](frontend/public/art/enemy-guard-sheet.png.json), référence de création incluse |
| Murs de l'Entrée | [entry.webp](frontend/public/art/walls/entry.webp) | [Provenance](frontend/public/art/walls/entry.provenance.json) |
| Murs de Maintenance | [maintenance.webp](frontend/public/art/walls/maintenance.webp) | [Provenance](frontend/public/art/walls/maintenance.provenance.json) |
| Murs du Réacteur | [reactor.webp](frontend/public/art/walls/reactor.webp) | [Provenance](frontend/public/art/walls/reactor.provenance.json) |

Limites au sprint 7 : les gardes n'avaient pas de collisions entre eux ni avec le joueur ; les sprites sont des billboards à quatre poses, pas des personnages 3D. Le trajet utilise une grille d'un mètre. Les tirs restent instantanés et le score est déclaré par le client.

## Sprint 8 : grands secteurs, course, rencontres variables et sas d'extraction

Les plans ne sont plus de petites salles agrandies : ils proposent de longues traversées, des bâtiments visitables, des allées, des boucles et plusieurs itinéraires vers la sortie.

| Secteur | Taille | Organisation | Ennemis | Soins |
| --- | --- | --- | ---: | ---: |
| Entrée | 64 × 64 m | Cour, dépôt ouest et entrepôt est à plusieurs accès | 12 | 4 |
| Maintenance | 80 × 80 m | Six grandes salles à quatre portes et des allées reliées | 18 | 6 |
| Réacteur | 96 × 96 m | Noyau central, anneaux de couvertures et piliers | 24 | 8 |

Le joueur marche à **8 m/s** et court à **12 m/s avec Maj**. La diagonale conserve la même vitesse. Les déplacements sont découpés en petits pas pour éviter de traverser une cloison fine ou un ennemi ; les acteurs vivants font obstacle. **M** permet de consulter le plan pendant la partie. Maintenir le clic gauche ou Espace tire toutes les 130 ms, sans limite de munitions. L'objectif est un sas d'extraction lumineux, avec une zone d'arrivée de 3 × 3 m.

Les placements des ennemis et des soins varient dans les zones du plan, jusqu'à 5 m autour des points prévus. Une graine entière conserve cet aléatoire : `newGame(0, 12345)` redonne les mêmes placements, et cette graine suit la campagne entre les niveaux. Dans le navigateur, `http://127.0.0.1:5175/?seed=12345` fixe la mission ; son numéro est affiché en pause. **Rejouer** et **Recommencer** gardent la graine, tandis que **Jouer** renouvelle la mission sauf si l'URL impose une graine. Les essais de placement refusent les murs et préservent une arrivée calme ; si aucun essai n'est valide, le point prévu dans le plan est conservé. Les murs et les routes principales sont écrits dans les fichiers de niveau, ce qui garde les secteurs reconnaissables.

| Type | PV | Vitesse | Comportement | Points |
| --- | ---: | ---: | --- | ---: |
| Garde | 2 | 2,2 m/s | Poursuite et attaque au contact | 100 |
| Traqueur | 1 | 5 m/s | Approche rapide, fragile | 150 |
| Colosse | 5 | 1,6 m/s | Lent, résistant, corps plus large | 400 |
| Sentinelle | 3 | 2,2 m/s | Garde sa distance et tire des projectiles esquivables | 250 |

La détection demande une ligne de vue dégagée. Les gardes et colosses repèrent à 14 m, les traqueurs à 16 m et les sentinelles à 22 m ; la poursuite mémorisée s'arrête respectivement au-delà de 28, 32 ou 36 m. Les délais d'attaque sont propres à chaque ennemi. Les projectiles des sentinelles peuvent être évités et les murs les arrêtent. Le contournement des murs utilise A* sur une grille d'un mètre ; la grille et ses passages déjà vérifiés sont partagés par les gardes.

Un soin rend **1 PV**, une seule fois. À pleine vie, il reste disponible ; une partie perdue ne peut pas être ressuscitée par un soin. Les PV, les éliminations, les points de combat et la graine sont conservés en passant au niveau suivant. Les ennemis et soins du nouveau secteur sont recréés ; ses projectiles commencent à vide.

Le score récompense les éliminations, même en cas de défaite, et ajoute **500 points par secteur franchi**. La victoire finale ajoute **1000 points + 100 par PV restant**. Le formulaire reste réservé à la fin de campagne ou à la défaite ; l'API accepte désormais les scores entiers de **0 à 100000**. Les routes et les statistiques par pseudo conservent leur fonctionnement.

Les deux images AMD64 ont été construites et vérifiées ensemble avec `scripts/smoke-containers.sh` : un score de 1250 points et ses statistiques sont enregistrés via `/api`, puis relus après recréation des conteneurs. Cette vérification utilise son propre volume temporaire.

Pour lire le code par petites étapes :

1. `levelsLayout.test.js` et `src/game/levels/` : taille, emplacements libres, deux routes par carte et accès de tous les ennemis, soins et sas. Les ennemis utilisent le catalogue `enemyTypes.js`.
2. `mission.test.js`, puis `mission.js` : une même graine reproduit les placements, une autre les renouvelle sans modifier les plans.
3. `game.test.js`, `input.test.js` et `level.test.js` : vitesse normale, Maj, diagonale, petits pas de collision et soins. La petite géométrie fixe de `tests/fixtures/arena.js` permet de tester ces règles indépendamment des cartes jouables.
4. `enemy.test.js` et `projectiles.test.js` : poursuite, distances, attaques indépendantes et projectiles qui rencontrent murs ou joueur.
5. `shoot.test.js` et `score.test.js` : un tir affecte le bon ennemi, une élimination rapporte une seule fois ses points, les sorties et PV donnent les bonus prévus.
6. `campaign.test.js` : un seul parcours traverse les trois grands secteurs avec leur géométrie réelle. Le test utilise une visée parfaite, tire autant de fois que les PV de chaque ennemi visible et ne tire jamais à travers les murs ; il ne mesure pas la difficulté pour un joueur humain.

```sh
# Depuis frontend/
node --test tests/unit/mission.test.js
node --test tests/unit/game.test.js tests/unit/projectiles.test.js
node --test tests/unit/levelsLayout.test.js tests/unit/campaign.test.js
npm test
```

Les six tests des grands plans ont été observés en échec avant leur remplacement, puis sont passés au vert. Le parcours de campagne et les tests de configuration ont été adaptés à la graine et aux types d'ennemis sans ajouter trois parcours redondants. Une régression de chevauchement trouvée avec la graine 31 protège aussi la redistribution des ennemis, avec les rayons du catalogue. Après intégration, **104 tests Node et 22 tests backend passent**, ainsi que le **build Vite (52 modules)**.

Les trois scénarios navigateur `menus`, `guards` et `campaign` passent :

- `menus` parcourt réellement le secteur de 64 m jusqu'au sas, compare marche et course, puis vérifie la graine, le plan M, le tracé de tir, la pause et le redimensionnement du Canvas.
- `guards` utilise une arène contrôlée de 40 m avec les vrais placements aléatoires : détection, marche, pause, attaque, élimination du garde pour 100 points et ramassage d'un soin. Un second essai vérifie l'esquive d'un projectile et le tir maintenu sur une sentinelle pour 250 points.
- `campaign` vérifie les transitions sur les vrais secteurs de 80 et 96 m, la conservation de 2 PV, les menus intermédiaires, les 2700 points de victoire sans élimination et Rejouer. Les sorties sont temporairement élargies pour ce test de transitions ; il ne parcourt pas toute la campagne dans le navigateur.

La capture native de la souris est simulée dans ces scénarios ; la scène, les commandes, les tirs et les règles du jeu sont exécutés. Ces résultats ne remplacent pas un essai humain pour régler la difficulté. Un contrôle indépendant supplémentaire a vérifié **900 missions** (graines 0 à 299 sur les trois cartes), sans chevauchement, placement dans un mur ni détection au départ, ainsi que **8100 points de passage valides**. Ces contrôles sont distincts du nombre de tests Node et ne prouvent pas tous les cas possibles d'aléatoire.

Les nouveaux sprites conservent quatre poses par feuille, avec leurs prompts et leur provenance :

| Usage | Image | Prompt et provenance |
| --- | --- | --- |
| Traqueur | [enemy-runner-sheet.png](frontend/public/art/enemy-runner-sheet.png) | [Métadonnées](frontend/public/art/enemy-runner-sheet.png.json) |
| Sentinelle | [enemy-gunner-sheet.png](frontend/public/art/enemy-gunner-sheet.png) | [Métadonnées](frontend/public/art/enemy-gunner-sheet.png.json) |

Limites : solo sur ordinateur, déplacements sur un seul étage, sprites orientés vers la caméra à quatre poses. Les tirs du joueur restent instantanés ; les sentinelles disposent de vrais projectiles simulés. Le classement conserve des scores déclarés par le client.

## Premier trajet complet

Ce parcours est réalisé au sprint 5 ; les étapes ci-dessous restent le guide de lecture du raccordement front/back.

1. Dans `backend/tests/test_scores.py`, écrire un test : POST un score, vérifier 201, puis GET et vérifier les données. Constater son échec.
2. Dans `backend/scores/__init__.py`, ajouter le POST en utilisant le schema et le modèle fournis. Faire passer le test, puis tester un score invalide sans écriture.
3. Dans `frontend/src/main.jsx`, ajouter le formulaire de pseudo après la fin, le POST, les états saving/saved/error puis la relecture du classement. `src/api/api.js` est fourni.
4. Redémarrer le backend et relire le score. Conserver un test de cette propriété.
5. Ajouter une modification personnelle limitée du jeu ou de la ressource ; adapter les tests et les limites du contrat si nécessaire.

Parcours commun : conserver le backend FastAPI + SQLAlchemy fourni. Le support séparé d’approfondissements propose ensuite l’option NestJS : utiliser le checkpoint `nest-01-memory` puis `nest-02-sqlite` comme support à la place du backend Python. Le frontend reçoit seulement une autre `VITE_API_URL`. Les comportements attendus restent les mêmes.

## Exactement deux markers Python

`backend/scores/__init__.py` contient le package applicatif. `backend/tests/__init__.py` est vide, à côté de `test_scores.py`. Il n'y a aucun marker dans `backend/`, `frontend/`, `instance/`, ni de second dossier `scores/` imbriqué. Les commandes Python sont lancées dans `backend/`, au niveau de `pyproject.toml`.

Le dossier `game-reference` montre un résultat complet. Vous pouvez le lire, mais devez expliquer et modifier ce que vous utilisez. Le brief et les attentes de présentation sont dans `assessments/02-game.md` du kit de cours.

## Images Docker et CI

La CI GitHub Actions lance les tests front et back, construit les deux images Linux AMD64, puis vérifie ensemble le front, le proxy `/api`, un POST de score suivi d'un GET, les statistiques du joueur associé, le rejet d'un score invalide, les redirections HTTPS et la persistance du score et des statistiques après recréation des conteneurs. Elle publie les images sur GHCR seulement si ces étapes passent, lors d'un push sur `main` ou d'un tag `v*`. Les pull requests vérifient les images sans les publier.

- `ghcr.io/gaspardmenou/doom-web-frontend:latest`
- `ghcr.io/gaspardmenou/doom-web-backend:latest`

`latest` suit `main`. Chaque publication reçoit aussi un tag `sha-<commit complet>` ; un tag Git comme `v0.1.0` produit le même tag pour les deux images. Le dépôt et les nouvelles images GHCR sont privés. Le workflow utilise automatiquement `GITHUB_TOKEN`, sans secret supplémentaire à configurer.

Pour construire et vérifier localement :

```sh
IMAGE_TAG=ci docker compose build
IMAGE_TAG=ci scripts/smoke-containers.sh
```

Le test utilise ses propres conteneurs et un volume temporaire, supprimés à la fin. Pour ouvrir le socle localement : `docker compose up -d --build --wait`, puis `http://127.0.0.1:8080`.

## Hébergement AMD64 derrière NPMplus

Sur le serveur Docker, copier `compose.yaml` dans un dossier dédié. NPMplus étant sur une autre machine, créer un fichier `.env` à côté du Compose, en remplaçant `IP_LAN_SERVEUR_DOCKER` par l'adresse LAN de ce serveur joignable depuis NPMplus :

```dotenv
FRONTEND_HOST=IP_LAN_SERVEUR_DOCKER
FRONTEND_PORT=8080
```

S'authentifier à GHCR avec un token GitHub **classic** ayant uniquement `read:packages` (à saisir au prompt du mot de passe), puis démarrer :

```sh
docker login ghcr.io -u GaspardMenou
docker compose pull
docker compose up -d --no-build --wait --force-recreate
```

Sans `FRONTEND_HOST`, le front reste publié uniquement sur `127.0.0.1:8080`. Avec l'adresse LAN configurée, autoriser l'accès au port `8080` depuis la machine NPMplus dans le pare-feu du serveur Docker. Le backend reste accessible sur le réseau Docker interne. La base est conservée dans le volume nommé `doom-web_scores` ; `docker compose down` le conserve. Ne pas utiliser `down --volumes` sur le serveur si les scores doivent être gardés. Sauvegarder ce volume avant une mise à jour du schéma de base.

Dans un **Proxy Host NPMplus**, sur l'autre machine :

- Domain Names : le domaine du jeu.
- Scheme : `http`.
- Forward Hostname / IP : l'adresse LAN du serveur Docker renseignée dans `FRONTEND_HOST`.
- Forward Port : `8080` (ou la valeur de `FRONTEND_PORT`).
- Configurer le certificat du domaine et activer Force SSL.

Le même domaine sert le jeu et `/api/` : aucune Custom Location ni sous-domaine API n'est nécessaire. Le front utilise `/api` fixé au build ; `VITE_API_URL` dans les variables d'un conteneur déjà construit ne modifie pas cette URL.

Si NPMplus est déplacé sur le même serveur en `network_mode: host`, laisser `FRONTEND_HOST=127.0.0.1` et cibler `127.0.0.1:8080`. Sur ce même serveur avec un réseau bridge, l'attacher durablement au réseau externe `doom-web_default` dans son propre Compose, puis cibler `doom-web-frontend:8080`. Ce partage de réseau Docker ne s'applique pas à deux machines distinctes.

Pour mettre à jour, répéter `docker compose pull` puis `docker compose up -d --no-build --wait --force-recreate`. Pour fixer une version ou revenir à une version précédente, définir `IMAGE_TAG=v0.1.0` ou `IMAGE_TAG=sha-<commit complet>` dans le fichier `.env` local, puis relancer ces commandes ; les deux services utilisent le même tag. La CI publie les images, le déploiement sur le serveur reste manuel.

## Initialiser la base dans Docker

Exécuter les commandes depuis le dossier du même `compose.yaml` et avec le même `.env` que le déploiement, après connexion à GHCR.

Sur une base neuve, le fichier SQLite et les tables `player` et `score` sont créés automatiquement au démarrage du backend par `create_app()`. Pour les initialiser, démarrer le backend suffit :

```sh
docker compose pull backend
docker compose up -d --no-build --wait backend
```

Pour créer la base et les tables manquantes **sans démarrer l'API**, cette commande utilise le même volume :

```sh
docker compose run --rm --no-deps backend /app/.venv/bin/python -c \
  "from scores import create_app; app = create_app(); app.state.engine.dispose(); print('Base initialisée.')"
```

`--rm` supprime le conteneur temporaire après la commande ; le volume de base de données est conservé. Une nouvelle exécution conserve les scores existants. Le fichier se trouve dans `/app/instance/scores.sqlite`, stocké dans le volume `doom-web_scores` avec le nom de projet par défaut. Cette initialisation crée les tables manquantes ; elle ne modifie pas le schéma des tables existantes.

Une base de l'ancienne version, où `score.player` était du texte, doit être migrée pour conserver les données, ou réinitialisée si leur perte est explicitement acceptée. Aucun reset n'est automatique. Supprimer le dossier local `backend/instance` ne vide pas le volume SQLite d'un serveur Docker : ce sont deux stockages distincts.

Une fois le backend démarré, vérifier son état et lire le classement :

```sh
docker compose ps backend
docker compose exec backend /app/.venv/bin/python -c \
  "from urllib.request import urlopen; print(urlopen('http://127.0.0.1:8001/scores/').read().decode())"
```

Une base vide renvoie `[]` ; sinon, les scores déjà présents sont affichés. Cette vérification utilise l'API interne au conteneur, sans passer par NPMplus.

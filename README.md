# Doom Web

Projet de FPS rétro inspiré du premier Doom : React pour l'interface, Three.js dans un Canvas pour le jeu, FastAPI + SQLAlchemy pour les scores. Les six premiers sprints permettent d'explorer un petit niveau 3D, tirer, survivre à un ennemi, atteindre la sortie et enregistrer son résultat, avec un accueil, des menus et un habillage FPS rétro en plein écran.

## Première version convenue

- Solo sur ordinateur, petit niveau à explorer : survivre et atteindre la sortie.
- Une arme, munitions illimitées, un type d'ennemi et une barre de vie.
- Accueil, commandes, pause, victoire/défaite, nouvelle partie et classement.
- Développement en TDD et petits sprints : déplacement, tir, combat, niveau, parcours complet, enregistrement des résultats. Pour chaque comportement : test en échec, code minimal, tests au vert, nettoyage et vérification dans le navigateur.
- Rendu prévu le 20 novembre 2026 après-midi.

## Socle fourni

Le backend fourni savait lire un classement vide. Le sprint 5 ajoute l'enregistrement et la relecture des scores dans SQLite. Les consignes de départ sont conservées ci-dessous avec les étapes réalisées.

## Lancer

Dans `backend/` : `uv sync --locked`, `uv run pytest -q` (21 tests), puis `uv run uvicorn scores:create_app --factory --reload --port 8001`.

Dans `frontend/` : `npm ci`, `npm test` (82 tests), puis `npm run dev`. Ouvrir `http://127.0.0.1:5175`. Chaque terminal reste dans son dossier.

## Sprint 1 : comprendre dans l'ordre

1. `frontend/src/game.test.js` : commencer par le premier test, « avancer pendant une seconde déplace le joueur de trois mètres ». Il vérifie une règle sans navigateur ni Three.js.
2. `frontend/src/game.js` : `newGame()` place le joueur ; `advance()` calcule sa prochaine position. `x` représente gauche/droite, `z` avant/arrière. La vitesse est multipliée par le temps écoulé, pas par le nombre d'images.
3. Les tests suivants ajoutent les directions, le regard, la diagonale et les murs. La pièce mesure 10 mètres ; le rayon du joueur vaut 0,25 mètre. Ses coordonnées restent donc entre -4,75 et +4,75. Depuis le sprint 4, le premier test démarre dans le passage libre à `x = 3.5` pour mesurer la vitesse sans rencontrer la cloison ; les collisions sont dans `level.js`.
4. `frontend/src/input.js` et `input.test.js` : les touches physiques WASD correspondent à ZQSD sur AZERTY ; les flèches fonctionnent aussi. Une perte de focus remet les touches à zéro.
5. `frontend/src/room.js` : le sol quadrillé et les murs colorés, puis la cloison et la sortie ajoutées au sprint 4. `canvas.js` branche la caméra, `PointerLockControls`, les commandes et la boucle d'affichage. Les règles de déplacement restent dans `game.js`.
6. `frontend/src/main.jsx` : React monte le jeu dans le Canvas et affiche les boutons. Les positions ne passent pas par un état React à chaque image.

Pour ne lancer que le premier test depuis `frontend/` :

```sh
node --test --test-name-pattern='avancer pendant' src/game.test.js
```

Les tests ont été écrits en échec avant les règles correspondantes. Ils remplacent ceux de l'ancien jeu 2D ; les tests du client API sont conservés. Pour essayer : cliquer sur **Entrer dans la pièce**, marcher avec ZQSD/WASD ou les flèches, regarder avec la souris, puis appuyer sur Échap pour mettre en pause. **Revenir au centre** réinitialise la position et le regard.

Vérification du sprint : les 17 tests et le build passent, la pièce WebGL s'affiche. L'utilisateur a confirmé dans son navigateur que la souris contrôle le regard et que ZQSD permet de marcher. Cette validation est manuelle ; les tests automatisés couvrent les règles de déplacement, les collisions et les entrées clavier.

## Sprint 2 : tirer sur une cible

- Entrer dans la pièce, viser le cube rouge au centre de l'écran, puis tirer au clic gauche ou avec Espace. Un appui donne un tir, sans limite de munitions. Le clic d'entrée capture seulement la souris.
- La cible commence avec 2 points de vie : elle devient orange après un impact, puis disparaît au second. Un tir manqué ne lui enlève pas de vie ; les murs arrêtent les tirs.
- Échap et Pause bloquent les tirs. Recommencer restaure la position, le regard et la cible rouge à 2 points de vie. La cible d'entraînement reste traversable.

Pour comprendre, commencer par `frontend/src/shoot.test.js` : `shoot(newGame(), true)` doit laisser un seul point de vie, sans modifier l'état précédent. La fonction `shoot()` de `game.js` ne fait que mettre à jour cette vie.

`frontend/src/shooting.test.js` teste ensuite la visée avec de vraies géométries Three.js, sans navigateur. `hitsTarget()` dans `shooting.js` lance un rayon depuis le centre de la caméra et prend uniquement le premier impact visible : un mur situé avant la cible bloque le tir. `canvas.js` relie ce résultat aux clics, aux dégâts et à l'affichage.

```sh
node --test src/shoot.test.js
```

Les tests de dégâts et de visée ont été lancés en échec avant leur implémentation. Vérification du sprint : 30 tests au vert et build validé ; contrôle navigateur du clic d'entrée, des dégâts, de la destruction, du reset, des tirs manqués et de la pause. Pour ce contrôle automatisé, seule la capture native de la souris est simulée ; la scène Three.js, les tirs et les règles de jeu sont réels. Les commandes souris/clavier natives avaient été confirmées par l'utilisateur au sprint 1.

## Sprint 3 : poursuite, attaques et défaite

Le cube rouge du sprint 2 devient l'ennemi. On garde ses 2 PV et les fonctions de tir déjà testées ; `targetHealth` désigne toujours sa vie. Le joueur commence avec 3 PV, affichés avec une barre de vie.

- L'ennemi poursuit le joueur à 1 mètre par seconde et s'arrête à 1 mètre de lui.
- À portée, il retire 1 PV, puis attend une seconde avant la prochaine attaque. S'éloigner permet d'éviter ses coups ; Pause fige aussi le combat.
- À 0 PV, le joueur perd : la souris est libérée, « Défaite » reste affiché et les déplacements, les tirs et la reprise sont bloqués.
- Deux impacts tuent l'ennemi : il disparaît, cesse de poursuivre et d'attaquer. Le joueur peut continuer à explorer ; la sortie et la victoire viendront au sprint 4.
- Recommencer restaure les positions, le regard, les vies et le délai d'attaque.

Pour comprendre, lire `frontend/src/enemy.test.js` dans l'ordre : poursuite, arrêt à portée, attaque, délai entre les coups, puis défaite. `advanceEnemy()` dans `enemy.js` contient ces règles sans Three.js. `game.js` l'appelle après le mouvement du joueur ; `combat.test.js` vérifie ce raccordement, le blocage après défaite et le reset.

```sh
node --test src/enemy.test.js
node --test src/combat.test.js
```

Les tests ont été observés en échec avant l'implémentation, puis les 47 tests et le build sont passés au vert. Le contrôle navigateur couvre la poursuite visible, la pause, les trois attaques jusqu'à la défaite, le blocage après défaite, le reset complet et l'arrêt des dégâts après la mort de l'ennemi. Seule la capture native de la souris est simulée pendant ce contrôle automatisé. L'utilisateur a également confirmé dans son navigateur que le combat, la défaite, le redémarrage et les deux tirs pour tuer l'ennemi fonctionnent.

Au sprint 3, la poursuite était directe. Le sprint 4 adapte le trajet aux obstacles intérieurs. Le contact reste non solide : le joueur peut traverser le cube.

## Sprint 4 : explorer et atteindre la sortie

Le niveau reste volontairement petit : une pièce de 10 m, divisée par une cloison avec un passage à droite. La sortie est le carré vert au sol, dans la partie gauche de la seconde zone. Le joueur et l'ennemi gardent leurs positions et leurs vies du sprint 3.

1. **Le mur bloque, le passage laisse passer.** Lire le premier test de `frontend/src/level.test.js`, puis `canStand()` dans `level.js`. Les mêmes coordonnées servent à dessiner le mur et à tester les collisions. `moveInLevel()` essaie séparément les deux axes pour permettre de longer un mur.
2. **Entrer vivant dans la sortie fait gagner.** Commencer par le premier test de `frontend/src/victory.test.js` : le joueur a 1 PV, l'ennemi est vivant, un petit pas le fait entrer dans le carré. `atExit()` vérifie la position ; à la fin de `advance()`, `game.js` passe à `status: 'won'` si le joueur a survécu. Un coup fatal pendant ce même pas donne la défaite.
3. **L'ennemi contourne la cloison.** `path.test.js` puis `path.js` ajoutent une petite recherche en largeur : des cases voisines sont essayées jusqu'à trouver un chemin. `enemy.test.js` vérifie le détour dans les deux sens, les coins et les attaques bloquées par le mur. Ce morceau est plus avancé ; il peut se lire après les deux premières étapes.
4. **La victoire termine la partie.** `canvas.js` affiche le résultat et libère la souris. Les déplacements, les tirs et la reprise restent bloqués jusqu'à Recommencer, qui rétablit le niveau, les vies et le regard.

Pour commencer par une seule règle depuis `frontend/` :

```sh
node --test --test-name-pattern='entrer vivant' src/victory.test.js
```

Puis lancer `node --test src/level.test.js src/victory.test.js`, et enfin `npm test`.

Les tests du niveau et de la victoire ont été observés en échec avant leur implémentation. Les tests de trajet ont aussi révélé un blocage au coin de la cloison, corrigé avant intégration. Vérification : 71 tests au vert et build validé ; le contrôle navigateur couvre le tir bloqué par la cloison, le trajet complet sans tuer l'ennemi, la victoire avec 3 PV, la libération de la souris, le blocage après victoire et le redémarrage. Seule la capture native de la souris est simulée pour ce contrôle automatisé. L'utilisateur a également confirmé dans son navigateur que la victoire après le passage à droite et le redémarrage fonctionnent.

Limites de ce sprint : niveau fixe, trajet ennemi sur une grille d'un mètre, un seul ennemi et contact non solide. Pas encore de sauvegarde de résultat ; elle vient dans le sprint consacré au backend.

## Sprint 5 : enregistrer son résultat

Après une victoire ou une défaite, le joueur peut saisir un pseudo et enregistrer son score. Le Top 10 se recharge après l'enregistrement. Recharger la page ou redémarrer le backend conserve les résultats dans SQLite.

1. **Calculer les points.** Commencer par le premier test de `frontend/src/score.test.js`, puis les trois lignes de `score.js`. Une victoire rapporte 60 points + 10 par PV restant : 70, 80 ou 90 points. Une défaite vaut 0. La limite existante de l'API, de 0 à 90, reste inchangée.
2. **Envoyer et relire un score.** Dans `backend/tests/test_scores.py`, lire `test_post_score_then_read_leaderboard`. Il envoie un pseudo et 80 points, attend une réponse 201, puis relit le classement. La route POST dans `backend/scores/__init__.py` crée un `Score`, l'ajoute à la session, valide l'écriture avec `commit()`, recharge les champs générés avec `refresh()`, puis renvoie le résultat.
3. **Refuser les données invalides.** `ScoreCreate` conserve la validation fournie : pseudo nettoyé de 1 à 24 caractères, points entiers de 0 à 90 et aucun champ supplémentaire. Les tests vérifient qu'un rejet 422 n'écrit rien, les valeurs limites, le Top 10 trié par points décroissants puis ancienneté, et la persistance après recréation de l'application.
4. **Brancher le formulaire.** `frontend/src/ScoreForm.jsx` contient le pseudo, l'envoi et les états en cours/enregistré/erreur. `jsonBody()` de `api.js` prépare le POST. Le verrou `locked.current` est posé avant l'envoi pour bloquer deux soumissions simultanées. Une erreur conserve le pseudo et permet de réessayer ; un succès termine l'envoi pour cette partie.
5. **Actualiser le classement.** `main.jsx` affiche le formulaire seulement à la fin, puis relit le Top 10 après un succès. Un échec de cette lecture affiche une erreur tout en conservant « Score enregistré ». Une nouvelle lecture annule la précédente pour empêcher un ancien classement de remplacer le plus récent. Recommencer retire le formulaire ; celui de la partie suivante commence à zéro.

Pour lire un premier test à la fois :

```sh
# Depuis frontend/
node --test --test-name-pattern='atteindre la sortie avec trois' src/score.test.js
# Depuis backend/
uv run pytest -q tests/test_scores.py::test_post_score_then_read_leaderboard
```

Le test POST a échoué avec 405 avant l'ajout de la route. Le test du calcul a échoué avant la création de `score.js`, et le contrôle navigateur a constaté l'absence du champ Pseudo après une victoire avant l'ajout du formulaire. Vérification : 74 tests front, 21 tests back et build validés. Le contrôle navigateur utilise une base temporaire isolée et couvre victoire à 90 points, défaite à 0, pseudo blanc, double soumission, erreur puis nouvel essai, échec de lecture après sauvegarde, redémarrage pendant un POST et formulaire neuf à la partie suivante. La capture de la souris et les erreurs HTTP sont simulées ; les sauvegardes réussies utilisent le vrai backend. Le formulaire a été vérifié sur ordinateur et écran de 390 px, sans débordement. L'utilisateur a confirmé l'enregistrement et la relecture du classement après rechargement de la page.

Limites : classement de démonstration sans comptes, avec scores déclarés par le client. Si le serveur enregistre un POST mais que sa réponse réseau est perdue, un nouvel essai peut créer un doublon ; une clé d'idempotence sera nécessaire pour garantir l'unicité dans ce cas.

## Sprint 6 : accueil, menus et ambiance FPS rétro

L'accueil présente la mission, le plan réel du niveau, les commandes et le classement. **Jouer** lance une nouvelle partie et capture la souris. Le Canvas occupe toute la fenêtre, avec un HUD pour la vie, l'arme, les munitions et l'ennemi. Le bouton **Plein écran** demande aussi le mode natif du navigateur ; s'il est refusé, une erreur explique que la partie reste jouable dans la fenêtre.

- **Échap / Pause** fige les déplacements, le combat et le tracé du tir. **Reprendre** garde la position et les PV.
- **Recommencer**, en pause, remet la partie à zéro puis reprend. Après victoire ou défaite, le même parcours s'appelle **Rejouer**.
- **Retour à l'accueil** met le jeu en pause et retire le formulaire de résultat. Le prochain **Jouer** repart avec 3 PV et un ennemi neuf.
- Le classement et la sauvegarde du sprint 5 restent disponibles ; les règles et les routes de score sont conservées.

La refonte demandée utilise ui-ux-pro-max, design-taste-frontend et Impeccable : acier olive, rouge braise, titres Barlow Condensed, texte Barlow, menus carrés et HUD de FPS des années 90. Les fontes et leurs licences sont dans `frontend/public/fonts/`, sans chargement distant à l'exécution. `PRODUCT.md`, `DESIGN.md` et `.impeccable/surfaces/frontend-src-main-jsx.md` conservent les décisions pour les prochains sprints.

Pour comprendre dans l'ordre :

1. **Accueil ou partie.** Dans `main.jsx`, le booléen `home` choisit l'écran. `goHome()` appelle d'abord `pause()`. `start()` remet le jeu à zéro et rend le Canvas visible avant d'appeler `resume()` ; `flushSync()` force ce petit changement d'affichage à se terminer pendant le clic utilisateur, avant le focus et la capture de souris.
2. **Plein écran.** Lire le premier test de `frontend/src/fullscreen.test.js`, puis les cinq lignes de `fullscreen.js`. La fonction demande le plein écran sur l'élément du jeu ou le quitte s'il est actif. Le composant affiche l'erreur et garde la partie accessible si le navigateur refuse.
3. **Canvas à la bonne taille.** Dans `canvas.js`, `ResizeObserver` observe la zone de jeu. `resize()` adapte le rendu et le rapport largeur/hauteur de la caméra. Le ratio de pixels est plafonné à 2 ; le nettoyage libère l'observer et les textures.
4. **Afficher le tir.** Les deux premiers tests de `shooting.test.js` vérifient le point du premier impact et l'absence d'impact dans le vide. `castShot()` renvoie ce résultat, `hitsTarget()` conserve sa réponse booléenne. `showShot()` dans `canvas.js` dessine une ligne lumineuse jusqu'à l'impact, puis la fait disparaître en 100 ms. Les dégâts restent immédiats et la ligne ne bloque pas les tirs suivants.
5. **Lire les visuels séparément.** `Hud.jsx` affiche les données déjà connues. `LevelMap.jsx` dessine le plan depuis les coordonnées du niveau. `textures.js` crée des textures industrielles déterministes, utilisées par `room.js`, sans changer les murs ni les collisions.

```sh
# Depuis frontend/
node --test src/fullscreen.test.js
node --test src/shooting.test.js src/textures.test.js
```

TDD : le contrôle navigateur a constaté l'absence de Jouer avant l'accueil ; les tests plein écran, impact et textures ont été observés en échec avant leur implémentation. Les 82 tests front et le build passent. Le scénario `frontend/tests/menus.playwright.js` est exécutable avec l'outil Playwright `browser_run_code_unsafe` et son argument `filename` ; il est distinct des tests Node lancés par `npm test`. Il couvre accueil, pause avec joueur blessé et scène immobile, reprise sans reset, retour, nouvelle partie, victoire, formulaire, rejouer et redimensionnement. Il vérifie aussi le tracé par lecture du Canvas : 0 pixel jaune avant, 381 pendant le tir, 0 après. Ce scénario simule seulement la capture native de souris et n'écrit aucun score de test.

L'utilisateur a confirmé dans son navigateur que le plein écran natif, les tirs et les menus fonctionnent. Le navigateur automatisé refuse le plein écran avec « not granted » : son message de repli est vérifié, tandis que le mode natif est validé manuellement. Les captures couvrent accueil et résultat en 1440 px et 390 px, ainsi que jeu et pause sur ordinateur.

Deux illustrations originales ont été générées avec l'outil natif imagegen : `public/art/sector-entry.webp` pour l'accueil et `public/art/pistol-view.png` pour l'arme. Leurs prompts exacts et provenances sont conservés à côté des images ; aucun asset original de Doom n'est utilisé. Les textures du niveau sont produites par le code. Limites conservées : ennemi cubique, niveau fixe, tirs instantanés avec effet visuel plutôt que projectiles simulés, commandes clavier/souris sur ordinateur.

## Premier trajet complet

Ce parcours est réalisé au sprint 5 ; les étapes ci-dessous restent le guide de lecture du raccordement front/back.

1. Dans `backend/tests/test_scores.py`, écrire un test : POST un score, vérifier 201, puis GET et vérifier les données. Constater son échec.
2. Dans `backend/scores/__init__.py`, ajouter le POST en utilisant le schema et le modèle fournis. Faire passer le test, puis tester un score invalide sans écriture.
3. Dans `frontend/src/main.jsx`, ajouter le formulaire de pseudo après la fin, le POST, les états saving/saved/error puis la relecture du classement. `src/api.js` est fourni.
4. Redémarrer le backend et relire le score. Conserver un test de cette propriété.
5. Ajouter une modification personnelle limitée du jeu ou de la ressource ; adapter les tests et les limites du contrat si nécessaire.

Parcours commun : conserver le backend FastAPI + SQLAlchemy fourni. Le support séparé d’approfondissements propose ensuite l’option NestJS : utiliser le checkpoint `nest-01-memory` puis `nest-02-sqlite` comme support à la place du backend Python. Le frontend reçoit seulement une autre `VITE_API_URL`. Les comportements attendus restent les mêmes.

## Exactement deux markers Python

`backend/scores/__init__.py` contient le package applicatif. `backend/tests/__init__.py` est vide, à côté de `test_scores.py`. Il n'y a aucun marker dans `backend/`, `frontend/`, `instance/`, ni de second dossier `scores/` imbriqué. Les commandes Python sont lancées dans `backend/`, au niveau de `pyproject.toml`.

Le dossier `game-reference` montre un résultat complet. Vous pouvez le lire, mais devez expliquer et modifier ce que vous utilisez. Le brief et les attentes de présentation sont dans `assessments/02-game.md` du kit de cours.

## Images Docker et CI

La CI GitHub Actions lance les tests front et back, construit les deux images Linux AMD64, puis vérifie ensemble le front, le proxy `/api`, un POST de score suivi d'un GET, le rejet d'un score invalide, les redirections HTTPS et la persistance du résultat après recréation des conteneurs. Elle publie les images sur GHCR seulement si ces étapes passent, lors d'un push sur `main` ou d'un tag `v*`. Les pull requests vérifient les images sans les publier.

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

La base SQLite et la table `score` sont créées automatiquement au démarrage du backend par `create_app()`. Pour les initialiser, démarrer le backend suffit :

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

Une fois le backend démarré, vérifier son état et lire le classement :

```sh
docker compose ps backend
docker compose exec backend /app/.venv/bin/python -c \
  "from urllib.request import urlopen; print(urlopen('http://127.0.0.1:8001/scores/').read().decode())"
```

Une base vide renvoie `[]` ; sinon, les scores déjà présents sont affichés. Cette vérification utilise l'API interne au conteneur, sans passer par NPMplus.

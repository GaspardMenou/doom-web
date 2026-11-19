# Doom Web

Projet de FPS rétro inspiré du premier Doom : React pour l'interface, Three.js dans un Canvas pour le jeu, FastAPI + SQLAlchemy pour les scores. Les quatre premiers sprints permettent d'explorer un petit niveau 3D, tirer, survivre à un ennemi et atteindre la sortie pour gagner.

## Première version convenue

- Solo sur ordinateur, petit niveau à explorer : survivre et atteindre la sortie.
- Une arme, munitions illimitées, un type d'ennemi et une barre de vie.
- Accueil, commandes, pause, victoire/défaite, nouvelle partie et classement.
- Développement en TDD et petits sprints : déplacement, tir, combat, niveau, parcours complet, enregistrement des résultats. Pour chaque comportement : test en échec, code minimal, tests au vert, nettoyage et vérification dans le navigateur.
- Rendu prévu le 20 novembre 2026 après-midi.

## Socle fourni

Le backend sait lire un classement vide. **L'enregistrement n'est pas encore implémenté** : il sera terminé au sprint consacré aux résultats. Les consignes de départ sont conservées ci-dessous.

## Lancer

Dans `backend/` : `uv sync --locked`, `uv run pytest -q` (1 passed), puis `uv run uvicorn scores:create_app --factory --reload --port 8001`.

Dans `frontend/` : `npm ci`, `npm test` (71 tests), puis `npm run dev`. Ouvrir `http://127.0.0.1:5175`. Chaque terminal reste dans son dossier.

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

## Premier trajet complet

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

La CI GitHub Actions lance les tests front et back, construit les deux images Linux AMD64, puis vérifie ensemble le front, le proxy `/api`, les redirections HTTPS et la persistance SQLite après recréation des conteneurs. Elle publie les images sur GHCR seulement si ces étapes passent, lors d'un push sur `main` ou d'un tag `v*`. Les pull requests vérifient les images sans les publier.

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

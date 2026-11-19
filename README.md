# Doom Web

Projet de FPS rétro inspiré du premier Doom : React pour l'interface, Three.js dans un Canvas pour le jeu, FastAPI + SQLAlchemy pour les scores. Le sprint 1 affiche une pièce 3D dans laquelle on peut marcher et regarder à la souris, sans traverser les murs.

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

Dans `frontend/` : `npm ci`, `npm test` (17 tests), puis `npm run dev`. Ouvrir `http://127.0.0.1:5175`. Chaque terminal reste dans son dossier.

## Sprint 1 : comprendre dans l'ordre

1. `frontend/src/game.test.js` : commencer par le premier test, « avancer pendant une seconde déplace le joueur de trois mètres ». Il vérifie une règle sans navigateur ni Three.js.
2. `frontend/src/game.js` : `newGame()` place le joueur ; `advance()` calcule sa prochaine position. `x` représente gauche/droite, `z` avant/arrière. La vitesse est multipliée par le temps écoulé, pas par le nombre d'images.
3. Les tests suivants ajoutent les directions, le regard, la diagonale et les murs. La pièce mesure 10 mètres ; le rayon du joueur vaut 0,25 mètre. Ses coordonnées restent donc entre -4,75 et +4,75. Cette collision simple ne gère pour l'instant qu'une pièce rectangulaire vide.
4. `frontend/src/input.js` et `input.test.js` : les touches physiques WASD correspondent à ZQSD sur AZERTY ; les flèches fonctionnent aussi. Une perte de focus remet les touches à zéro.
5. `frontend/src/room.js` : uniquement le sol quadrillé et les quatre murs colorés. `canvas.js` branche la caméra, `PointerLockControls`, les commandes et la boucle d'affichage. Les règles de déplacement restent dans `game.js`.
6. `frontend/src/main.jsx` : React monte le jeu dans le Canvas et affiche les boutons. Les positions ne passent pas par un état React à chaque image.

Pour ne lancer que le premier test depuis `frontend/` :

```sh
node --test --test-name-pattern='avancer pendant' src/game.test.js
```

Les tests ont été écrits en échec avant les règles correspondantes. Ils remplacent ceux de l'ancien jeu 2D ; les tests du client API sont conservés. Pour essayer : cliquer sur **Entrer dans la pièce**, marcher avec ZQSD/WASD ou les flèches, regarder avec la souris, puis appuyer sur Échap pour mettre en pause. **Revenir au centre** réinitialise la position et le regard.

Vérification du sprint : les 17 tests et le build passent, la pièce WebGL s'affiche. La capture réelle de la souris reste à essayer dans un navigateur ouvert normalement : l'automatisation Chromium sur ce Mac renvoie `WrongDocumentError` lors de `requestPointerLock` ([problème documenté côté Playwright](https://github.com/microsoft/playwright/issues/20956)). Le jeu affiche une erreur et permet de réessayer ; les tests de déplacement et de clavier ne simulent pas une capture réussie.

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

# Doom Web

FPS rétro solo sur ordinateur, inspiré du premier Doom. Explorez trois secteurs, survivez aux ennemis et rejoignez les sas d'extraction. Le jeu utilise **React + Three.js**, une API **FastAPI + SQLAlchemy** et une base **SQLite**.

Le projet avance en petits sprints TDD. Les explications et validations des étapes précédentes sont conservées dans l'[historique pédagogique](docs/HISTORIQUE.md).

## Démarrer en développement

Prérequis : **Node.js ≥ 22.12**, **Python ≥ 3.12** et [uv](https://docs.astral.sh/uv/). Depuis la racine du dépôt, ouvrir deux terminaux.

**Terminal 1 — API :**

```sh
cd backend
uv sync --locked
uv run uvicorn scores:create_app --factory --reload --port 8001
```

**Terminal 2 — frontend :**

```sh
cd frontend
npm ci
npm run dev
```

- Jeu : <http://127.0.0.1:5175>
- Documentation interactive de l'API : <http://127.0.0.1:8001/docs>

La base et ses tables sont créées au démarrage du backend dans `backend/instance/scores.sqlite`. Les données restent présentes après un redémarrage.

Le frontend utilise `http://localhost:8001` par défaut. Pour changer cette adresse, créer `frontend/.env.local` en s'appuyant sur [frontend/.env.example](frontend/.env.example), puis redémarrer Vite. Les origines autorisées par l'API en développement sont `http://localhost:5175` et `http://127.0.0.1:5175`.

## Jouer

Saisir un pseudo de 1 à 24 caractères avant de lancer la partie ; les espaces extérieurs sont retirés. Ce pseudo sera réutilisé pour enregistrer le score, sans seconde saisie.

| Commande | Action |
| --- | --- |
| ZQSD, WASD ou flèches | Se déplacer |
| Souris | Regarder après capture du pointeur |
| Clic gauche ou Espace, maintenu | Tirer |
| Maj | Courir |
| M | Afficher ou masquer le plan |
| Échap / Pause | Mettre en pause |
| Bouton Plein écran | Activer ou quitter le plein écran du navigateur |

La campagne traverse l'Entrée (64 × 64 m), la Maintenance (80 × 80 m) puis le Réacteur (96 × 96 m). Les gardes, traqueurs et colosses attaquent au contact ; les sentinelles tirent des projectiles esquivables. Les soins rendent des PV. Les caractéristiques des ennemis sont définies dans [enemyTypes.js](frontend/src/game/enemyTypes.js).

Les PV et les points sont conservés entre les secteurs. Chaque élimination rapporte les points du type d'ennemi ; chaque secteur franchi ajoute 500 points. La victoire finale ajoute 1000 points + 100 par PV restant. Après une défaite ou la dernière sortie, le résultat peut être enregistré ; le classement affiche les dix meilleurs scores. Les statistiques par pseudo regroupent parties jouées, total et moyenne des points.

Une **graine de mission** détermine les variations des murs, du sas, des ennemis et des soins. Pour reproduire une mission avec la même version du jeu, ouvrir par exemple <http://127.0.0.1:5175/?seed=12345>. Recommencer ou Rejouer garde cette graine ; Jouer renouvelle la mission si l'URL n'impose pas de graine. Le plan de l'accueil est un exemple ; M affiche le plan réel de la partie.

Un fil discret affiche les morts et les victoires finales des joueurs connectés. Il conserve les 50 derniers événements reçus en mémoire et indique l'état de connexion. Une erreur réseau laisse le jeu jouable.

## Tests et TDD

Depuis `frontend/` :

```sh
npm test
npm run build
```

Depuis `backend/` :

```sh
uv run --locked pytest -q
```

`npm test` lance les tests Node des règles du jeu, des entrées, du rendu et des clients API. Les scénarios navigateur sont séparés : leur rôle et leurs limites sont décrits dans [frontend/TESTS.md](frontend/TESTS.md). Les tests de combat utilisent les caractéristiques de `ENEMY_TYPES` pour rester cohérents quand l'équilibrage change.

Pour lire une petite étape à la fois :

1. [game.test.js](frontend/tests/unit/game.test.js), puis [game.js](frontend/src/game/game.js) : déplacements et progression de la partie.
2. [shoot.test.js](frontend/tests/unit/shoot.test.js), puis `shoot()` dans `game.js` : dégâts sur l'ennemi visé.
3. [enemy.test.js](frontend/tests/unit/enemy.test.js), puis [enemy.js](frontend/src/game/enemy.js) : détection, poursuite et attaques.
4. [gameEvents.test.js](frontend/tests/unit/gameEvents.test.js), puis [gameEvents.js](frontend/src/api/gameEvents.js) : un seul événement de fin par campagne.

La démarche reste : écrire un test en échec, ajouter le code nécessaire, faire passer les tests, puis simplifier.

## Docker en local

Depuis la racine, avec Docker et le plugin Docker Compose :

```sh
docker compose up -d --build --wait
```

Ouvrir <http://127.0.0.1:8080>. Le [Compose](compose.yaml) construit les deux images **Linux AMD64**, publie le frontend et garde le backend sur le réseau Docker interne. Nginx sert le jeu et transmet `/api/` au backend, y compris le WebSocket `/api/ws/events`.

Pour arrêter : `docker compose down`. Le volume des scores est conservé.

## Déployer derrière NPMplus

La CI publie deux images privées :

- `ghcr.io/gaspardmenou/doom-web-frontend:latest`
- `ghcr.io/gaspardmenou/doom-web-backend:latest`

Sur le serveur Docker AMD64, copier [compose.yaml](compose.yaml) dans un dossier dédié. NPMplus étant sur une autre machine, créer un fichier `.env` à côté du Compose, en remplaçant `IP_LAN_SERVEUR_DOCKER` par l'adresse LAN du serveur Docker :

```dotenv
FRONTEND_HOST=IP_LAN_SERVEUR_DOCKER
FRONTEND_PORT=8080
IMAGE_TAG=latest
```

Sans `FRONTEND_HOST`, le port reste lié à `127.0.0.1` et n'est pas joignable depuis l'autre machine. Autoriser le port choisi depuis la machine NPMplus dans le pare-feu du serveur Docker.

S'authentifier avec un compte ayant accès aux images et un token GitHub **classic** avec le droit `read:packages`, saisi au prompt du mot de passe ([documentation GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)) :

```sh
docker login ghcr.io -u GaspardMenou
docker compose pull
docker compose up -d --no-build --wait
```

`--no-build` utilise les images téléchargées ; les sources du projet ne sont pas nécessaires sur ce serveur.

Dans le **Proxy Host NPMplus** :

| Réglage | Valeur |
| --- | --- |
| Domaine | Le domaine du jeu |
| Scheme | `http` |
| Forward Hostname / IP | L'adresse LAN du serveur Docker |
| Forward Port | `8080`, ou la valeur de `FRONTEND_PORT` |
| SSL | Certificat du domaine et Force SSL |

Le même domaine sert le jeu, `/api/` et `/api/ws/events` ; aucune Custom Location n'est nécessaire. Le proxy externe doit laisser passer la mise à niveau WebSocket et conserver le protocole HTTPS transmis au backend. Le Nginx du frontend transmet déjà les en-têtes `Upgrade` et `Connection` ; les réglages de NPMplus dépendent de sa version ([documentation officielle](https://github.com/ZoeyVid/NPMplus)).

Dans l'image frontend, `VITE_API_URL=/api` est fixé **au build**. Ajouter cette variable à un conteneur déjà construit ne change pas le JavaScript servi.

Pour mettre à jour, répéter `docker compose pull` puis `docker compose up -d --no-build --wait`. `latest` suit `main` ; chaque publication reçoit aussi un tag `sha-<commit complet>`. Un tag Git `v*` publié produit le même tag d'image. Pour figer une version, renseigner un tag réellement publié dans `IMAGE_TAG` pour les deux services. Le déploiement du serveur reste manuel.

## Base SQLite dans Docker

Le fichier `/app/instance/scores.sqlite` est stocké dans le volume `doom-web_scores` avec le nom de projet par défaut. Il contient les joueurs et leurs scores. Utiliser le même dossier Compose et le même `.env` pour les commandes suivantes.

Le démarrage du backend crée automatiquement une base neuve et les tables manquantes :

```sh
docker compose pull backend
docker compose up -d --no-build --wait backend
```

Pour initialiser les tables sans démarrer l'API, après téléchargement de l'image :

```sh
docker compose run --rm --no-deps backend /app/.venv/bin/python -c \
  "from scores import create_app; app = create_app(); app.state.engine.dispose(); print('Base initialisée.')"
```

Cette commande conserve les données existantes et supprime seulement son conteneur temporaire. Elle **ne migre pas le schéma des tables existantes** : une ancienne base où le pseudo était directement stocké dans `score.player` nécessite une migration pour garder ses données.

`docker compose down` conserve les scores ; **`docker compose down --volumes` les supprime**. Sauvegarder le volume avant toute modification du schéma. Le dossier local `backend/instance/` et le volume Docker sont deux stockages distincts.

Pour vérifier l'API interne au backend démarré :

```sh
docker compose ps backend
docker compose exec backend /app/.venv/bin/python -c \
  "from urllib.request import urlopen; print(urlopen('http://127.0.0.1:8001/scores/').read().decode())"
```

Une base vide renvoie `[]`. Pour diagnostiquer un démarrage : `docker compose logs --tail=100 backend frontend`.

## CI et vérification des images

Le [workflow GitHub Actions](.github/workflows/ci.yml) exécute les tests front et back, le build Vite, la construction des deux images et un test des conteneurs ensemble. Ce dernier vérifie HTTP, le proxy `/api`, l'enregistrement et la lecture des scores/statistiques, les données invalides, les redirections HTTPS et la persistance après recréation des conteneurs.

Les images sont publiées sur GHCR uniquement après succès, lors d'un push sur `main` ou d'un tag `v*`. Les pull requests vérifient les images sans les publier. La publication utilise le `GITHUB_TOKEN` du workflow.

Pour reproduire la vérification des conteneurs localement, depuis la racine :

```sh
IMAGE_TAG=ci docker compose build
IMAGE_TAG=ci scripts/smoke-containers.sh
```

Le script utilise des conteneurs et un volume temporaires, supprimés à la fin. Il ne teste pas les échanges WebSocket ; ceux-ci ont été vérifiés séparément avec deux onglets et un Nginx local. Le NPMplus de production reste à vérifier dans son environnement.

## Organisation et API

```text
frontend/
  src/main.jsx        Accueil, menus et coordination de la partie
  src/components/     HUD, plan, scores, statistiques et fil d'événements
  src/game/           Règles du jeu, collisions, IA, missions et score
  src/game/levels/    Un fichier par secteur
  src/engine/         Scène Three.js, rendu, clavier et plein écran
  src/api/            Clients HTTP et WebSocket
  tests/unit/         Tests Node
  tests/browser/      Scénarios navigateur
  tests/fixtures/     Arènes et données de test
backend/
  scores/__init__.py  Application FastAPI, modèles SQLAlchemy et routes
  tests/              Tests de l'API et de la persistance
scripts/              Vérification des images Docker
```

| Route backend | Rôle |
| --- | --- |
| `GET /scores/` | Lire le Top 10 |
| `POST /scores/` | Enregistrer un score et créer ou retrouver son joueur |
| `GET /players/` | Lire les statistiques par pseudo |
| `WS /ws/events` | Diffuser les morts et victoires finales à tous les clients |

En Docker, ces routes sont précédées de `/api`. Les formats JSON, validations et règles du WebSocket sont détaillés dans [frontend/API_CONTRACT.md](frontend/API_CONTRACT.md). Les scores référencent les joueurs par `player_id` ; le frontend envoie le pseudo et les points.

## Visuels et limites

Les images de l'accueil, de l'arme, des murs, des ennemis et de l'effet de sang sont dans [frontend/public/art/](frontend/public/art/), avec leurs prompts et fichiers de provenance. Les polices sont servies localement depuis [frontend/public/fonts/](frontend/public/fonts/) ; les licences Barlow y sont présentes. La licence des fichiers AmazDooM reste à documenter.

Le jeu reste solo, sur un seul étage, avec des ennemis en sprites orientés vers la caméra. Le fil d'événements ne synchronise pas les parties et n'a ni historique persistant ni reconnexion automatique ; un événement survenu hors connexion n'est pas rattrapé. Les scores sont déclarés par le client, sans authentification ni protection contre la triche.

Pour les choix visuels et le périmètre : [DESIGN.md](DESIGN.md) et [PRODUCT.md](PRODUCT.md). Pour suivre la construction du jeu étape par étape : [historique des sprints](docs/HISTORIQUE.md).

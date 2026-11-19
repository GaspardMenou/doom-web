# Contrat attendu par le frontend

Le développement de l'API reste à la charge de l'utilisateur. Ce document décrit les réponses que le front sait afficher ; il n'ajoute aucune route backend.

## Statistiques par pseudo : GET /players/

Réponse 200 : un tableau de joueurs. Exemple de contrat, sans données fictives injectées dans l'application :

```json
[
  {
    "player": "Ada",
    "total_points": 150,
    "games_played": 2,
    "average_points": 75
  }
]
```

- `player` : pseudo non vide, chaîne.
- `total_points` : entier positif ou nul, cumul des points.
- `games_played` : entier positif ou nul, nombre de parties.
- `average_points` : nombre fini positif ou nul ; une moyenne décimale est acceptée. L'affichage arrondit à une décimale en français.

Une liste vide doit renvoyer `[]`. Le front conserve l'ordre donné par l'API et n'effectue aucun calcul de total ou de moyenne. Il propose les états chargement, liste vide, données, erreur et nouvel essai. La section est dans « Statistiques par joueur » sur l'accueil. Une réponse mal formée affiche une erreur ; aucune statistique de démonstration ne remplace la réponse réelle.

Le pseudo identifie ici une ligne statistique ; le front ne crée pas de compte, de connexion ni de joueur via POST. La création et la mise à jour des statistiques restent une décision backend.

## Scores déjà utilisés

- GET `/scores/` : tableau du Top 10 avec `id`, `player`, `points`, `created_at`.
- POST `/scores/` : corps `{ "player": "Ada", "points": 90 }`, réponse 201 avec le score enregistré.
- Les points restent entre 0 et 90. Une défaite vaut 0 ; la victoire finale des trois niveaux vaut 60 + 10 par PV restant.
- Aucun score n'est envoyé lors d'une sortie intermédiaire. Les PV sont conservés entre les niveaux ; Rejouer et Jouer repartent du premier niveau.

En développement, `VITE_API_URL` utilise `http://localhost:8001` par défaut. Dans les images Docker, les requêtes passent par `/api` sur le même domaine. Les chemins ci-dessus sont relatifs à cette base.

## Tests de contrat

Depuis `frontend/`, `node --test src/playerStats.test.js` vérifie la forme de réponse. Le scénario `frontend/tests/player-stats.playwright.js` utilise uniquement des réponses interceptées dans le navigateur de test : elles ne sont ni écrites dans SQLite ni livrées comme données de production.

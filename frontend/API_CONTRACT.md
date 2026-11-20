# Contrat attendu par le frontend

L'API des joueurs et des statistiques a été implémentée par l'utilisateur. Ce document décrit le contrat commun au backend et au frontend.

## Statistiques par pseudo : GET /players/

Réponse 200 : un tableau de joueurs. Exemple de contrat, sans données fictives injectées dans l'application :

```json
[
  {
    "id": 1,
    "player": "Ada",
    "total_points": 150,
    "games_played": 2,
    "average_points": 75
  }
]
```

- `id` : identifiant entier positif du joueur, fourni par l'API ; le front n'en a pas besoin pour afficher les statistiques.
- `player` : pseudo non vide, chaîne, unique dans la table des joueurs.
- `total_points` : entier positif ou nul, cumul des points.
- `games_played` : entier positif ou nul, nombre de parties.
- `average_points` : nombre fini positif ou nul ; une moyenne décimale est acceptée. L'affichage arrondit à une décimale en français.

Une liste vide doit renvoyer `[]`. Le front conserve l'ordre donné par l'API et n'effectue aucun calcul de total ou de moyenne. Il propose les états chargement, liste vide, données, erreur et nouvel essai. La section est dans « Statistiques par joueur » sur l'accueil. Une réponse mal formée affiche une erreur ; aucune statistique de démonstration ne remplace la réponse réelle.

Lors d'un POST de score, le backend retrouve le joueur par son pseudo ou le crée s'il est absent. Il enregistre le score et actualise le total, le nombre de parties et la moyenne dans la même transaction. Ces données sont conservées dans SQLite. Le front ne crée pas de compte ni de joueur via une route dédiée.

## Scores déjà utilisés

- GET `/scores/` : tableau du Top 10 avec `id`, `player`, `player_id`, `points`, `created_at`. `player` reste le pseudo en texte ; `player_id` désigne le joueur associé au score.
- POST `/scores/` : corps `{ "player": "Ada", "points": 3450 }`, réponse 201 avec le score enregistré.
- Les points sont des entiers de 0 à 100000. Les éliminations rapportent leurs points même en cas de défaite ; chaque secteur franchi ajoute 500 points, et la victoire finale ajoute 1000 + 100 par PV restant.
- Aucun score n'est envoyé lors d'une sortie intermédiaire. Les PV et les points de combat sont conservés entre les niveaux ; Rejouer et Jouer repartent du premier niveau avec une nouvelle campagne.
- La graine des placements, les types d'ennemis et les soins restent des données de jeu côté frontend ; le POST envoie toujours uniquement `player` et `points`.

En développement, `VITE_API_URL` utilise `http://localhost:8001` par défaut. Dans les images Docker, les requêtes passent par `/api` sur le même domaine. Les chemins ci-dessus sont relatifs à cette base.

## Tests de contrat

Depuis `frontend/`, `node --test tests/unit/playerStats.test.js` vérifie la forme de réponse. Le scénario `frontend/tests/browser/player-stats.playwright.js` utilise uniquement des réponses interceptées dans le navigateur de test : elles ne sont ni écrites dans SQLite ni livrées comme données de production.

Depuis `backend/`, `uv run pytest -q tests/test_scores.py::test_second_score_updates_player_stats` vérifie que deux scores pour le même pseudo donnent un seul joueur et les statistiques cumulées. Les 22 tests backend passent, y compris la borne de 100000 points. Les scénarios navigateur de jeu bloquent les POST de scores pour préserver les données existantes ; leur score affiché ne constitue donc pas une preuve d'enregistrement en base.

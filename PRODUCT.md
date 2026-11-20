# Doom Web

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Joueur solo sur ordinateur, clavier et souris. Projet pédagogique dont le développeur apprend chaque règle par petits sprints TDD.

## Product Purpose

Explorer trois secteurs distincts en vue à la première personne, gérer plusieurs gardes et atteindre la dernière sortie en conservant ses PV entre les niveaux. Enregistrer le résultat final et consulter le classement ainsi que les statistiques par pseudo fournies par l'API.

## Capabilities and Constraints

- React et Three.js dans un Canvas ; API FastAPI et SQLite développées par l'utilisateur. Le front consomme les routes de score et `GET /players/` selon `frontend/API_CONTRACT.md`.
- Une arme, munitions illimitées et 3 PV maximum pour trois secteurs de 64, 80 et 96 m : dépôt avec bâtiments, six salles de maintenance reliées, réacteur à anneaux et piliers. Marche à 8 m/s et course à 12 m/s avec Maj ; plan en jeu avec M.
- Douze, dix-huit puis vingt-quatre ennemis : gardes (2 PV), traqueurs rapides (1 PV), colosses résistants (5 PV) et sentinelles à projectiles (3 PV). Détection avec vue dégagée, mémoire à distance et délais d'attaque indépendants.
- Retour des dégâts par une texture de sang transparente aux bords de la vue, affichée brièvement puis estompée. Centre et commandes préservés ; effet atténué avec mouvement réduit, nettoyé à la pause et au redémarrage.
- Ennemis en sprites orientés vers la caméra : repos, deux poses de marche, attaque. Murs illustrés par secteur, sas d'extraction lumineux et plan tiré de la vraie géométrie. Placements des ennemis et soins variables, reproductibles par une graine conservée entre niveaux.
- Accueil, pause, reprise, passage au niveau suivant, résultat, nouvelle campagne, pseudo et Top 10. Les PV sont conservés entre niveaux ; Jouer et Rejouer repartent du début avec 3 PV. Rejouer conserve la graine ; Jouer la renouvelle sauf si l'URL `?seed=` la fixe. Tir maintenu au clic gauche ou avec Espace toutes les 130 ms.
- Aucun formulaire aux sorties intermédiaires. Points par élimination conservés même en cas de défaite, 500 par secteur franchi et bonus de victoire finale de 1000 + 100 par PV restant. Le contrat API accepte de 0 à 100000 points.
- Statistiques par pseudo unique : total, nombre de parties et moyenne actualisés à chaque score et conservés dans SQLite. Le score référence le joueur par `player_id` ; l'API conserve aussi le pseudo texte dans sa réponse. États chargement, vide, erreur et nouvel essai ; aucune statistique fictive livrée dans l'application.
- Collisions entre acteurs vivants et contre les murs, y compris en course. Quatre, six puis huit soins rendent chacun 1 PV sans dépasser 3 et restent disponibles à pleine vie. Navigation A* sur une grille d'un mètre ; tirs instantanés du joueur et projectiles simulés des sentinelles.
- Images Docker privées AMD64 publiées en CI ; hébergement derrière NPMplus sur une autre machine.
- Rendu prévu le 20 novembre 2026 après-midi. Code simple, petites étapes et tests compréhensibles.

## Brand Commitments

L'utilisateur demande l'ambiance du premier Doom, une refonte de toute l'UI, le jeu en plein écran et de vraies formes de niveaux avec plusieurs ennemis réactifs. La direction reste celle d'un FPS rétro, avec des visuels originaux générés ; aucun asset original de Doom n'est utilisé.

## Evidence on Hand

README.md distingue l'historique des sprints 1 à 7 de l'extension actuelle du sprint 8. La relecture des doublons du sprint 7 avait ramené les 108 tests Node front à 90 ; frontend/TESTS.md détaille les suppressions, les cas conservés et leurs vérifications. Après intégration du sprint 8, les 104 tests Node et 22 tests backend passent, ainsi que le build Vite de 52 modules. Le backend couvre notamment le cumul des statistiques et la borne de 100000 points. Le test de campagne utilise une visée parfaite ; une régression de la graine 31 couvre le chevauchement des ennemis. Un contrôle complémentaire de 900 missions et 8100 points de passage n'a trouvé ni chevauchement, ni placement dans un mur, ni détection au départ.

Les scénarios navigateur menus, guards et campaign passent : vrai trajet du secteur de 64 m, course, plan M, graine, tirs, combat et soin dans une arène contrôlée de 40 m, esquive d'un projectile de sentinelle et tir maintenu. Les transitions vers les vraies cartes de 80 et 96 m conservent 2 PV et aboutissent à 2700 points ; leurs sorties sont temporairement élargies. La capture native de la souris est simulée. Ces contrôles ne constituent ni une campagne complète parcourue dans le navigateur, ni un réglage de difficulté par un joueur humain. Les visuels et leurs prompts accompagnent ce compte rendu. Les résultats CI restent propres au commit publié.

## Product Principles

- Préserver les règles déjà apprises et validées.
- Rendre la mission, la vie et les actions évidentes pendant le jeu.
- Garder la pause et les erreurs récupérables.
- Expliquer le code par petites étapes avant d'ajouter de nouvelles mécaniques.

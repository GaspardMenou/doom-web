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
- Une arme, munitions illimitées et 3 PV pour une campagne de trois plans : dépôt à deux passages de 12 m, quatre pièces reliées sur 14 m, arène à couvertures de 16 m.
- Trois, quatre puis cinq gardes de 2 PV. Détection à 4 m ou moins avec vue dégagée ; poursuite mémorisée jusqu'à un éloignement supérieur à 6 m. Chaque garde possède sa cadence d'attaque.
- Gardes en sprites orientés vers la caméra : repos, deux poses de marche, attaque. Murs illustrés propres à chaque secteur ; plan affiché d'après la vraie géométrie.
- Accueil, pause, reprise, passage au niveau suivant, résultat, nouvelle campagne, pseudo et Top 10. Les PV sont conservés entre niveaux ; Jouer et Rejouer repartent du début avec 3 PV.
- Aucun score ni formulaire aux sorties intermédiaires. Victoire finale : 60 + 10 par PV restant ; défaite : 0. Le contrat API reste entre 0 et 90 points.
- Statistiques par pseudo unique : total, nombre de parties et moyenne actualisés à chaque score et conservés dans SQLite. Le score référence le joueur par `player_id` ; l'API conserve aussi le pseudo texte dans sa réponse. États chargement, vide, erreur et nouvel essai ; aucune statistique fictive livrée dans l'application.
- Trajets sur grille d'un mètre ; pas de collisions entre gardes ni avec le joueur. Sprites à quatre poses, tirs instantanés avec un tracé bref.
- Images Docker privées AMD64 publiées en CI ; hébergement derrière NPMplus sur une autre machine.
- Rendu prévu le 20 novembre 2026 après-midi. Code simple, petites étapes et tests compréhensibles.

## Brand Commitments

L'utilisateur demande l'ambiance du premier Doom, une refonte de toute l'UI, le jeu en plein écran et de vraies formes de niveaux avec plusieurs ennemis réactifs. La direction reste celle d'un FPS rétro, avec des visuels originaux générés ; aucun asset original de Doom n'est utilisé.

## Evidence on Hand

README.md distingue l'historique des sprints 1 à 6 du fonctionnement actuel du sprint 7. Après relecture des doublons, les 108 tests Node front sont devenus 90 ; frontend/TESTS.md détaille les suppressions, les cas conservés et leurs vérifications. Les 22 tests backend couvrent notamment le cumul des statistiques pour deux scores d'un même joueur. Le parcours unitaire de campagne utilise une visée parfaite ; les scénarios navigateur séparent le vrai trajet du premier niveau et le combat réel des transitions à sorties temporairement élargies. Ils ne constituent pas une campagne complète parcourue à la main dans le navigateur. L'inventaire des six visuels et leurs prompts accompagne ce compte rendu. Les résultats CI restent propres au commit publié.

## Product Principles

- Préserver les règles déjà apprises et validées.
- Rendre la mission, la vie et les actions évidentes pendant le jeu.
- Garder la pause et les erreurs récupérables.
- Expliquer le code par petites étapes avant d'ajouter de nouvelles mécaniques.

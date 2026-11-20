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
- Ennemis en sprites orientés vers la caméra : repos, deux poses de marche, attaque. Murs illustrés par secteur, sas d'extraction lumineux et plan tiré de la vraie géométrie. La graine fait varier localement murs, sas, ennemis et soins ; elle est conservée entre niveaux. Le plan M et la distance utilisent le même `state.level` que les règles et le rendu ; la carte de l'accueil est marquée Exemple.
- Variantes des murs jusqu'à ±3 m, marge extérieure de 3 m, connexité vérifiée avec un rayon de 0,7 m et sas accessible loin du départ avec 2,2 m de dégagement. Jusqu'à 24 essais d'amplitude décroissante, puis repli vers le plan d'origine. Les trois plans restent l'ossature des secteurs.
- Clavier ZQSD/WASD reconnu par les lettres normalisées, avec codes physiques en secours ; flèches, Maj, relâchement et perte de focus pris en charge.
- Accueil, pause, reprise, passage au niveau suivant, résultat, nouvelle campagne, pseudo et Top 10. Les PV sont conservés entre niveaux ; Jouer et Rejouer repartent du début avec 3 PV. Rejouer conserve la graine ; Jouer la renouvelle sauf si l'URL `?seed=` la fixe. Tir maintenu au clic gauche ou avec Espace toutes les 130 ms.
- Aucun formulaire aux sorties intermédiaires. Points par élimination conservés même en cas de défaite, 500 par secteur franchi et bonus de victoire finale de 1000 + 100 par PV restant. Le contrat API accepte de 0 à 100000 points.
- Statistiques par pseudo unique : total, nombre de parties et moyenne actualisés à chaque score et conservés dans SQLite. Le score référence le joueur par `player_id` ; l'API conserve aussi le pseudo texte dans sa réponse. États chargement, vide, erreur et nouvel essai ; aucune statistique fictive livrée dans l'application.
- Collisions entre acteurs vivants et contre les murs, y compris en course. Quatre, six puis huit soins rendent chacun 1 PV sans dépasser 3 et restent disponibles à pleine vie. Navigation A* sur une grille d'un mètre ; tirs instantanés du joueur et projectiles simulés des sentinelles.
- Images Docker privées AMD64 publiées en CI ; hébergement derrière NPMplus sur une autre machine.
- Rendu prévu le 20 novembre 2026 après-midi. Code simple, petites étapes et tests compréhensibles.

## Brand Commitments

L'utilisateur demande l'ambiance du premier Doom, une refonte de toute l'UI, le jeu en plein écran et de vraies formes de niveaux avec plusieurs ennemis réactifs. La direction reste celle d'un FPS rétro, avec des visuels originaux générés ; aucun asset original de Doom n'est utilisé.

## Evidence on Hand

README.md conserve l'historique des sprints 1 à 8, puis décrit le petit sprint sur les murs et sas seedés et le correctif AZERTY. Le nettoyage du sprint 7 avait ramené les 108 tests Node à 90 ; le sprint 8 en comptait 104. La suite actuelle compte 106 tests Node au vert et le build Vite de 54 modules passe. Le test de campagne garde une visée parfaite et un seul parcours complet des trois plans générés.

Les cinq scénarios navigateur modifiés passent : menus, campaign, guards, damage-overlay et seeds. Ils couvrent le vrai trajet du premier secteur seedé, la reproductibilité des murs/sas, le plan et la distance, Z/Q et leur relâchement, le combat et les soins contrôlés, les projectiles, le sang et la largeur mobile. Les transitions de campaign utilisent maintenant des géométries contrôlées et des sas installés avant création ; elles conservent 2 PV et donnent 2700 points. La capture native de souris est simulée. L'utilisateur a également confirmé que ZQSD fonctionne désormais sur l'ordinateur concerné. Le scénario de statistiques est inchangé et n'a pas été relancé pour ce sprint. Ces contrôles ne constituent pas une campagne humaine complète.

La revue indépendante de 900 missions (graines 0 à 299 sur trois secteurs) n'a trouvé aucune erreur de placement, connexité, calme au départ, chevauchement ou dégagement du sas, sans recours au plan d'origine dans cet échantillon. Chaque secteur a produit 300 géométries de murs distinctes, avec 225, 263 et 277 positions de sas distinctes ; 16200 points de passage ont été vérifiés. Le contrôle est borné et réalisé sous Node ; il ne couvre pas toutes les graines possibles. Les résultats CI restent propres au commit publié.

## Product Principles

- Préserver les règles déjà apprises et validées.
- Rendre la mission, la vie et les actions évidentes pendant le jeu.
- Garder la pause et les erreurs récupérables.
- Expliquer le code par petites étapes avant d'ajouter de nouvelles mécaniques.

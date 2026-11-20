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
- Pseudo nettoyé de 1 à 24 caractères saisi avant de jouer, conservé dans App et réutilisé pour le score. Fil WebSocket natif `/ws/events` : mort et victoire finale émises une seule fois par campagne ; 50 derniers événements reçus, état de connexion, texte React et `role="log"`. Erreur réseau non bloquante et fermeture au démontage ; sans historique persistant, queue, reconnexion ni rattrapage.
- Aucun formulaire aux sorties intermédiaires. Points par élimination conservés même en cas de défaite, 500 par secteur franchi et bonus de victoire finale de 1000 + 100 par PV restant. Le contrat API accepte de 0 à 100000 points.
- Statistiques par pseudo unique : total, nombre de parties et moyenne actualisés à chaque score et conservés dans SQLite. Le score référence le joueur par `player_id` ; l'API conserve aussi le pseudo texte dans sa réponse. États chargement, vide, erreur et nouvel essai ; aucune statistique fictive livrée dans l'application.
- Collisions entre acteurs vivants et contre les murs, y compris en course. Quatre, six puis huit soins rendent chacun 1 PV sans dépasser 3 et restent disponibles à pleine vie. Navigation A* sur une grille d'un mètre ; tirs instantanés du joueur et projectiles simulés des sentinelles.
- Images Docker privées AMD64 publiées en CI ; hébergement derrière NPMplus sur une autre machine.
- Rendu prévu le 20 novembre 2026 après-midi. Code simple, petites étapes et tests compréhensibles.

## Brand Commitments

L'utilisateur demande l'ambiance du premier Doom, une refonte de toute l'UI, le jeu en plein écran et de vraies formes de niveaux avec plusieurs ennemis réactifs. La direction reste celle d'un FPS rétro, avec des visuels originaux générés ; aucun asset original de Doom n'est utilisé.

## Evidence on Hand

README.md conserve l'historique des sprints et décrit le fil d'événements avec pseudo avant la partie. La suite actuelle compte 114 tests Node au vert et le build Vite de 57 modules passe. Les tests ennemis utilisent le catalogue ENEMY_TYPES ; trois échecs liés aux anciennes vitesses ont été corrigés et 38 tests ciblés passent sans modification des règles.

Les sept scénarios navigateur passent. Les six hérités neutralisent leur WebSocket de fixture ; le nouveau test événements utilise deux onglets natifs contre une API temporaire. Il confirme pseudo réutilisé, mort/victoire uniques, écho sans doublon, absence de victoire intermédiaire, 50 messages, texte sûr, absence d'historique, fermeture 1008, absence de reconnexion et jeu utilisable hors connexion. Les POST de scores sont interceptés. Nginx réel a passé son contrôle de syntaxe et la diffusion entre deux clients via `/api/ws/events`. Aucun fichier backend ni donnée réelle n'a été modifié ; NPMplus de production reste non vérifié. Les tests de transitions gardent leurs géométries contrôlées ; ils ne constituent pas une campagne humaine complète. L'utilisateur avait confirmé ZQSD sur l'ordinateur concerné.

La revue indépendante de 900 missions (graines 0 à 299 sur trois secteurs) n'a trouvé aucune erreur de placement, connexité, calme au départ, chevauchement ou dégagement du sas, sans recours au plan d'origine dans cet échantillon. Chaque secteur a produit 300 géométries de murs distinctes, avec 225, 263 et 277 positions de sas distinctes ; 16200 points de passage ont été vérifiés. Le contrôle est borné et réalisé sous Node ; il ne couvre pas toutes les graines possibles. Les résultats CI restent propres au commit publié.

## Product Principles

- Préserver les règles déjà apprises et validées.
- Rendre la mission, la vie et les actions évidentes pendant le jeu.
- Garder la pause et les erreurs récupérables.
- Expliquer le code par petites étapes avant d'ajouter de nouvelles mécaniques.

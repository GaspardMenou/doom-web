# Doom Web

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Joueur solo sur ordinateur, clavier et souris. Projet pédagogique dont le développeur apprend chaque règle par petits sprints TDD.

## Product Purpose

Explorer un petit niveau en vue à la première personne, survivre à un ennemi et atteindre la sortie. Enregistrer ensuite le résultat dans un classement.

## Capabilities and Constraints

- React, Three.js dans un Canvas, FastAPI et SQLite ; conserver les routes existantes.
- Une arme, munitions illimitées, 3 PV, un ennemi, une sortie.
- Accueil, pause, reprise, résultat, nouvelle partie, pseudo et Top 10.
- Score : victoire 60 + 10 par PV restant ; défaite 0. Contrat API 0 à 90 points.
- Images Docker privées AMD64 publiées en CI ; hébergement derrière NPMplus sur une autre machine.
- Rendu prévu le 20 novembre 2026 après-midi. Code simple, petites étapes et tests compréhensibles.

## Brand Commitments

L'utilisateur demande l'ambiance du premier Doom, une refonte de toute l'UI et le jeu en plein écran. La direction est celle d'un FPS rétro ; aucun asset original de Doom n'est fourni.

## Evidence on Hand

Les sprints 1 à 5, les essais manuels confirmés et les tests sont décrits dans README.md. L'utilisateur a choisi « Accueil et menus » pour le sprint 6 avant de demander la refonte Doom et le plein écran.

## Product Principles

- Préserver les règles déjà apprises et validées.
- Rendre la mission, la vie et les actions évidentes pendant le jeu.
- Garder la pause et les erreurs récupérables.
- Expliquer le code par petites étapes avant d'ajouter de nouvelles mécaniques.

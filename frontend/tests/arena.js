// Petite géométrie fixe pour tester les règles indépendamment des cartes jouables.
export const ARENA = {
  id: 'training', size: 12, spawn: {x: 0, z: 2, angle: 0},
  walls: [{x: 0, z: -2, width: 4, depth: 3}],
  exit: {x: 4.5, z: -4.5, width: 1.5, depth: 1.5},
  enemies: [], medkits: [],
};

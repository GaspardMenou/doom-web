export default {
  id: 'entry',
  name: 'Entrée',
  size: 12,
  spawn: {x: 0, z: 2, angle: 0},
  enemies: [
    {id: 'entry-1', x: -4, z: -2},
    {id: 'entry-2', x: 0, z: -4.5},
    {id: 'entry-3', x: 4, z: -1},
  ],
  walls: [
    {x: 0, z: -2, width: 4, depth: 3},
    {x: -3.5, z: 3.5, width: 1, depth: 1},
    {x: 3.5, z: 3.5, width: 1, depth: 1},
  ],
  exit: {x: 4.5, z: -4.5, width: 1.5, depth: 1.5},
  wallTexture: '/art/walls/entry.webp',
};

export default {
  id: 'maintenance',
  name: 'Maintenance',
  size: 14,
  spawn: {x: -4.5, z: 4.5, angle: 0},
  enemies: [
    {id: 'maintenance-1', x: -1.5, z: 1.5},
    {id: 'maintenance-2', x: -4.5, z: -4.5},
    {id: 'maintenance-3', x: 4.5, z: -1.5},
    {id: 'maintenance-4', x: 4.5, z: 4.5},
  ],
  walls: [
    {x: 0, z: -6, width: 0.4, depth: 2},
    {x: 0, z: 0, width: 0.4, depth: 6},
    {x: 0, z: 6, width: 0.4, depth: 2},
    {x: -6, z: 0, width: 2, depth: 0.4},
    {x: 0, z: 0, width: 6, depth: 0.4},
    {x: 6, z: 0, width: 2, depth: 0.4},
  ],
  exit: {x: 4.5, z: -4.5, width: 1.5, depth: 1.5},
  wallTexture: '/art/walls/maintenance.webp',
};

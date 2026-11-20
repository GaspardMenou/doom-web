import {canStand, hasLineOfSight} from '../../src/game/level.js';

// Oracle indépendant : chaque segment du parcours est vérifié contre la géométrie réelle.
export function routesFromSpawn(level, radius = 0.7) {
  const size = level.size;
  const half = size / 2;
  const cellOf = point => Math.floor(point.x + half) + Math.floor(point.z + half) * size;
  const pointOf = cell => ({x: cell % size - half + 0.5, z: Math.floor(cell / size) - half + 0.5});
  const start = cellOf(level.spawn);
  const parents = new Map([[start, start]]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    const x = cell % size;
    const z = Math.floor(cell / size);
    const point = cell === start ? level.spawn : pointOf(cell);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (x + dx < 0 || x + dx >= size || z + dz < 0 || z + dz >= size) continue;
      const next = cell + dx + dz * size;
      const destination = pointOf(next);
      if (parents.has(next) || !canStand(destination.x, destination.z, radius, level) ||
          !hasLineOfSight(point, destination, radius, level)) continue;
      parents.set(next, cell);
      queue.push(next);
    }
  }
  return destination => {
    let cell = cellOf(destination);
    if (!parents.has(cell) || !hasLineOfSight(pointOf(cell), destination, radius, level)) return null;
    const route = [destination];
    while (cell !== start) { route.push(pointOf(cell)); cell = parents.get(cell); }
    return [level.spawn, ...route.reverse()];
  };
}

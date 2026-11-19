import {canStand, hasLineOfSight} from './level.js';
import {LEVELS} from './levels/index.js';

export function nextWaypoint(from, to, radius = 0.5, level = LEVELS[0]) {
  if (hasLineOfSight(from, to, radius, level)) return to;

  // shortcut: grille fixe d’un mètre ; revoir le trajet pour des passages plus étroits ou plusieurs étages.
  const size = level.size;
  const half = size / 2;
  const start = Math.floor(from.x + half) + Math.floor(from.z + half) * size;
  const parents = Array(size * size).fill(-1);
  const queue = [start];
  parents[start] = start;
  let goal = -1;

  while (queue.length) {
    const cell = queue.shift();
    const x = cell % size;
    const z = Math.floor(cell / size);
    const point = {x: x - half + 0.5, z: z - half + 0.5};
    if (canStand(point.x, point.z, radius, level) && Math.hypot(point.x - to.x, point.z - to.z) <= 1.000001 &&
        hasLineOfSight(point, to, 0, level)) {
      goal = cell;
      break;
    }

    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextX = x + dx;
      const nextZ = z + dz;
      if (nextX < 0 || nextX >= size || nextZ < 0 || nextZ >= size) continue;
      const next = nextX + nextZ * size;
      if (parents[next] !== -1 || !canStand(nextX - half + 0.5, nextZ - half + 0.5, radius, level)) continue;
      parents[next] = cell;
      queue.push(next);
    }
  }

  if (goal === -1) return from;
  while (goal !== start && parents[goal] !== start) goal = parents[goal];
  const next = {x: goal % size - half + 0.5, z: Math.floor(goal / size) - half + 0.5};
  if (hasLineOfSight(from, next, radius, level)) return next;
  return {x: start % size - half + 0.5, z: Math.floor(start / size) - half + 0.5};
}

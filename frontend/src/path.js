import {ROOM_SIZE, canStand, hasLineOfSight} from './level.js';

export function nextWaypoint(from, to, radius = 0.5) {
  if (hasLineOfSight(from, to, radius)) return to;

  // shortcut: grille fixe d’un mètre ; revoir le trajet pour des passages plus étroits ou plusieurs étages.
  const half = ROOM_SIZE / 2;
  const start = Math.floor(from.x + half) + Math.floor(from.z + half) * ROOM_SIZE;
  const parents = Array(ROOM_SIZE * ROOM_SIZE).fill(-1);
  const queue = [start];
  parents[start] = start;
  let goal = -1;

  while (queue.length) {
    const cell = queue.shift();
    const x = cell % ROOM_SIZE;
    const z = Math.floor(cell / ROOM_SIZE);
    const point = {x: x - half + 0.5, z: z - half + 0.5};
    if (canStand(point.x, point.z, radius) && Math.hypot(point.x - to.x, point.z - to.z) <= 1.000001 &&
        hasLineOfSight(point, to)) {
      goal = cell;
      break;
    }

    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextX = x + dx;
      const nextZ = z + dz;
      if (nextX < 0 || nextX >= ROOM_SIZE || nextZ < 0 || nextZ >= ROOM_SIZE) continue;
      const next = nextX + nextZ * ROOM_SIZE;
      if (parents[next] !== -1 || !canStand(nextX - half + 0.5, nextZ - half + 0.5, radius)) continue;
      parents[next] = cell;
      queue.push(next);
    }
  }

  if (goal === -1) return from;
  while (goal !== start && parents[goal] !== start) goal = parents[goal];
  const next = {x: goal % ROOM_SIZE - half + 0.5, z: Math.floor(goal / ROOM_SIZE) - half + 0.5};
  if (hasLineOfSight(from, next, radius)) return next;
  return {x: start % ROOM_SIZE - half + 0.5, z: Math.floor(start / ROOM_SIZE) - half + 0.5};
}

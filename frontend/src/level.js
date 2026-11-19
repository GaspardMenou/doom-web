import {LEVELS} from './levels/index.js';

export const ROOM_SIZE = LEVELS[0].size;
export const WALLS = LEVELS[0].walls;
export const EXIT = LEVELS[0].exit;

export function canStand(x, z, radius, level = LEVELS[0]) {
  const limit = level.size / 2 - radius;
  if (Math.abs(x) > limit || Math.abs(z) > limit) return false;
  return !level.walls.some(wall =>
    Math.abs(x - wall.x) < wall.width / 2 + radius &&
    Math.abs(z - wall.z) < wall.depth / 2 + radius);
}

export function moveInLevel(position, dx, dz, radius, level = LEVELS[0]) {
  // shortcut: petits pas (0,15 m maximum dans advance) ; revoir la collision pour une téléportation ou un sprint.
  const limit = level.size / 2 - radius;
  let x = Math.max(-limit, Math.min(limit, position.x + dx));
  if (!canStand(x, position.z, radius, level)) x = position.x;
  let z = Math.max(-limit, Math.min(limit, position.z + dz));
  if (!canStand(x, z, radius, level)) z = position.z;
  return {x, z};
}

export function hasLineOfSight(from, to, radius = 0, level = LEVELS[0]) {
  return !level.walls.some(wall => {
    let enter = 0;
    let leave = 1;
    for (const [axis, size] of [['x', 'width'], ['z', 'depth']]) {
      const delta = to[axis] - from[axis];
      const min = wall[axis] - wall[size] / 2 - radius;
      const max = wall[axis] + wall[size] / 2 + radius;
      if (delta === 0) {
        if (from[axis] <= min || from[axis] >= max) return false;
      } else {
        const a = (min - from[axis]) / delta;
        const b = (max - from[axis]) / delta;
        enter = Math.max(enter, Math.min(a, b));
        leave = Math.min(leave, Math.max(a, b));
        if (enter >= leave) return false;
      }
    }
    return enter < leave;
  });
}

export function atExit(position, level = LEVELS[0]) {
  return Math.abs(position.x - level.exit.x) <= level.exit.width / 2 &&
    Math.abs(position.z - level.exit.z) <= level.exit.depth / 2;
}

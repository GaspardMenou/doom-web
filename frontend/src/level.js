export const ROOM_SIZE = 10;
export const WALLS = [{x: -1.5, z: -0.5, width: 7, depth: 0.2}];
export const EXIT = {x: -3.5, z: -3.5, width: 1.5, depth: 1.5};

export function canStand(x, z, radius) {
  const limit = ROOM_SIZE / 2 - radius;
  if (Math.abs(x) > limit || Math.abs(z) > limit) return false;
  return !WALLS.some(wall =>
    Math.abs(x - wall.x) < wall.width / 2 + radius &&
    Math.abs(z - wall.z) < wall.depth / 2 + radius);
}

export function moveInLevel(position, dx, dz, radius) {
  // shortcut: petits pas (0,15 m maximum dans advance) ; revoir la collision pour une téléportation ou un sprint.
  const limit = ROOM_SIZE / 2 - radius;
  let x = Math.max(-limit, Math.min(limit, position.x + dx));
  if (!canStand(x, position.z, radius)) x = position.x;
  let z = Math.max(-limit, Math.min(limit, position.z + dz));
  if (!canStand(x, z, radius)) z = position.z;
  return {x, z};
}

export function hasLineOfSight(from, to, radius = 0) {
  return !WALLS.some(wall => {
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

export function atExit(position) {
  return Math.abs(position.x - EXIT.x) <= EXIT.width / 2 &&
    Math.abs(position.z - EXIT.z) <= EXIT.depth / 2;
}

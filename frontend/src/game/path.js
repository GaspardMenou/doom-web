import {canStand, hasLineOfSight} from './level.js';
import {LEVELS} from './levels/index.js';

// Les murs restent fixes pendant une mission : chaque plan seedé possède son propre cache.
const grids = new WeakMap();
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function gridFor(level, radius) {
  if (!grids.has(level)) grids.set(level, new Map());
  const cached = grids.get(level);
  if (!cached.has(radius)) {
    const free = new Uint8Array(level.size * level.size);
    for (let cell = 0; cell < free.length; cell++) {
      free[cell] = canStand(cell % level.size - level.size / 2 + 0.5,
        Math.floor(cell / level.size) - level.size / 2 + 0.5, radius, level);
    }
    cached.set(radius, {free, links: new Int8Array(free.length * 4).fill(-1)});
  }
  return cached.get(radius);
}

export function nextWaypoint(from, to, radius = 0.5, level = LEVELS[0]) {
  if (hasLineOfSight(from, to, radius, level)) return to;
  const {size} = level;
  const half = size / 2;
  const point = cell => ({x: cell % size - half + 0.5, z: Math.floor(cell / size) - half + 0.5});
  const start = Math.floor(from.x + half) + Math.floor(from.z + half) * size;
  const {free, links} = gridFor(level, radius);
  const parents = new Int32Array(free.length).fill(-1);
  const costs = new Float64Array(free.length).fill(Infinity);
  const closed = new Uint8Array(free.length);
  const open = [start];
  const priority = cell => costs[cell] + Math.abs(point(cell).x - to.x) + Math.abs(point(cell).z - to.z);
  parents[start] = start;
  costs[start] = 0;
  let goal = -1;
  while (open.length) {
    let best = 0;
    for (let index = 1; index < open.length; index++) if (priority(open[index]) < priority(open[best])) best = index;
    const cell = open.splice(best, 1)[0];
    closed[cell] = 1;
    const here = cell === start ? from : point(cell);
    if (Math.hypot(here.x - to.x, here.z - to.z) <= 1.000001 && hasLineOfSight(here, to, 0, level)) {
      goal = cell;
      break;
    }
    for (const [direction, [dx, dz]] of directions.entries()) {
      const x = cell % size + dx;
      const z = Math.floor(cell / size) + dz;
      if (x < 0 || x >= size || z < 0 || z >= size) continue;
      const next = x + z * size;
      if (!free[next] || closed[next]) continue;
      const link = cell * 4 + direction;
      const clear = cell === start ? hasLineOfSight(from, point(next), radius, level) :
        links[link] < 0 ? (links[link] = Number(hasLineOfSight(here, point(next), radius, level))) : links[link];
      if (!clear || costs[cell] + 1 >= costs[next]) continue;
      if (parents[next] < 0) open.push(next);
      parents[next] = cell;
      costs[next] = costs[cell] + 1;
    }
  }
  if (goal < 0) return from;
  while (goal !== start && parents[goal] !== start) goal = parents[goal];
  return goal === start ? from : point(goal);
}

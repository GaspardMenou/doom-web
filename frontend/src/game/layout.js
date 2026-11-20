import {canStand, hasLineOfSight} from './level.js';
import {ENEMY_TYPES} from './enemyTypes.js';

export function createLayout(template, random) {
  const base = {...template, spawn: {...template.spawn},
    walls: template.walls.map(wall => ({...wall})), exit: {...template.exit}};
  // Les arènes de test gardent une géométrie contrôlée pour isoler les règles de combat.
  if (template.fixedLayout) return base;
  const half = template.size / 2;
  const pointOf = cell => ({x: cell % template.size - half + 0.5,
    z: Math.floor(cell / template.size) - half + 0.5});
  const cellOf = point => Math.floor(point.x + half) + Math.floor(point.z + half) * template.size;
  const destinations = [template.spawn, ...template.enemies, ...(template.medkits ?? [])];

  for (let attempt = 0; attempt < 24; attempt++) {
    const spread = 3 - Math.floor(attempt / 8);
    const walls = template.walls.map(wall => {
      const limitX = half - 3 - wall.width / 2;
      const limitZ = half - 3 - wall.depth / 2;
      return {...wall,
        x: Math.max(-limitX, Math.min(limitX, wall.x + Math.floor(random() * (spread * 2 + 1)) - spread)),
        z: Math.max(-limitZ, Math.min(limitZ, wall.z + Math.floor(random() * (spread * 2 + 1)) - spread))};
    });
    const level = {...base, walls};
    if (!destinations.every(point => canStand(point.x, point.z, 0.7, level))) continue;
    if (template.enemies.some(enemy => Math.hypot(enemy.x - level.spawn.x, enemy.z - level.spawn.z) <=
      ENEMY_TYPES[enemy.type ?? 'guard'].detectRange && hasLineOfSight(enemy, level.spawn, 0, level))) continue;

    const start = cellOf(level.spawn);
    const startPoint = pointOf(start);
    if (!canStand(startPoint.x, startPoint.z, 0.7, level) || !hasLineOfSight(level.spawn, startPoint, 0.7, level)) continue;
    const visited = new Uint8Array(template.size * template.size);
    const queue = [start];
    visited[start] = 1;
    // Avec ce rayon, deux centres voisins libres sont reliés sans traverser un mur.
    for (let head = 0; head < queue.length; head++) {
      const cell = queue[head];
      const x = cell % template.size;
      const z = Math.floor(cell / template.size);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (x + dx < 0 || x + dx >= template.size || z + dz < 0 || z + dz >= template.size) continue;
        const next = cell + dx + dz * template.size;
        if (visited[next]) continue;
        const point = pointOf(next);
        visited[next] = canStand(point.x, point.z, 0.7, level) ? 1 : 2;
        if (visited[next] === 1) queue.push(next);
      }
    }
    if (!destinations.every(point => visited[cellOf(point)] === 1 &&
      hasLineOfSight(point, pointOf(cellOf(point)), 0.7, level))) continue;
    const exits = queue.map(pointOf).filter(point =>
      Math.hypot(point.x - level.spawn.x, point.z - level.spawn.z) >= level.size * 0.75 &&
      canStand(point.x, point.z, 2.2, level) &&
      template.enemies.every(enemy => Math.hypot(point.x - enemy.x, point.z - enemy.z) >= 4));
    if (exits.length) return {...level, exit: {...level.exit, ...exits[Math.floor(random() * exits.length)]}, reachableCells: visited};
  }
  return base;
}

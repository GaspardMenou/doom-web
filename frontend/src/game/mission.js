import {canStand, hasLineOfSight} from './level.js';
import {ENEMY_TYPES} from './enemyTypes.js';
import {createLayout} from './layout.js';

export function populateLevel(template, seed) {
  let value = seed >>> 0;
  function random() {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  }
  const {reachableCells, ...level} = createLayout(template, random);
  function scatter(items, enemies) {
    const placed = [];
    return items.map(item => {
      const type = ENEMY_TYPES[item.type ?? 'guard'];
      const radius = enemies ? type.radius : 0.35;
      let position = {x: item.x, z: item.z};
      for (let attempt = 0; attempt < 20; attempt++) {
        const point = {x: item.x + (random() - 0.5) * 10, z: item.z + (random() - 0.5) * 10};
        const reserved = items.some(other => other.id !== item.id &&
          Math.hypot(point.x - other.x, point.z - other.z) < radius + 1.5);
        const safeStart = !enemies || Math.hypot(point.x - level.spawn.x, point.z - level.spawn.z) > type.detectRange ||
          !hasLineOfSight(point, level.spawn, 0, level);
        const nearExit = Math.hypot(point.x - level.exit.x, point.z - level.exit.z) < 4;
        const occupied = placed.some(other => Math.hypot(point.x - other.x, point.z - other.z) < radius + other.radius + 0.1);
        const cellX = Math.floor(point.x + level.size / 2);
        const cellZ = Math.floor(point.z + level.size / 2);
        const reachable = !reachableCells || reachableCells[cellX + cellZ * level.size] === 1 &&
          hasLineOfSight(point, {x: cellX - level.size / 2 + 0.5, z: cellZ - level.size / 2 + 0.5}, 0.7, level);
        if (!reserved && !occupied && !nearExit && safeStart && reachable && canStand(point.x, point.z, 0.7, level)) {
          position = point;
          break;
        }
      }
      placed.push({...position, radius});
      return {...item, ...position, ...(enemies ? {} : {taken: false})};
    });
  }
  return {...level, enemies: scatter(level.enemies, true), medkits: scatter(level.medkits ?? [], false)};
}

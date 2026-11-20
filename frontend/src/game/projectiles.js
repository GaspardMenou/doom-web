import {canStand, hasLineOfSight} from './level.js';
import {LEVELS} from './levels/index.js';

export function createEnemyProjectile(enemy, player, id) {
  const dx = player.x - enemy.x;
  const dz = player.z - enemy.z;
  const distance = Math.hypot(dx, dz);
  return {id, ownerId: enemy.id, x: enemy.x, z: enemy.z,
    vx: distance > 0 ? dx / distance * 10 : 0,
    vz: distance > 0 ? dz / distance * 10 : -10,
    radius: 0.18, life: 3};
}

function playerImpact(from, to, player, radius) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const offsetX = from.x - player.x;
  const offsetZ = from.z - player.z;
  const c = offsetX * offsetX + offsetZ * offsetZ - radius * radius;
  if (c <= 0) return from;
  const a = dx * dx + dz * dz;
  if (a === 0) return null;
  const b = 2 * (offsetX * dx + offsetZ * dz);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const time = (-b - Math.sqrt(discriminant)) / (2 * a);
  return time >= 0 && time <= 1 ? {x: from.x + dx * time, z: from.z + dz * time} : null;
}

export function advanceProjectiles(previous, dt, level = LEVELS[previous.levelIndex ?? 0]) {
  if (dt <= 0 || previous.status !== 'playing' || !previous.projectiles?.length) return previous;
  let playerHealth = previous.playerHealth;
  const projectiles = [];
  for (const before of previous.projectiles) {
    if (before.life <= 0) continue;
    const seconds = Math.min(dt, before.life);
    const next = {...before, x: before.x + before.vx * seconds,
      z: before.z + before.vz * seconds, life: before.life - dt};
    const impact = playerImpact(before, next, previous.player, 0.25 + before.radius);
    if (impact && hasLineOfSight(before, impact, before.radius, level)) {
      playerHealth = Math.max(0, playerHealth - 1);
      continue;
    }
    if (next.life > 0 && canStand(next.x, next.z, next.radius, level) &&
        hasLineOfSight(before, next, next.radius, level)) projectiles.push(next);
  }
  return {...previous, projectiles, playerHealth, status: playerHealth === 0 ? 'lost' : previous.status};
}

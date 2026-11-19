import {hasLineOfSight, moveInLevel} from './level.js';
import {nextWaypoint} from './path.js';
import {LEVELS} from './levels/index.js';
import {ENEMY_TYPES} from './enemyTypes.js';
import {createEnemyProjectile} from './projectiles.js';

export function createEnemy(spawn) {
  const type = spawn.type ?? 'guard';
  const spec = ENEMY_TYPES[type];
  if (!spec) throw new RangeError('Type d’ennemi inconnu.');
  return {...spawn, type, health: spec.health, radius: spec.radius,
    attackCooldown: 0, alerted: false, mode: 'idle', pathCooldown: 0, waypoint: null};
}

export function advanceEnemy(previous, dt, level = LEVELS[previous.levelIndex ?? 0]) {
  if (dt <= 0 || previous.status !== 'playing') return previous;
  let playerHealth = previous.playerHealth;
  let nextProjectileId = previous.nextProjectileId ?? 0;
  const projectiles = [...(previous.projectiles ?? [])];
  const enemies = previous.enemies.slice();

  for (let index = 0; index < enemies.length; index++) {
    const before = previous.enemies[index];
    if (before.health <= 0) continue;
    const spec = ENEMY_TYPES[before.type ?? 'guard'];
    let enemy = {...before, attackCooldown: Math.max(0, before.attackCooldown - dt),
      pathCooldown: Math.max(0, (before.pathCooldown ?? 0) - dt)};
    const playerDistance = Math.hypot(previous.player.x - enemy.x, previous.player.z - enemy.z);
    const seesPlayer = hasLineOfSight(enemy, previous.player, 0, level);
    enemy.alerted = playerDistance <= spec.forgetRange &&
      (before.alerted || playerDistance <= spec.detectRange && seesPlayer);
    if (!enemy.alerted) {
      enemies[index] = {...enemy, mode: 'idle', waypoint: null};
      continue;
    }

    const blockers = enemies.filter((other, otherIndex) => otherIndex !== index && other.health > 0);
    blockers.push({...previous.player, radius: 0.25});
    if (spec.ranged && seesPlayer) {
      const travel = Math.sign(playerDistance - 10) * Math.min(spec.speed * dt, Math.abs(playerDistance - 10));
      const dx = playerDistance > 0 ? (previous.player.x - enemy.x) / playerDistance : -1;
      const dz = playerDistance > 0 ? (previous.player.z - enemy.z) / playerDistance : 0;
      enemy = {...enemy, ...moveInLevel(enemy, dx * travel, dz * travel, spec.radius, level, blockers)};
    } else {
      let waypoint = previous.player;
      if (!hasLineOfSight(enemy, previous.player, spec.radius, level)) {
        if (!enemy.waypoint || enemy.pathCooldown <= 0) {
          enemy.waypoint = nextWaypoint(enemy, previous.player, spec.radius, level);
          enemy.pathCooldown = 0.35;
        }
        waypoint = enemy.waypoint;
      }
      const dx = waypoint.x - enemy.x;
      const dz = waypoint.z - enemy.z;
      const distance = Math.hypot(dx, dz);
      const stoppingDistance = seesPlayer ? Math.max(0, playerDistance - spec.attackRange) : Infinity;
      const step = Math.min(spec.speed * dt, distance, stoppingDistance);
      if (distance > 0) enemy = {...enemy, ...moveInLevel(enemy,
        dx / distance * step, dz / distance * step, spec.radius, level, blockers)};
    }

    const inRange = Math.hypot(previous.player.x - enemy.x, previous.player.z - enemy.z) <= spec.attackRange + 0.000001 &&
      hasLineOfSight(enemy, previous.player, 0, level);
    if (inRange && enemy.attackCooldown <= 0.000001) {
      if (spec.ranged) projectiles.push(createEnemyProjectile(enemy, previous.player, nextProjectileId++));
      else playerHealth = Math.max(0, playerHealth - 1);
      enemy.attackCooldown = spec.attackDelay;
    }
    const moved = enemy.x !== before.x || enemy.z !== before.z;
    enemy.mode = inRange && enemy.attackCooldown > spec.attackDelay - 0.3 ? 'attack' : moved ? 'walk' : 'idle';
    enemies[index] = enemy;
  }
  return {...previous, enemies, projectiles, nextProjectileId, playerHealth,
    status: playerHealth === 0 ? 'lost' : previous.status};
}

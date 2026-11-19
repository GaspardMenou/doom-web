import {hasLineOfSight, moveInLevel} from './level.js';
import {nextWaypoint} from './path.js';
import {LEVELS} from './levels/index.js';

const SPEED = 1;
const ATTACK_RANGE = 1;
const ATTACK_DELAY = 1;
const DETECTION_RANGE = 4;
const LEASH_RANGE = 6;
const RADIUS = 0.5;

export function advanceEnemy(previous, dt) {
  if (dt <= 0 || previous.status !== 'playing') return previous;
  const level = LEVELS[previous.levelIndex ?? 0];
  let playerHealth = previous.playerHealth;
  // shortcut: gardes indépendants ; ajouter leur collision mutuelle si leurs attroupements gênent le jeu.
  const enemies = previous.enemies.map(before => {
    if (before.health === 0) return before;
    let enemy = {...before, attackCooldown: Math.max(0, before.attackCooldown - dt)};
    const playerDistance = Math.hypot(previous.player.x - enemy.x, previous.player.z - enemy.z);
    const seesPlayer = hasLineOfSight(enemy, previous.player, 0, level);
    enemy.alerted = playerDistance <= LEASH_RANGE &&
      (before.alerted || playerDistance <= DETECTION_RANGE && seesPlayer);
    if (!enemy.alerted) return {...enemy, mode: 'idle'};

    const waypoint = nextWaypoint(enemy, previous.player, RADIUS, level);
    const dx = waypoint.x - enemy.x;
    const dz = waypoint.z - enemy.z;
    const distance = Math.hypot(dx, dz);
    const stoppingDistance = seesPlayer ? Math.max(0, playerDistance - ATTACK_RANGE) : Infinity;
    const step = Math.min(SPEED * dt, distance, stoppingDistance);
    if (distance > 0) {
      enemy = {...enemy, ...moveInLevel(enemy, dx / distance * step, dz / distance * step, RADIUS, level)};
    }

    const inRange = Math.hypot(previous.player.x - enemy.x, previous.player.z - enemy.z) <= ATTACK_RANGE + 0.000001 &&
      hasLineOfSight(enemy, previous.player, 0, level);
    if (inRange && enemy.attackCooldown <= 0.000001) {
      playerHealth = Math.max(0, playerHealth - 1);
      enemy.attackCooldown = ATTACK_DELAY;
    }
    const moved = enemy.x !== before.x || enemy.z !== before.z;
    enemy.mode = inRange && enemy.attackCooldown > 0.7 ? 'attack' : moved ? 'walk' : 'idle';
    return enemy;
  });
  return {...previous, enemies, playerHealth, status: playerHealth === 0 ? 'lost' : previous.status};
}

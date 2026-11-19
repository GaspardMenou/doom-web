import {hasLineOfSight, moveInLevel} from './level.js';
import {nextWaypoint} from './path.js';

const SPEED = 1;
const ATTACK_RANGE = 1;
const ATTACK_DELAY = 1;
const RADIUS = 0.5;

export function advanceEnemy(previous, dt) {
  if (dt <= 0 || previous.targetHealth === 0 || previous.status !== 'playing') return previous;

  let enemy = {...previous.enemy};
  const waypoint = nextWaypoint(enemy, previous.player, RADIUS);
  const dx = waypoint.x - enemy.x;
  const dz = waypoint.z - enemy.z;
  const distance = Math.hypot(dx, dz);
  const playerDistance = Math.hypot(previous.player.x - enemy.x, previous.player.z - enemy.z);
  const stoppingDistance = hasLineOfSight(enemy, previous.player) ? Math.max(0, playerDistance - ATTACK_RANGE) : Infinity;
  const step = Math.min(SPEED * dt, distance, stoppingDistance);
  if (distance > 0) {
    enemy = moveInLevel(enemy, dx / distance * step, dz / distance * step, RADIUS);
  }

  let playerHealth = previous.playerHealth;
  let attackCooldown = Math.max(0, previous.attackCooldown - dt);
  const inRange = Math.hypot(previous.player.x - enemy.x, previous.player.z - enemy.z) <= ATTACK_RANGE + 0.000001;
  if (inRange && hasLineOfSight(enemy, previous.player) && attackCooldown <= 0.000001) {
    playerHealth = Math.max(0, playerHealth - 1);
    attackCooldown = ATTACK_DELAY;
  }

  return {
    ...previous,
    enemy,
    playerHealth,
    attackCooldown,
    status: playerHealth === 0 ? 'lost' : previous.status,
  };
}

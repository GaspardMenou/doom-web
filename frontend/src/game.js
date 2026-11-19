import {advanceEnemy} from './enemy.js';

export const ROOM_SIZE = 10;
export const PLAYER_RADIUS = 0.25;
export const PLAYER_MAX_HEALTH = 3;
const SPEED = 3;

export function newGame() {
  return {
    player: {x: 0, z: 2, angle: 0},
    enemy: {x: 0, z: -2},
    targetHealth: 2,
    playerHealth: PLAYER_MAX_HEALTH,
    attackCooldown: 0,
    status: 'playing',
  };
}

export function advance(previous, input, seconds) {
  const dt = Math.max(0, Math.min(seconds, 0.05));
  if (previous.status !== 'playing' || dt === 0) return previous;
  const angle = input.angle ?? previous.player.angle;
  const forward = Number(Boolean(input.forward)) - Number(Boolean(input.backward));
  const side = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const distance = SPEED * dt / Math.max(1, Math.hypot(forward, side));
  const x = previous.player.x + (side * Math.cos(angle) - forward * Math.sin(angle)) * distance;
  const z = previous.player.z - (forward * Math.cos(angle) + side * Math.sin(angle)) * distance;
  // shortcut: pièce rectangulaire vide ; revoir les collisions avec les obstacles du niveau.
  const limit = ROOM_SIZE / 2 - PLAYER_RADIUS;

  return advanceEnemy({
    ...previous,
    player: {
      ...previous.player,
      angle,
      x: Math.max(-limit, Math.min(limit, x)),
      z: Math.max(-limit, Math.min(limit, z)),
    },
  }, dt);
}

export function shoot(previous, hit) {
  if (previous.status !== 'playing') return previous;
  return {...previous, targetHealth: Math.max(0, previous.targetHealth - (hit ? 1 : 0))};
}

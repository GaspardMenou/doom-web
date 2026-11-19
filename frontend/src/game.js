import {advanceEnemy} from './enemy.js';
import {atExit, moveInLevel} from './level.js';

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
  const dx = (side * Math.cos(angle) - forward * Math.sin(angle)) * distance;
  const dz = -(forward * Math.cos(angle) + side * Math.sin(angle)) * distance;
  const position = moveInLevel(previous.player, dx, dz, PLAYER_RADIUS);

  const state = advanceEnemy({
    ...previous,
    player: {
      ...previous.player,
      angle,
      ...position,
    },
  }, dt);
  if (state.status === 'playing' && state.playerHealth > 0 && atExit(state.player)) {
    return {...state, status: 'won'};
  }
  return state;
}

export function shoot(previous, hit) {
  if (previous.status !== 'playing') return previous;
  return {...previous, targetHealth: Math.max(0, previous.targetHealth - (hit ? 1 : 0))};
}

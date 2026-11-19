import {advanceEnemy} from './enemy.js';
import {atExit, moveInLevel} from './level.js';
import {LEVELS} from './levels/index.js';

export const PLAYER_RADIUS = 0.25;
export const PLAYER_MAX_HEALTH = 3;
const SPEED = 3;

export function newGame(levelIndex = 0) {
  if (!Number.isInteger(levelIndex) || !LEVELS[levelIndex]) throw new RangeError('Niveau inconnu.');
  const level = LEVELS[levelIndex];
  return {
    levelIndex,
    player: {...level.spawn},
    enemies: level.enemies.map(enemy => ({...enemy, health: 2, attackCooldown: 0, alerted: false, mode: 'idle'})),
    playerHealth: PLAYER_MAX_HEALTH,
    status: 'playing',
  };
}

export function advance(previous, input, seconds) {
  const dt = Math.max(0, Math.min(seconds, 0.05));
  if (previous.status !== 'playing' || dt === 0) return previous;
  const level = LEVELS[previous.levelIndex ?? 0];
  const angle = input.angle ?? previous.player.angle;
  const forward = Number(Boolean(input.forward)) - Number(Boolean(input.backward));
  const side = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const distance = SPEED * dt / Math.max(1, Math.hypot(forward, side));
  const dx = (side * Math.cos(angle) - forward * Math.sin(angle)) * distance;
  const dz = -(forward * Math.cos(angle) + side * Math.sin(angle)) * distance;
  const position = moveInLevel(previous.player, dx, dz, PLAYER_RADIUS, level);

  const state = advanceEnemy({
    ...previous,
    player: {
      ...previous.player,
      angle,
      ...position,
    },
  }, dt);
  if (state.status === 'playing' && state.playerHealth > 0 && atExit(state.player, level)) {
    return {...state, status: 'won'};
  }
  return state;
}

export function nextLevel(previous) {
  const index = (previous.levelIndex ?? 0) + 1;
  if (previous.status !== 'won' || previous.playerHealth <= 0 || index >= LEVELS.length) return previous;
  return {...newGame(index), playerHealth: previous.playerHealth};
}

export function shoot(previous, enemyId) {
  if (previous.status !== 'playing') return previous;
  const hit = previous.enemies.find(enemy => enemy.id === enemyId && enemy.health > 0);
  if (!hit) return previous;
  const health = hit.health - 1;
  return {...previous, enemies: previous.enemies.map(enemy => enemy === hit
    ? {...enemy, health, alerted: true, mode: health === 0 ? 'dead' : enemy.mode} : enemy)};
}

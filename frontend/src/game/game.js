import {advanceEnemy, createEnemy} from './enemy.js';
import {advanceProjectiles} from './projectiles.js';
import {ENEMY_TYPES} from './enemyTypes.js';
import {populateLevel} from './mission.js';
import {atExit, moveInLevel} from './level.js';
import {LEVELS} from './levels/index.js';

export const PLAYER_RADIUS = 0.25;
export const PLAYER_MAX_HEALTH = 3;
const SPEED = 8;
const SPRINT_SPEED = 12;

export function newGame(levelIndex = 0, seed = Math.floor(Math.random() * 4294967296)) {
  if (!Number.isInteger(levelIndex) || !LEVELS[levelIndex]) throw new RangeError('Niveau inconnu.');
  const level = LEVELS[levelIndex];
  const mission = populateLevel(level, (seed + levelIndex * 9973) >>> 0);
  return {
    seed: seed >>> 0,
    levelIndex,
    player: {...level.spawn},
    enemies: mission.enemies.map(createEnemy),
    medkits: mission.medkits,
    projectiles: [],
    nextProjectileId: 0,
    kills: 0,
    killPoints: 0,
    playerHealth: PLAYER_MAX_HEALTH,
    status: 'playing',
  };
}

export function advance(previous, input, seconds, level = LEVELS[previous.levelIndex ?? 0]) {
  const dt = Math.max(0, Math.min(seconds, 0.05));
  if (previous.status !== 'playing' || dt === 0) return previous;
  const angle = input.angle ?? previous.player.angle;
  const forward = Number(Boolean(input.forward)) - Number(Boolean(input.backward));
  const side = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const distance = (input.sprint ? SPRINT_SPEED : SPEED) * dt / Math.max(1, Math.hypot(forward, side));
  const dx = (side * Math.cos(angle) - forward * Math.sin(angle)) * distance;
  const dz = -(forward * Math.cos(angle) + side * Math.sin(angle)) * distance;
  const position = moveInLevel(previous.player, dx, dz, PLAYER_RADIUS, level, previous.enemies.filter(enemy => enemy.health > 0));

  let state = advanceEnemy({
    ...previous,
    player: {
      ...previous.player,
      angle,
      ...position,
    },
  }, dt, level);
  state = advanceProjectiles(state, dt, level);
  if (state.status === 'playing' && state.playerHealth < PLAYER_MAX_HEALTH) {
    let health = state.playerHealth;
    const medkits = (state.medkits ?? []).map(medkit => {
      if (medkit.taken || health >= PLAYER_MAX_HEALTH || Math.hypot(medkit.x - state.player.x, medkit.z - state.player.z) > 0.9) return medkit;
      health++;
      return {...medkit, taken: true};
    });
    state = {...state, medkits, playerHealth: health};
  }
  if (state.status === 'playing' && state.playerHealth > 0 && atExit(state.player, level)) {
    return {...state, status: 'won'};
  }
  return state;
}

export function nextLevel(previous) {
  const index = (previous.levelIndex ?? 0) + 1;
  if (previous.status !== 'won' || previous.playerHealth <= 0 || index >= LEVELS.length) return previous;
  return {...newGame(index, previous.seed), playerHealth: previous.playerHealth,
    kills: previous.kills ?? 0, killPoints: previous.killPoints ?? 0};
}

export function shoot(previous, enemyId) {
  if (previous.status !== 'playing') return previous;
  const hit = previous.enemies.find(enemy => enemy.id === enemyId && enemy.health > 0);
  if (!hit) return previous;
  const health = hit.health - 1;
  return {...previous, kills: (previous.kills ?? 0) + (health === 0 ? 1 : 0),
    killPoints: (previous.killPoints ?? 0) + (health === 0 ? ENEMY_TYPES[hit.type ?? 'guard'].score : 0),
    enemies: previous.enemies.map(enemy => enemy === hit
    ? {...enemy, health, alerted: true, mode: health === 0 ? 'dead' : enemy.mode} : enemy)};
}

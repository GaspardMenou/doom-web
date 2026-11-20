import assert from 'node:assert/strict';
import test from 'node:test';
import {LEVELS} from '../../src/game/levels/index.js';
import {ENEMY_TYPES} from '../../src/game/enemyTypes.js';
import {advance, newGame, nextLevel, shoot, PLAYER_RADIUS} from '../../src/game/game.js';
import {advanceEnemy} from '../../src/game/enemy.js';
import {atExit, canStand, hasLineOfSight} from '../../src/game/level.js';

const SEED = 12345;

test('une nouvelle partie initialise les vies et ne partage pas ses positions avec le plan', () => {
  const before = structuredClone(LEVELS);
  for (const [index, level] of LEVELS.entries()) {
    const state = newGame(index, SEED);
    assert.equal(state.levelIndex, index);
    assert.equal(state.playerHealth, 3);
    assert.equal(state.status, 'playing');
    assert.deepEqual(state.player, level.spawn);
    assert.deepEqual(state.enemies.map(enemy => [enemy.id, enemy.type]), level.enemies.map(enemy => [enemy.id, enemy.type]));
    for (const [slot, enemy] of state.enemies.entries()) {
      assert.equal(enemy.health, ENEMY_TYPES[enemy.type].health);
      assert.equal(enemy.alerted, false);
      assert.equal(enemy.mode, 'idle');
      assert.ok(Math.abs(enemy.x - level.enemies[slot].x) <= 5);
      assert.ok(Math.abs(enemy.z - level.enemies[slot].z) <= 5);
      assert.ok(canStand(enemy.x, enemy.z, enemy.radius, level));
    }
    assert.ok(state.medkits.every(medkit => !medkit.taken));
    const fresh = structuredClone(state);
    state.player.x += 1;
    state.enemies[0].z += 1;
    state.playerHealth = 0;
    state.enemies[0].health = 0;
    state.medkits[0].taken = true;
    assert.deepEqual(newGame(index, SEED), fresh);
  }
  assert.deepEqual(LEVELS, before);
});

test('passer au niveau suivant conserve la graine, les PV et les points de combat', () => {
  const previous = {...newGame(0, SEED), status: 'won', playerHealth: 2, kills: 3, killPoints: 350};
  previous.enemies = previous.enemies.map((enemy, index) => index < 3
    ? {...enemy, health: 0, attackCooldown: 0.7, alerted: true, mode: 'dead'} : enemy);
  previous.medkits[0].taken = true;
  const before = structuredClone(previous);
  const next = nextLevel(previous);
  const fresh = newGame(1, SEED);
  assert.equal(next.levelIndex, 1);
  assert.equal(next.seed, SEED);
  assert.equal(next.playerHealth, 2);
  assert.equal(next.kills, 3);
  assert.equal(next.killPoints, 350);
  assert.equal(next.status, 'playing');
  assert.deepEqual(next.player, fresh.player);
  assert.deepEqual(next.enemies, fresh.enemies);
  assert.deepEqual(next.medkits, fresh.medkits);
  assert.deepEqual(next.projectiles, []);
  assert.deepEqual(previous, before);
  assert.equal(nextLevel({...next, status: 'won'}).levelIndex, 2);
});

test('on ne saute pas un niveau en cours, perdu, sans vie ou après la dernière sortie', () => {
  for (const state of [newGame(0, SEED), {...newGame(0, SEED), status: 'lost'},
    {...newGame(0, SEED), status: 'won', playerHealth: 0}, {...newGame(2, SEED), status: 'won'}]) {
    assert.equal(nextLevel(state), state);
  }
  assert.throws(() => newGame(-1, SEED), RangeError);
  assert.throws(() => newGame(3, SEED), RangeError);
});

test('collisions, lignes de vue et sorties utilisent la carte demandée', () => {
  for (const level of LEVELS) {
    assert.ok(atExit(level.exit, level));
    assert.equal(atExit(level.spawn, level), false);
    for (const wall of level.walls) {
      assert.equal(canStand(wall.x, wall.z, PLAYER_RADIUS, level), false);
      assert.equal(hasLineOfSight({x: wall.x, z: wall.z - wall.depth / 2 - 0.75},
        {x: wall.x, z: wall.z + wall.depth / 2 + 0.75}, 0, level), false);
    }
  }
});

const routes = [
  [{x: -28, z: 28}, {x: -28, z: -28}, LEVELS[0].exit],
  [{x: -24, z: 28}, {x: -24, z: -30}, {x: 32, z: -30}, LEVELS[1].exit],
  [{x: -22, z: 40}, {x: -22, z: -40}, {x: 0, z: -40}, LEVELS[2].exit],
];

function walkAndFight(state, index) {
  const level = LEVELS[index];
  for (const point of routes[index]) {
    for (let frame = 0; frame < 1200 && state.status === 'playing'; frame++) {
      const dx = point.x - state.player.x;
      const dz = point.z - state.player.z;
      if (Math.hypot(dx, dz) < 0.08) break;
      // Visée parfaite dans ce test de règles ; les murs arrêtent toujours les tirs.
      for (const enemy of state.enemies) {
        if (enemy.health > 0 && hasLineOfSight(state.player, enemy, 0, level)) {
          for (let hit = 0; hit < enemy.health; hit++) state = shoot(state, enemy.id);
        }
      }
      state = advance(state, {right: dx > 0.04, left: dx < -0.04,
        forward: dz < -0.04, backward: dz > 0.04, angle: 0}, 1 / 60);
      assert.ok(canStand(state.player.x, state.player.z, PLAYER_RADIUS, level));
      assert.ok(state.enemies.every(enemy => canStand(enemy.x, enemy.z, enemy.radius, level)));
    }
    assert.ok(state.status !== 'playing' || Math.hypot(point.x - state.player.x, point.z - state.player.z) < 0.08,
      `Trajet bloqué dans ${level.name}`);
  }
  return state;
}

test('une seule campagne traverse les trois cartes en combattant et en conservant ses PV', () => {
  let state = newGame(0, SEED);
  for (const index of [0, 1, 2]) {
    assert.equal(state.levelIndex, index);
    assert.ok(state.enemies.every(enemy => enemy.health === ENEMY_TYPES[enemy.type].health));
    const killsBefore = state.kills;
    state = walkAndFight(state, index);
    assert.equal(state.status, 'won');
    assert.ok(state.playerHealth > 0);
    assert.ok(state.kills > killsBefore);
    if (index < LEVELS.length - 1) {
      const {playerHealth, kills, killPoints} = state;
      state = nextLevel(state);
      assert.equal(state.playerHealth, playerHealth);
      assert.equal(state.kills, kills);
      assert.equal(state.killPoints, killPoints);
    }
  }
});

for (const index of [0, 1, 2]) {
  test(`les gardes de la carte ${index + 1} restent inactifs sans détection initiale`, () => {
    const state = newGame(index, SEED);
    const next = advanceEnemy(state, 0.05);
    assert.deepEqual(next.enemies, state.enemies);
    assert.ok(next.enemies.every(enemy => !enemy.alerted && enemy.mode === 'idle'));
    assert.equal(next.playerHealth, 3);
  });
}

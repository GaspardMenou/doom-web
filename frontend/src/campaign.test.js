import assert from 'node:assert/strict';
import test from 'node:test';
import {LEVELS} from './levels/index.js';
import {advance, newGame, nextLevel, shoot, PLAYER_RADIUS} from './game.js';
import {advanceEnemy} from './enemy.js';
import {atExit, canStand, hasLineOfSight} from './level.js';

test('une nouvelle partie initialise les vies et ne partage pas ses positions avec le plan', () => {
  const before = structuredClone(LEVELS);
  for (const [index, level] of LEVELS.entries()) {
    const state = newGame(index);
    assert.equal(state.levelIndex, index);
    assert.equal(state.playerHealth, 3);
    assert.equal(state.status, 'playing');
    assert.deepEqual(state.player, level.spawn);
    assert.deepEqual(state.enemies, level.enemies.map(enemy => ({...enemy,
      health: 2, attackCooldown: 0, alerted: false, mode: 'idle'})));
    const fresh = structuredClone(state);
    state.player.x += 1;
    state.enemies[0].z += 1;
    state.playerHealth = 0;
    state.enemies[0].health = 0;
    assert.deepEqual(newGame(index), fresh);
  }
  assert.deepEqual(LEVELS, before);
});

test('passer au niveau suivant conserve les PV et restaure tous ses gardes', () => {
  const previous = {...newGame(), status: 'won', playerHealth: 2};
  previous.enemies = previous.enemies.map(enemy => ({...enemy, health: 0, attackCooldown: 0.7, alerted: true, mode: 'dead'}));
  const before = structuredClone(previous);
  const next = nextLevel(previous);
  assert.equal(next.levelIndex, 1);
  assert.equal(next.playerHealth, 2);
  assert.equal(next.status, 'playing');
  assert.deepEqual(next.player, LEVELS[1].spawn);
  assert.ok(next.enemies.every(enemy => enemy.health === 2 && enemy.attackCooldown === 0 && !enemy.alerted && enemy.mode === 'idle'));
  assert.deepEqual(next.enemies.map(({id, x, z}) => ({id, x, z})), LEVELS[1].enemies);
  assert.deepEqual(previous, before);
  assert.equal(nextLevel({...next, status: 'won'}).levelIndex, 2);
});

test('on ne saute pas un niveau en cours, perdu, sans vie ou après la dernière sortie', () => {
  for (const state of [newGame(), {...newGame(), status: 'lost'},
    {...newGame(), status: 'won', playerHealth: 0}, {...newGame(2), status: 'won'}]) {
    assert.equal(nextLevel(state), state);
  }
  assert.throws(() => newGame(-1), RangeError);
  assert.throws(() => newGame(3), RangeError);
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
  [{x: 3.5, z: 2}, {x: 3.5, z: -4.5}, {x: 4.5, z: -4.5}],
  [{x: -4.5, z: -4.5}, {x: 4.5, z: -4.5}],
  [{x: -2.5, z: 6.5}, {x: -2.5, z: -6.5}, {x: 6.5, z: -6.5}],
];

function walkAndFight(state, index) {
  const level = LEVELS[index];
  for (const point of routes[index]) {
    for (let frame = 0; frame < 300 && state.status === 'playing'; frame++) {
      const dx = point.x - state.player.x;
      const dz = point.z - state.player.z;
      if (Math.hypot(dx, dz) < 0.06) break;
      // Le test simule une visée parfaite, mais ne tire jamais à travers un mur.
      for (const enemy of state.enemies) {
        if (enemy.health > 0 && hasLineOfSight(state.player, enemy, 0, level)) {
          state = shoot(shoot(state, enemy.id), enemy.id);
        }
      }
      state = advance(state, {right: dx > 0.04, left: dx < -0.04,
        forward: dz < -0.04, backward: dz > 0.04, angle: 0}, 1 / 60);
      assert.ok(canStand(state.player.x, state.player.z, PLAYER_RADIUS, level));
      assert.ok(state.enemies.every(enemy => canStand(enemy.x, enemy.z, 0.5, level)));
    }
  }
  return state;
}

test('une seule campagne traverse les trois cartes en combattant et en conservant ses PV', () => {
  let state = {...newGame(), playerHealth: 2};
  for (const index of [0, 1, 2]) {
    assert.equal(state.levelIndex, index);
    assert.ok(state.enemies.every(enemy => enemy.health === 2));
    state = walkAndFight(state, index);
    assert.equal(state.status, 'won');
    assert.ok(state.playerHealth > 0);
    assert.ok(state.enemies.some(enemy => enemy.health === 0));
    if (index < LEVELS.length - 1) {
      const health = state.playerHealth;
      state = nextLevel(state);
      assert.equal(state.playerHealth, health);
    }
  }
});

for (const index of [0, 1, 2]) {
  test(`les gardes de la carte ${index + 1} restent inactifs sans détection initiale`, () => {
    const state = newGame(index);
    const next = advanceEnemy(state, 0.05);
    assert.deepEqual(next.enemies, state.enemies);
    assert.ok(next.enemies.every(enemy => !enemy.alerted && enemy.mode === 'idle'));
    assert.equal(next.playerHealth, 3);
  });
}

import assert from 'node:assert/strict';
import test from 'node:test';
import {newGame, shoot} from '../../src/game/game.js';
import {createEnemy} from '../../src/game/enemy.js';
import {ENEMY_TYPES} from '../../src/game/enemyTypes.js';

function targets() {
  return {...newGame(0, 123), enemies: [
    createEnemy({id: 'guard-a', type: 'guard', x: 0, z: 0}),
    createEnemy({id: 'guard-b', type: 'guard', x: 4, z: 0}),
  ]};
}

test('un tir atteint seulement l’ennemi identifié et le met en alerte', () => {
  const state = targets();
  const victim = state.enemies[1];
  const next = shoot(state, victim.id);

  assert.equal(next.enemies[1].health, ENEMY_TYPES.guard.health - 1);
  assert.equal(next.enemies[1].alerted, true);
  assert.equal(state.enemies[1].health, ENEMY_TYPES.guard.health);
  assert.equal(state.enemies[1].alerted, false);
  assert.equal(next.enemies[0], state.enemies[0]);
});

test('un tir manqué ou un identifiant inconnu conserve la partie', () => {
  const state = targets();
  assert.equal(shoot(state, null), state);
  assert.equal(shoot(state, 'absent'), state);
});

test('chaque impact retire un PV jusqu’à la mort et une élimination ne rapporte qu’une fois', () => {
  let state = targets();
  const id = state.enemies[0].id;
  for (let hit = 1; hit <= ENEMY_TYPES.guard.health; hit++) {
    state = shoot(state, id);
    assert.equal(state.enemies[0].health, ENEMY_TYPES.guard.health - hit);
    if (hit < ENEMY_TYPES.guard.health) assert.equal(state.kills, 0);
  }
  assert.equal(state.enemies[0].health, 0);
  assert.equal(state.enemies[0].mode, 'dead');
  assert.equal(state.kills, 1);
  assert.equal(state.killPoints, ENEMY_TYPES.guard.score);
  assert.equal(shoot(state, id), state);
  assert.equal(state.enemies[1].health, ENEMY_TYPES.guard.health);
});

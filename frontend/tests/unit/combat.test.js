import assert from 'node:assert/strict';
import test from 'node:test';
import {advance, newGame, shoot} from '../../src/game/game.js';
import {createEnemy} from '../../src/game/enemy.js';
import {ARENA} from '../fixtures/arena.js';

function duel() {
  const state = newGame(0, 123);
  state.player = {...ARENA.spawn};
  state.medkits = [];
  state.projectiles = [];
  state.enemies = [{...createEnemy({id: 'duel-guard', type: 'guard', x: 0, z: 3}), alerted: true}];
  return state;
}

test('la boucle fait avancer les gardes alertés sans modifier l’état précédent', () => {
  const state = duel();
  state.enemies[0].z = 5;
  const next = advance(state, {}, 0.05, ARENA);
  assert.ok(Math.abs(next.enemies[0].z - 4.89) < 0.000001);
  assert.equal(state.enemies[0].z, 5);
});

test('un garde à portée enlève un PV et déclenche son propre délai', () => {
  const next = advance(duel(), {}, 0.05, ARENA);
  assert.equal(next.playerHealth, 2);
  assert.equal(next.enemies[0].attackCooldown, 1);
  assert.equal(next.status, 'playing');
});

test('une partie terminée ignore les déplacements et les tirs', () => {
  for (const status of ['won', 'lost']) {
    const state = {...duel(), status, playerHealth: status === 'lost' ? 0 : 2};
    assert.equal(advance(state, {right: true}, 0.05, ARENA), state);
    assert.equal(shoot(state, state.enemies[0].id), state);
  }
});

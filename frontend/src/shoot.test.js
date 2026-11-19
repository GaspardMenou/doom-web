import assert from 'node:assert/strict';
import test from 'node:test';
import {newGame, shoot} from './game.js';

test('un tir atteint seulement l’ennemi identifié et le met en alerte', () => {
  const state = newGame();
  const victim = state.enemies[1];
  const next = shoot(state, victim.id);

  assert.equal(next.enemies[1].health, 1);
  assert.equal(next.enemies[1].alerted, true);
  assert.equal(state.enemies[1].health, 2);
  assert.equal(state.enemies[1].alerted, false);
  assert.equal(next.enemies[0], state.enemies[0]);
});

test('un tir manqué ou un identifiant inconnu conserve la partie', () => {
  const state = newGame();
  assert.equal(shoot(state, null), state);
  assert.equal(shoot(state, 'absent'), state);
});

test('deux impacts tuent cet ennemi ; les morts ne prennent plus de coups', () => {
  let state = newGame();
  const id = state.enemies[0].id;
  state = shoot(shoot(state, id), id);
  assert.equal(state.enemies[0].health, 0);
  assert.equal(state.enemies[0].mode, 'dead');
  assert.equal(shoot(state, id), state);
  assert.equal(state.enemies[1].health, 2);
});

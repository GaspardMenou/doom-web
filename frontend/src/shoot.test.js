import assert from 'node:assert/strict';
import test from 'node:test';
import {newGame, shoot} from './game.js';

test('un tir qui touche retire un point de vie à la cible', () => {
  const state = newGame();
  const next = shoot(state, true);

  assert.equal(next.targetHealth, 1);
  assert.equal(state.targetHealth, 2);
});

test('un tir manqué conserve les points de vie', () => {
  const state = newGame();
  assert.deepEqual(shoot(state, false), state);
});

test('deux impacts détruisent la cible et les tirs suivants ne rendent pas sa vie négative', () => {
  let state = shoot(shoot(newGame(), true), true);
  assert.equal(state.targetHealth, 0);

  state = shoot(state, true);
  assert.equal(state.targetHealth, 0);
});

test('une nouvelle partie rétablit les deux points de vie', () => {
  const destroyed = shoot(shoot(newGame(), true), true);
  assert.equal(destroyed.targetHealth, 0);
  assert.equal(newGame().targetHealth, 2);
});

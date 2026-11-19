import assert from 'node:assert/strict';
import test from 'node:test';
import {advance, newGame, shoot} from './game.js';

test('la partie démarre avec trois points de vie et un ennemi en face', () => {
  const state = newGame();

  assert.equal(state.playerHealth, 3);
  assert.equal(state.targetHealth, 2);
  assert.deepEqual(state.enemy, {x: 0, z: -2});
  assert.equal(state.attackCooldown, 0);
  assert.equal(state.status, 'playing');
});

test('la boucle de jeu fait avancer l’ennemi sans modifier l’état précédent', () => {
  const state = newGame();
  state.player.x = 3.5;
  state.enemy.x = 3.5;
  const next = advance(state, {}, 0.05);

  assert.ok(Math.abs(next.enemy.z - (-1.95)) < 0.000001);
  assert.equal(state.enemy.z, -2);
});

test('un ennemi à portée enlève un point de vie au joueur', () => {
  const state = newGame();
  state.enemy.z = state.player.z - 1;
  const next = advance(state, {}, 0.05);

  assert.equal(next.playerHealth, 2);
  assert.equal(next.attackCooldown, 1);
  assert.equal(next.status, 'playing');
});

test('le dernier coup fait perdre la partie', () => {
  const state = newGame();
  state.playerHealth = 1;
  state.enemy.z = state.player.z - 1;
  const next = advance(state, {}, 0.05);

  assert.equal(next.playerHealth, 0);
  assert.equal(next.status, 'lost');
});

test('après la défaite, déplacements et tirs ne changent plus la partie', () => {
  const state = {...newGame(), playerHealth: 0, status: 'lost'};

  assert.deepEqual(advance(state, {right: true}, 0.05), state);
  assert.deepEqual(shoot(state, true), state);
});

test('un ennemi détruit ne poursuit ni n’attaque, le joueur peut encore marcher', () => {
  let state = newGame();
  state.enemy.z = state.player.z - 1;
  state = shoot(shoot(state, true), true);
  const next = advance(state, {right: true}, 0.05);

  assert.deepEqual(next.enemy, state.enemy);
  assert.equal(next.playerHealth, 3);
  assert.ok(next.player.x > state.player.x);
});

test('recommencer rétablit la vie, les positions et le combat', () => {
  const lost = {...newGame(), playerHealth: 0, attackCooldown: 1, status: 'lost'};
  lost.player.x = 4;
  lost.enemy.z = 2;
  const fresh = newGame();

  assert.equal(fresh.playerHealth, 3);
  assert.equal(fresh.targetHealth, 2);
  assert.equal(fresh.status, 'playing');
  assert.equal(fresh.attackCooldown, 0);
  assert.deepEqual(fresh.player, {x: 0, z: 2, angle: 0});
  assert.deepEqual(fresh.enemy, {x: 0, z: -2});
});

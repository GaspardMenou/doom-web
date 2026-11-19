import assert from 'node:assert/strict';
import test from 'node:test';
import {advance, newGame} from './game.js';
import {EXIT, atExit} from './level.js';

test('entrer vivant dans la sortie donne la victoire même avec les gardes vivants', () => {
  const state = newGame();
  state.player = {...state.player, x: EXIT.x, z: EXIT.z + 0.8};
  state.playerHealth = 1;
  const next = advance(state, {forward: true}, 0.05);
  assert.equal(next.status, 'won');
  assert.equal(next.playerHealth, 1);
  assert.ok(next.enemies.every(enemy => enemy.health === 2));
  assert.equal(atExit(next.player), true);
});

test('passer à côté de la sortie ne suffit pas', () => {
  const state = {...newGame(), enemies: []};
  state.player = {...state.player, x: EXIT.x - EXIT.width, z: EXIT.z};
  assert.equal(advance(state, {}, 0.05).status, 'playing');
});

test('un coup fatal au moment d’entrer dans la sortie donne la défaite', () => {
  const state = newGame();
  state.player = {...state.player, x: EXIT.x, z: EXIT.z + 0.8};
  state.enemies = [{...state.enemies[0], x: EXIT.x, z: EXIT.z - 0.2}];
  state.playerHealth = 1;
  const next = advance(state, {forward: true}, 0.05);
  assert.equal(atExit(next.player), true);
  assert.equal(next.playerHealth, 0);
  assert.equal(next.status, 'lost');
});

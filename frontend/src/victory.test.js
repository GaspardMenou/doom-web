import assert from 'node:assert/strict';
import test from 'node:test';
import {advance, newGame, shoot, PLAYER_RADIUS} from './game.js';
import {EXIT, atExit} from './level.js';
import {LEVELS} from './levels/index.js';

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

test('un joueur déjà mort ne peut pas gagner dans la sortie', () => {
  const state = {...newGame(), playerHealth: 0, status: 'lost'};
  state.player = {...state.player, x: EXIT.x, z: EXIT.z};
  assert.equal(advance(state, {}, 0.05).status, 'lost');
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

test('la victoire fige la partie et bloque les tirs suivants', () => {
  const won = {...newGame(), status: 'won'};
  assert.equal(advance(won, {forward: true, right: true}, 0.05), won);
  assert.equal(shoot(won, won.enemies[0].id), won);
});

test('le joueur ne traverse pas le bloc central avec ses commandes', () => {
  let state = {...newGame(), enemies: []};
  for (let frame = 0; frame < 60; frame++) state = advance(state, {forward: true}, 0.05);
  const wall = LEVELS[0].walls[0];
  assert.ok(state.player.z >= wall.z + wall.depth / 2 + PLAYER_RADIUS - 0.000001);
  assert.equal(state.status, 'playing');
});

test('recommencer après une victoire restaure le niveau et les gardes', () => {
  const won = {...newGame(), status: 'won', playerHealth: 1};
  won.player.x = EXIT.x;
  won.player.z = EXIT.z;
  won.enemies[0].health = 0;
  const fresh = newGame();
  assert.equal(fresh.status, 'playing');
  assert.equal(fresh.playerHealth, 3);
  assert.ok(fresh.enemies.every(enemy => enemy.health === 2 && enemy.mode === 'idle'));
  assert.deepEqual(fresh.player, LEVELS[0].spawn);
});

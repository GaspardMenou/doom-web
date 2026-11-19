import assert from 'node:assert/strict';
import test from 'node:test';
import {advance, newGame, shoot} from './game.js';
import {EXIT, atExit, canStand} from './level.js';

test('entrer vivant dans la sortie donne la victoire, même avec l’ennemi vivant', () => {
  const state = newGame();
  state.player = {...state.player, x: EXIT.x, z: EXIT.z + 0.8};
  state.playerHealth = 1;
  const next = advance(state, {forward: true}, 0.05);

  assert.equal(next.status, 'won');
  assert.equal(next.playerHealth, 1);
  assert.equal(next.targetHealth, 2);
  assert.equal(atExit(next.player), true);
});

test('passer à côté de la sortie ne suffit pas', () => {
  const state = newGame();
  state.player = {...state.player, x: EXIT.x + EXIT.width, z: EXIT.z};
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
  state.enemy = {x: EXIT.x, z: EXIT.z - 0.2};
  state.playerHealth = 1;
  const next = advance(state, {forward: true}, 0.05);

  assert.equal(atExit(next.player), true);
  assert.equal(next.playerHealth, 0);
  assert.equal(next.status, 'lost');
});

test('la victoire fige la partie et bloque les tirs suivants', () => {
  const won = {...newGame(), status: 'won'};
  assert.deepEqual(advance(won, {forward: true, right: true}, 0.05), won);
  assert.deepEqual(shoot(won, true), won);
});

test('le joueur ne traverse pas la cloison avec les commandes de la partie', () => {
  let state = {...newGame(), targetHealth: 0};
  for (let frame = 0; frame < 60; frame++) state = advance(state, {forward: true}, 0.05);
  assert.ok(state.player.z >= -0.15);
  assert.equal(state.status, 'playing');
});

test('le niveau se termine en contournant la cloison par la droite sans tuer l’ennemi', () => {
  let state = newGame();
  const route = [{input: {right: true}, frames: 70}, {input: {forward: true}, frames: 110}, {input: {left: true}, frames: 140}];
  for (const section of route) {
    for (let frame = 0; frame < section.frames; frame++) {
      state = advance(state, section.input, 1 / 60);
      assert.equal(canStand(state.player.x, state.player.z, 0.25), true);
    }
  }
  assert.equal(state.status, 'won');
  assert.ok(state.playerHealth > 0);
  assert.equal(state.targetHealth, 2);
});

test('recommencer après une victoire restaure le niveau et les vies', () => {
  const won = {...newGame(), status: 'won', playerHealth: 1, targetHealth: 0};
  won.player.x = EXIT.x;
  won.player.z = EXIT.z;
  const fresh = newGame();
  assert.equal(fresh.status, 'playing');
  assert.equal(fresh.playerHealth, 3);
  assert.equal(fresh.targetHealth, 2);
  assert.deepEqual(fresh.player, {x: 0, z: 2, angle: 0});
});

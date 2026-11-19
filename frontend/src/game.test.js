import assert from 'node:assert/strict';
import test from 'node:test';
import {advance, newGame} from './game.js';

test('avancer pendant une seconde déplace le joueur de trois mètres', () => {
  let state = newGame();
  state.player.x = 3.5;
  const start = state.player.z;

  for (let frame = 0; frame < 60; frame++) {
    state = advance(state, {forward: true}, 1 / 60);
  }

  assert.ok(Math.abs(state.player.z - (start - 3)) < 0.000001);
  assert.equal(state.player.x, 3.5);
});

test('reculer et se décaler utilisent les mêmes commandes simples', () => {
  const start = newGame();
  const back = advance(start, {backward: true}, 0.05);
  const left = advance(start, {left: true}, 0.05);
  const right = advance(start, {right: true}, 0.05);

  assert.ok(Math.abs(back.player.z - 2.15) < 0.000001);
  assert.ok(Math.abs(left.player.x + 0.15) < 0.000001);
  assert.ok(Math.abs(right.player.x - 0.15) < 0.000001);
  assert.deepEqual(start, newGame());
});

test('avancer suit la direction du regard', () => {
  const state = advance(newGame(), {forward: true, angle: Math.PI / 2}, 0.05);

  assert.ok(Math.abs(state.player.x + 0.15) < 0.000001);
  assert.ok(Math.abs(state.player.z - 2) < 0.000001);
  assert.equal(state.player.angle, Math.PI / 2);
});

test('marcher en diagonale ne fait pas aller plus vite', () => {
  const state = advance(newGame(), {forward: true, right: true}, 0.05);
  const distance = Math.hypot(state.player.x, state.player.z - 2);

  assert.ok(state.player.x > 0);
  assert.ok(Math.abs(distance - 0.15) < 0.000001);
});

test('30 ou 60 images par seconde donnent le même déplacement', () => {
  function walk(frames) {
    let state = newGame();
    state.player.x = 3.5;
    for (let frame = 0; frame < frames; frame++) {
      state = advance(state, {forward: true}, 1 / frames);
    }
    return state.player.z;
  }

  assert.ok(Math.abs(walk(30) - walk(60)) < 0.000001);
});

test('les quatre murs gardent le joueur à 25 cm du bord de la pièce', () => {
  const cases = [
    {x: 4.7, z: 0, input: {right: true}, expectedX: 4.75, expectedZ: 0},
    {x: -4.7, z: 0, input: {left: true}, expectedX: -4.75, expectedZ: 0},
    {x: 0, z: -4.7, input: {forward: true}, expectedX: 0, expectedZ: -4.75},
    {x: 0, z: 4.7, input: {backward: true}, expectedX: 0, expectedZ: 4.75},
  ];

  for (const example of cases) {
    const state = newGame();
    state.player.x = example.x;
    state.player.z = example.z;
    const next = advance(state, example.input, 0.05);

    assert.equal(next.player.x, example.expectedX);
    assert.equal(next.player.z, example.expectedZ);
  }
});

test('le joueur peut longer un mur sans rester bloqué', () => {
  const state = newGame();
  state.player.x = 4.75;
  const next = advance(state, {forward: true, right: true}, 0.05);

  assert.equal(next.player.x, 4.75);
  assert.ok(next.player.z < state.player.z);
});

test('une longue interruption ne téléporte pas le joueur', () => {
  const state = newGame();
  const next = advance(state, {forward: true}, 10);

  assert.ok(Math.abs(next.player.z - 1.85) < 0.000001);
  assert.deepEqual(advance(state, {forward: true}, -1), state);
});

test('sans commande, le joueur reste immobile', () => {
  const state = newGame();
  assert.deepEqual(advance(state, {}, 0.05).player, state.player);
});

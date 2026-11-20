import assert from 'node:assert/strict';
import test from 'node:test';
import {advance, newGame, PLAYER_RADIUS} from '../../src/game/game.js';
import {ARENA} from '../fixtures/arena.js';

function start() {
  return {...newGame(0, 123), player: {...ARENA.spawn}, enemies: [], projectiles: [], medkits: []};
}
const step = (state, input, seconds) => advance(state, input, seconds, ARENA);

test('avancer pendant une seconde déplace le joueur de huit mètres', () => {
  let state = start();
  state.player = {x: 3.5, z: 5, angle: 0};
  for (let frame = 0; frame < 60; frame++) state = step(state, {forward: true}, 1 / 60);
  assert.ok(Math.abs(state.player.z + 3) < 0.000001);
});

test('la course parcourt douze mètres par seconde sans accélérer la diagonale', () => {
  const state = start();
  const straight = step(state, {right: true, sprint: true}, 0.05);
  const diagonal = step(state, {right: true, backward: true, sprint: true}, 0.05);
  assert.ok(Math.abs(straight.player.x - 0.6) < 0.000001);
  assert.ok(Math.abs(Math.hypot(diagonal.player.x, diagonal.player.z - 2) - 0.6) < 0.000001);
});

test('les directions et le regard orientent le déplacement sans modifier l’ancien état', () => {
  const state = start();
  assert.ok(Math.abs(step(state, {backward: true}, 0.05).player.z - 2.4) < 0.000001);
  assert.ok(Math.abs(step(state, {left: true}, 0.05).player.x + 0.4) < 0.000001);
  const turned = step(state, {forward: true, angle: Math.PI / 2}, 0.05);
  assert.ok(Math.abs(turned.player.x + 0.4) < 0.000001);
  assert.equal(turned.player.angle, Math.PI / 2);
  assert.deepEqual(state.player, ARENA.spawn);
});

test('30 ou 60 images par seconde donnent la même distance', () => {
  function walk(fps) {
    let state = start();
    for (let frame = 0; frame < fps / 2; frame++) state = step(state, {right: true}, 1 / fps);
    return state.player.x;
  }
  assert.ok(Math.abs(walk(30) - walk(60)) < 0.000001);
  assert.ok(Math.abs(walk(60) - 4) < 0.000001);
});

test('les bords et le bloc central arrêtent même la course en permettant de longer un mur', () => {
  const state = start();
  state.player.x = ARENA.size / 2 - PLAYER_RADIUS;
  const sliding = step(state, {right: true, forward: true, sprint: true}, 0.05);
  assert.equal(sliding.player.x, state.player.x);
  assert.ok(sliding.player.z < state.player.z);
  let blocked = start();
  for (let frame = 0; frame < 60; frame++) blocked = step(blocked, {forward: true, sprint: true}, 0.05);
  assert.ok(blocked.player.z >= -0.25 - 0.000001);
});

test('une interruption limite le pas et une partie sans commandes reste immobile', () => {
  const state = start();
  assert.ok(Math.abs(step(state, {right: true, sprint: true}, 10).player.x - 0.6) < 0.000001);
  assert.equal(step(state, {right: true}, -1), state);
  assert.deepEqual(step(state, {}, 0.05).player, state.player);
});

test('un soin rend un PV une seule fois, reste disponible à pleine vie et ne ressuscite pas', () => {
  const state = {...start(), playerHealth: 1, medkits: [{id: 'health', x: 0, z: 2, taken: false}]};
  const healed = step(state, {}, 0.05);
  assert.equal(healed.playerHealth, 2);
  assert.equal(healed.medkits[0].taken, true);
  assert.equal(step(healed, {}, 0.05).playerHealth, 2);
  assert.equal(step({...state, playerHealth: 3}, {}, 0.05).medkits[0].taken, false);
  assert.equal(step({...state, playerHealth: 0, status: 'lost'}, {}, 0.05).playerHealth, 0);
  assert.equal(state.medkits[0].taken, false);
});

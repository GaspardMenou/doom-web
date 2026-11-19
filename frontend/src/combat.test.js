import assert from 'node:assert/strict';
import test from 'node:test';
import {advance, newGame, shoot} from './game.js';
import {LEVELS} from './levels/index.js';

function duel() {
  const state = newGame();
  state.enemies = [{...state.enemies[0], x: 0, z: 3, alerted: true}];
  return state;
}

test('la partie démarre avec trois PV et les gardes indépendants du niveau', () => {
  const state = newGame();
  assert.equal(state.playerHealth, 3);
  assert.equal(state.enemies.length, 3);
  assert.equal(state.status, 'playing');
  for (const [index, enemy] of state.enemies.entries()) {
    assert.deepEqual(enemy, {...LEVELS[0].enemies[index], health: 2, attackCooldown: 0, alerted: false, mode: 'idle'});
  }
  assert.equal('enemy' in state, false);
  assert.equal('targetHealth' in state, false);
  assert.equal('attackCooldown' in state, false);
});

test('la boucle fait avancer les gardes alertés sans modifier l’état précédent', () => {
  const state = duel();
  state.enemies[0].z = 5;
  const next = advance(state, {}, 0.05);
  assert.ok(Math.abs(next.enemies[0].z - 4.95) < 0.000001);
  assert.equal(state.enemies[0].z, 5);
});

test('un garde à portée enlève un PV et déclenche son propre délai', () => {
  const next = advance(duel(), {}, 0.05);
  assert.equal(next.playerHealth, 2);
  assert.equal(next.enemies[0].attackCooldown, 1);
  assert.equal(next.status, 'playing');
});

test('le dernier coup fait perdre la partie', () => {
  const state = duel();
  state.playerHealth = 1;
  const next = advance(state, {}, 0.05);
  assert.equal(next.playerHealth, 0);
  assert.equal(next.status, 'lost');
});

test('après la défaite, déplacements et tirs ne changent plus la partie', () => {
  const state = {...duel(), playerHealth: 0, status: 'lost'};
  assert.equal(advance(state, {right: true}, 0.05), state);
  assert.equal(shoot(state, state.enemies[0].id), state);
});

test('un garde tué reste mort, les autres poursuivent et le joueur peut marcher', () => {
  let state = newGame();
  state.enemies = [{...state.enemies[0], x: 0, z: 3}, {...state.enemies[1], x: 0, z: 5}];
  const id = state.enemies[0].id;
  state = shoot(shoot(state, id), id);
  const next = advance(state, {right: true}, 0.05);
  assert.equal(next.enemies[0], state.enemies[0]);
  assert.ok(next.enemies[1].z < 5);
  assert.equal(next.playerHealth, 3);
  assert.ok(next.player.x > state.player.x);
});

test('recommencer restaure les PV, les positions et tous les gardes', () => {
  const lost = duel();
  lost.playerHealth = 0;
  lost.enemies[0].health = 0;
  lost.enemies[0].attackCooldown = 1;
  lost.player.x = 4;
  const fresh = newGame();
  assert.equal(fresh.playerHealth, 3);
  assert.equal(fresh.status, 'playing');
  assert.deepEqual(fresh.player, LEVELS[0].spawn);
  assert.ok(fresh.enemies.every(enemy => enemy.health === 2 && enemy.attackCooldown === 0 && !enemy.alerted));
  assert.equal(fresh.enemies.length, LEVELS[0].enemies.length);
});

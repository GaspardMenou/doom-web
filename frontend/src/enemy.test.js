import assert from 'node:assert/strict';
import test from 'node:test';
import {newGame} from './game.js';
import {advanceEnemy} from './enemy.js';

test('l’ennemi se rapproche du joueur à un mètre par seconde', () => {
  const next = advanceEnemy(newGame(), 1);

  assert.equal(next.enemy.x, 0);
  assert.equal(next.enemy.z, -1);
  assert.equal(next.playerHealth, 3);
});

test('une poursuite en diagonale conserve la même vitesse', () => {
  const state = newGame();
  state.enemy = {x: -2, z: -2};
  state.player = {x: 0, z: 0, angle: 0};
  const next = advanceEnemy(state, 1);

  assert.ok(next.enemy.x > state.enemy.x);
  assert.ok(next.enemy.z > state.enemy.z);
  assert.ok(Math.abs(Math.hypot(next.enemy.x + 2, next.enemy.z + 2) - 1) < 0.000001);
});

test('l’ennemi s’arrête à un mètre du joueur sans le dépasser', () => {
  const state = newGame();
  state.enemy.z = 0.99;
  const next = advanceEnemy(state, 0.05);

  assert.deepEqual(next.enemy, {x: 0, z: 1});
  assert.equal(next.playerHealth, 2);
});

test('un ennemi déjà sur le joueur attaque sans produire de coordonnées invalides', () => {
  const state = newGame();
  state.enemy = {x: state.player.x, z: state.player.z};
  const next = advanceEnemy(state, 0.05);

  assert.deepEqual(next.enemy, state.enemy);
  assert.equal(next.playerHealth, 2);
});

test('une attaque retire un point de vie puis attend une seconde', () => {
  const state = newGame();
  state.enemy.z = 1;
  let next = advanceEnemy(state, 0.05);

  assert.equal(next.playerHealth, 2);
  assert.equal(next.attackCooldown, 1);
  next = advanceEnemy(next, 0.99);
  assert.equal(next.playerHealth, 2);
  next = advanceEnemy(next, 0.01);
  assert.equal(next.playerHealth, 1);
  assert.equal(next.attackCooldown, 1);
});

test('le délai entre attaques diminue aussi hors de portée', () => {
  const state = newGame();
  state.attackCooldown = 0.8;
  const next = advanceEnemy(state, 0.25);

  assert.ok(Math.abs(next.attackCooldown - 0.55) < 0.000001);
  assert.equal(next.playerHealth, 3);
});

test('le dernier point de vie déclenche la défaite et les points de vie restent à zéro', () => {
  const state = newGame();
  state.enemy.z = 1;
  state.playerHealth = 1;
  const next = advanceEnemy(state, 0.05);

  assert.equal(next.playerHealth, 0);
  assert.equal(next.status, 'lost');
  assert.deepEqual(advanceEnemy(next, 1), next);
});

test('sans temps écoulé, avec un ennemi mort ou après la défaite, rien ne change', () => {
  for (const dt of [0, -1]) {
    const state = newGame();
    state.enemy.z = 1;
    assert.deepEqual(advanceEnemy(state, dt), state);
  }

  for (const changes of [{targetHealth: 0}, {status: 'lost'}]) {
    const state = {...newGame(), ...changes, attackCooldown: 0.5};
    assert.deepEqual(advanceEnemy(state, 1), state);
  }
});

test('30 et 60 images par seconde donnent la même poursuite et les mêmes attaques', () => {
  function run(fps) {
    let state = newGame();
    for (let frame = 0; frame < fps * 4.5; frame++) state = advanceEnemy(state, 1 / fps);
    return state;
  }

  const at30 = run(30);
  const at60 = run(60);
  assert.ok(Math.abs(at30.enemy.z - 1) < 0.000001);
  assert.equal(at30.playerHealth, 1);
  assert.ok(Math.abs(at30.enemy.z - at60.enemy.z) < 0.000001);
  assert.ok(Math.abs(at30.attackCooldown - at60.attackCooldown) < 0.000001);
  assert.equal(at30.playerHealth, at60.playerHealth);
  assert.equal(at30.status, at60.status);
});

test('ni la poursuite ni les attaques ne modifient l’état précédent', () => {
  for (const z of [-2, 1]) {
    const state = newGame();
    state.enemy.z = z;
    const before = structuredClone(state);
    const next = advanceEnemy(state, 0.05);

    assert.deepEqual(state, before);
    assert.notEqual(next, state);
    assert.notEqual(next.enemy, state.enemy);
  }
});

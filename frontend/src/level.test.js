import assert from 'node:assert/strict';
import test from 'node:test';
import {EXIT, atExit, canStand, hasLineOfSight, moveInLevel} from './level.js';

test('la cloison bloque le centre, le passage à droite reste libre', () => {
  assert.equal(canStand(0, -0.5, 0.25), false);
  assert.equal(canStand(3.5, -0.5, 0.25), true);
});

test('le joueur garde son rayon à l’intérieur des quatre murs extérieurs', () => {
  assert.equal(canStand(5.75, 2, 0.25), true);
  assert.equal(canStand(5.76, 2, 0.25), false);
  assert.deepEqual(moveInLevel({x: 5.7, z: 2}, 0.15, 0, 0.25), {x: 5.75, z: 2});
});

test('marcher contre la cloison ne permet pas de la traverser', () => {
  let position = {x: 0, z: 2};
  for (let frame = 0; frame < 60; frame++) {
    position = moveInLevel(position, 0, -0.15, 0.25);
    assert.equal(canStand(position.x, position.z, 0.25), true);
  }
  assert.ok(position.z >= -0.25);
});

test('on peut longer la cloison et passer par l’ouverture', () => {
  const start = {x: 0, z: -0.15};
  assert.deepEqual(moveInLevel(start, 0.15, -0.15, 0.25), {x: 0.15, z: -0.15});
  assert.deepEqual(start, {x: 0, z: -0.15});

  let position = {x: 3.5, z: 0};
  for (let frame = 0; frame < 10; frame++) position = moveInLevel(position, 0, -0.15, 0.25);
  assert.ok(position.z < -1);
});

test('un ennemi plus large peut toucher le bout du mur sans entrer dedans', () => {
  assert.equal(canStand(2.4, -0.5, 0.5), false);
  assert.equal(canStand(2.5, -0.5, 0.5), true);
  assert.equal(hasLineOfSight({x: 2.5, z: 2}, {x: 2.5, z: -2}, 0.5), true);
});

test('la cloison coupe la ligne de vue, le passage et le même côté restent visibles', () => {
  assert.equal(hasLineOfSight({x: 0, z: 2}, {x: 0, z: -2}), false);
  assert.equal(hasLineOfSight({x: 3.5, z: 2}, {x: 3.5, z: -2}), true);
  assert.equal(hasLineOfSight({x: 0, z: 2}, {x: 0, z: 1}), true);
  assert.equal(hasLineOfSight({x: 0, z: 2}, {x: 0, z: 2}), true);
});

test('la sortie est une zone précise à atteindre', () => {
  assert.equal(atExit({x: EXIT.x, z: EXIT.z}), true);
  assert.equal(atExit({x: EXIT.x + EXIT.width / 2, z: EXIT.z}), true);
  assert.equal(atExit({x: EXIT.x + EXIT.width / 2 + 0.01, z: EXIT.z}), false);
  assert.equal(atExit({x: 0, z: 2}), false);
});

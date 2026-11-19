import assert from 'node:assert/strict';
import test from 'node:test';
import {atExit, canStand, hasLineOfSight, moveInLevel} from './level.js';
import {ARENA} from '../tests/arena.js';

const EXIT = ARENA.exit;

test('un déplacement rapide ne traverse pas une cloison fine ni un autre acteur', () => {
  const level = {...ARENA, walls: [{x: 0, z: 0, width: 4, depth: 0.2}]};
  const next = moveInLevel({x: 0, z: 2}, 0, -4, 0.25, level);
  assert.ok(next.z >= 0.35);
  const actor = moveInLevel({x: 0, z: 2}, 4, 0, 0.25, {...level, walls: []}, [{x: 2, z: 2, radius: 0.5}]);
  assert.ok(actor.x <= 1.25);
});

test('la cloison bloque le centre, le passage à droite reste libre', () => {
  assert.equal(canStand(0, -0.5, 0.25, ARENA), false);
  assert.equal(canStand(3.5, -0.5, 0.25, ARENA), true);
});

test('le rayon du joueur lui interdit de dépasser le bord de la pièce', () => {
  assert.equal(canStand(5.75, 2, 0.25, ARENA), true);
  assert.equal(canStand(5.76, 2, 0.25, ARENA), false);
});

test('on peut longer la cloison et passer par l’ouverture', () => {
  const start = {x: 0, z: -0.25};
  assert.deepEqual(moveInLevel(start, 0.15, -0.15, 0.25, ARENA), {x: 0.15, z: -0.25});
  assert.deepEqual(start, {x: 0, z: -0.25});

  let position = {x: 3.5, z: 0};
  for (let frame = 0; frame < 10; frame++) position = moveInLevel(position, 0, -0.15, 0.25, ARENA);
  assert.ok(position.z < -1);
});

test('un ennemi plus large peut toucher le bout du mur sans entrer dedans', () => {
  assert.equal(canStand(2.4, -0.5, 0.5, ARENA), false);
  assert.equal(canStand(2.5, -0.5, 0.5, ARENA), true);
  assert.equal(hasLineOfSight({x: 2.5, z: 2}, {x: 2.5, z: -2}, 0.5, ARENA), true);
});

test('la cloison coupe la ligne de vue, le passage et le même côté restent visibles', () => {
  assert.equal(hasLineOfSight({x: 0, z: 2}, {x: 0, z: -2}, 0, ARENA), false);
  assert.equal(hasLineOfSight({x: 3.5, z: 2}, {x: 3.5, z: -2}, 0, ARENA), true);
  assert.equal(hasLineOfSight({x: 0, z: 2}, {x: 0, z: 1}, 0, ARENA), true);
  assert.equal(hasLineOfSight({x: 0, z: 2}, {x: 0, z: 2}, 0, ARENA), true);
});

test('la sortie est une zone précise à atteindre', () => {
  assert.equal(atExit({x: EXIT.x, z: EXIT.z}, ARENA), true);
  assert.equal(atExit({x: EXIT.x + EXIT.width / 2, z: EXIT.z}, ARENA), true);
  assert.equal(atExit({x: EXIT.x + EXIT.width / 2 + 0.01, z: EXIT.z}, ARENA), false);
  assert.equal(atExit({x: 0, z: 2}, ARENA), false);
});

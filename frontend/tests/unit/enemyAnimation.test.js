import assert from 'node:assert/strict';
import test from 'node:test';
import {enemyFrame} from '../../src/engine/enemyAnimation.js';

test('un garde immobile garde sa pose de repos', () => {
  assert.equal(enemyFrame({mode: 'idle'}, 0), 0);
  assert.equal(enemyFrame({mode: 'idle'}, 10), 0);
});

test('la marche alterne les deux pas à six images par seconde', () => {
  assert.equal(enemyFrame({mode: 'walk'}, 0), 1);
  assert.equal(enemyFrame({mode: 'walk'}, 0.2), 2);
  assert.equal(enemyFrame({mode: 'walk'}, 0.4), 1);
});

test('une attaque utilise la pose griffes levées', () => {
  assert.equal(enemyFrame({mode: 'attack'}, 0.2), 3);
});

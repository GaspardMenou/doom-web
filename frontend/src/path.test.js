import assert from 'node:assert/strict';
import test from 'node:test';
import {canStand, hasLineOfSight} from './level.js';
import {nextWaypoint} from './path.js';

test('un trajet libre vise directement le joueur', () => {
  const from = {x: 3.5, z: 2};
  const to = {x: 3.5, z: -2};

  assert.equal(nextWaypoint(from, to), to);
});

test('le trajet contourne le bloc central dans les deux sens', () => {
  for (const [from, to] of [
    [{x: 0, z: 2}, {x: 0, z: -4.5}],
    [{x: 0, z: -4.5}, {x: 0, z: 2}],
  ]) {
    const next = nextWaypoint(from, to);
    assert.notDeepEqual(next, from);
    assert.ok(canStand(next.x, next.z, 0.5));
    assert.ok(hasLineOfSight(from, next, 0.5));
  }
});

test('une destination dans la cloison ne fait pas inventer un passage', () => {
  const from = {x: 0, z: 2};

  assert.equal(nextWaypoint(from, {x: 0, z: -0.5}), from);
});

test('près du coin, le prochain point laisse assez de place pour tout le corps', () => {
  const from = {x: 2.49, z: 0.01};
  const next = nextWaypoint(from, {x: 0, z: -4.5});

  assert.ok(hasLineOfSight(from, next, 0.5));
  assert.ok(canStand(next.x, next.z, 0.5));
});

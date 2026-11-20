import assert from 'node:assert/strict';
import test from 'node:test';
import {populateLevel} from '../../src/game/mission.js';
import {canStand} from '../../src/game/level.js';
import {LEVELS} from '../../src/game/levels/index.js';
import {ENEMY_TYPES} from '../../src/game/enemyTypes.js';

const level = {
  size: 64, 
  spawn: {x: 0, z: 28}, 
  walls: [{
    x: 0, 
    z: 0, 
    width: 12, 
    depth: 1}],
  enemies: [{id: 'a', type: 'guard', x: -20, z: -20}, {id: 'b', type: 'brute', x: 20, z: -20}],
  medkits: [{id: 'h', x: 20, z: 20}], exit: {x: 28, z: -28, width: 3, depth: 3}
};

test('une graine reproduit le placement et une autre renouvelle les rencontres sans changer le plan', () => {
  const before = structuredClone(level);
  const first = populateLevel(level, 123);
  assert.deepEqual(populateLevel(level, 123), first);
  assert.notDeepEqual(populateLevel(level, 456), first);
  assert.deepEqual(level, before);
});

test('les placements aléatoires restent libres et éloignés du départ', () => {
  for (let seed = 0; seed < 30; seed++) {
    const mission = populateLevel(level, seed);
    for (const enemy of mission.enemies) {
      assert.ok(canStand(enemy.x, enemy.z, 0.7, level));
      assert.ok(Math.hypot(enemy.x - level.spawn.x, enemy.z - level.spawn.z) > 22);
    }
    assert.ok(canStand(mission.medkits[0].x, mission.medkits[0].z, 0.35, level));
    assert.equal(mission.medkits[0].taken, false);
  }
});

test('la redistribution ne superpose pas deux ennemis, y compris avec la graine 31', () => {
  const mission = populateLevel(LEVELS[1], 31 + 9973);
  for (const [index, enemy] of mission.enemies.entries()) {
    for (const other of mission.enemies.slice(index + 1)) {
      assert.ok(Math.hypot(enemy.x - other.x, enemy.z - other.z) >= ENEMY_TYPES[enemy.type].radius + ENEMY_TYPES[other.type].radius);
    }
  }
});

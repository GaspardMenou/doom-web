import assert from 'node:assert/strict';
import test from 'node:test';
import {LEVELS} from '../../src/game/levels/index.js';
import {canStand, hasLineOfSight} from '../../src/game/level.js';
import {nextWaypoint} from '../../src/game/path.js';
import {ENEMY_TYPES} from '../../src/game/enemyTypes.js';
import {routesFromSpawn} from '../fixtures/routes.js';

test('la campagne propose trois grands secteurs peuplés de plusieurs types d’ennemis', () => {
  assert.deepEqual(LEVELS.map(level => level.size), [64, 80, 96]);
  assert.deepEqual(LEVELS.map(level => level.enemies.length), [12, 18, 24]);
  for (const level of LEVELS) {
    assert.ok(Math.hypot(level.exit.x - level.spawn.x, level.exit.z - level.spawn.z) >= level.size * 0.9);
    assert.deepEqual(new Set(level.enemies.map(enemy => enemy.type)), new Set(Object.keys(ENEMY_TYPES)));
    assert.ok(level.medkits.length >= 4);
  }
  const ids = LEVELS.flatMap(level => [...level.enemies, ...level.medkits].map(object => object.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('les départs, sas, gardes et soins sont libres et le départ reste au calme', () => {
  for (const level of LEVELS) {
    assert.ok(canStand(level.spawn.x, level.spawn.z, 0.7, level));
    assert.ok(canStand(level.exit.x, level.exit.z, 0.7, level));
    assert.ok(level.exit.width >= 3 && level.exit.depth >= 3);
    assert.equal(hasLineOfSight(level.spawn, level.exit, 0, level), false);
    for (const enemy of level.enemies) {
      const spec = ENEMY_TYPES[enemy.type];
      assert.ok(canStand(enemy.x, enemy.z, spec.radius, level), `${enemy.id} est dans un mur`);
      assert.ok(Math.hypot(enemy.x - level.spawn.x, enemy.z - level.spawn.z) > spec.detectRange ||
        !hasLineOfSight(enemy, level.spawn, 0, level), `${enemy.id} voit le départ`);
    }
    for (const medkit of level.medkits) assert.ok(canStand(medkit.x, medkit.z, 0.25, level), medkit.id);
    for (const wall of level.walls) {
      assert.ok(Math.abs(wall.x) + wall.width / 2 <= level.size / 2 - 3);
      assert.ok(Math.abs(wall.z) + wall.depth / 2 <= level.size / 2 - 3);
    }
  }
});

test('chaque secteur offre deux routes complètes sans imposer un unique zigzag', () => {
  const routes = [
    [[{x: -28, z: 28}, {x: -28, z: -28}], [{x: 28, z: 28}, {x: 28, z: -28}]],
    [[{x: -24, z: 28}, {x: -24, z: -30}, {x: 32, z: -30}],
      [{x: 24, z: 28}, {x: 24, z: -30}, {x: 32, z: -30}]],
    [[{x: -22, z: 40}, {x: -22, z: -40}, {x: 0, z: -40}],
      [{x: 22, z: 40}, {x: 22, z: -40}, {x: 0, z: -40}]],
  ];
  for (const [index, level] of LEVELS.entries()) {
    for (const turns of routes[index]) {
      const route = [level.spawn, ...turns, level.exit];
      for (let step = 1; step < route.length; step++) {
        assert.ok(hasLineOfSight(route[step - 1], route[step], 0.7, level), `${level.name} : passage bloqué`);
        assert.ok(canStand(route[step].x, route[step].z, 0.7, level));
      }
    }
  }
});

for (const level of LEVELS) {
  test(`${level.name} : tous les gardes, soins et le sas sont reliés au départ`, () => {
    const reaches = routesFromSpawn(level);
    for (const destination of [level.exit, ...level.medkits, ...level.enemies]) {
      assert.ok(reaches(destination), `${level.name} : zone inaccessible (${destination.id ?? 'sas'})`);
    }
    for (const enemy of level.enemies) {
      const radius = ENEMY_TYPES[enemy.type].radius;
      const next = nextWaypoint(enemy, level.spawn, radius, level);
      assert.notDeepEqual(next, {x: enemy.x, z: enemy.z}, `${enemy.id} reste bloqué`);
      assert.ok(canStand(next.x, next.z, radius, level));
      assert.ok(hasLineOfSight(enemy, next, radius, level));
    }
  });
}

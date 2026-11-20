import assert from 'node:assert/strict';
import test from 'node:test';
import {populateLevel} from '../../src/game/mission.js';
import {canStand, hasLineOfSight} from '../../src/game/level.js';
import {routesFromSpawn} from '../fixtures/routes.js';
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

test('une graine reproduit les murs, le sas et les rencontres sans modifier le modèle', () => {
  const before = structuredClone(level);
  const first = populateLevel(level, 123);
  assert.deepEqual(populateLevel(level, 123), first);
  assert.notDeepEqual(populateLevel(level, 456), first);
  assert.ok(first.walls.length > 0);
  assert.notDeepEqual(first.walls, populateLevel(level, 456).walls);
  assert.notDeepEqual(first.exit, populateLevel(level, 456).exit);
  assert.deepEqual(level, before);
  for (const template of LEVELS) {
    assert.notDeepEqual(populateLevel(template, 54321).walls, template.walls,
      `${template.name} : la graine 54321 doit trouver une variante praticable`);
  }
});

test('les placements aléatoires restent libres et éloignés du départ', () => {
  for (let seed = 0; seed < 30; seed++) {
    const mission = populateLevel(level, seed);
    for (const enemy of mission.enemies) {
      assert.ok(canStand(enemy.x, enemy.z, 0.7, mission));
      assert.ok(Math.hypot(enemy.x - level.spawn.x, enemy.z - level.spawn.z) > 22);
    }
    assert.ok(canStand(mission.medkits[0].x, mission.medkits[0].z, 0.35, mission));
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

test('les plans seedés gardent un sas dégagé et tous les acteurs accessibles depuis un départ calme', () => {
  for (const template of LEVELS) {
    for (const seed of [0, 1, 2, 31, 123, 456]) {
      const mission = populateLevel(template, seed);
      const reaches = routesFromSpawn(mission);
      assert.ok(canStand(mission.exit.x, mission.exit.z, 2.2, mission), `${template.name}/${seed} : sas coincé`);
      assert.ok(Math.hypot(mission.exit.x - mission.spawn.x, mission.exit.z - mission.spawn.z) >= mission.size * 0.75);
      for (const point of [mission.exit, ...mission.enemies, ...mission.medkits]) {
        assert.ok(reaches(point), `${template.name}/${seed} : ${point.id ?? 'sas'} inaccessible`);
      }
      for (const enemy of mission.enemies) {
        assert.ok(Math.hypot(enemy.x - mission.spawn.x, enemy.z - mission.spawn.z) > ENEMY_TYPES[enemy.type].detectRange ||
          !hasLineOfSight(enemy, mission.spawn, 0, mission), `${template.name}/${seed} : départ exposé`);
      }
    }
  }
});

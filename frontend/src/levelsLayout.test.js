import assert from 'node:assert/strict';
import test from 'node:test';
import {LEVELS} from './levels/index.js';
import {canStand, hasLineOfSight, moveInLevel} from './level.js';
import {nextWaypoint} from './path.js';

test('trois vrais plans de tailles différentes accueillent trois, quatre puis cinq gardes', () => {
  assert.deepEqual(LEVELS.map(level => level.size), [12, 14, 16]);
  assert.deepEqual(LEVELS.map(level => level.enemies.length), [3, 4, 5]);
  const ids = LEVELS.flatMap(level => level.enemies.map(enemy => enemy.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('les départs, sorties et gardes sont libres et la campagne ne commence pas sous attaque', () => {
  for (const level of LEVELS) {
    for (const radius of [0.25, 0.5]) {
      assert.ok(canStand(level.spawn.x, level.spawn.z, radius, level));
      assert.ok(canStand(level.exit.x, level.exit.z, radius, level));
    }
    assert.equal(hasLineOfSight(level.spawn, level.exit, 0, level), false);
    for (const enemy of level.enemies) {
      assert.ok(canStand(enemy.x, enemy.z, 0.5, level));
      const distance = Math.hypot(enemy.x - level.spawn.x, enemy.z - level.spawn.z);
      assert.ok(distance > 4 || !hasLineOfSight(enemy, level.spawn, 0, level));
    }
    for (const wall of level.walls) {
      assert.ok(Math.abs(wall.x) + wall.width / 2 <= level.size / 2);
      assert.ok(Math.abs(wall.z) + wall.depth / 2 <= level.size / 2);
    }
  }
});

test('le dépôt offre deux routes complètes de part et d’autre du bloc central', () => {
  const level = LEVELS[0];
  for (const side of [-3.5, 3.5]) {
    const route = [level.spawn, {x: side, z: 2}, {x: side, z: -4.5}, level.exit];
    for (let index = 1; index < route.length; index++) {
      assert.ok(hasLineOfSight(route[index - 1], route[index], 0.5, level));
      assert.ok(canStand(route[index].x, route[index].z, 0.5, level));
    }
  }
});

function followRoute(from, to, level) {
  let position = {x: from.x, z: from.z};
  for (let step = 0; step < 3000; step++) {
    if (Math.hypot(position.x - to.x, position.z - to.z) <= 0.75 && hasLineOfSight(position, to, 0, level)) return;
    const waypoint = nextWaypoint(position, to, 0.5, level);
    const dx = waypoint.x - position.x;
    const dz = waypoint.z - position.z;
    const distance = Math.hypot(dx, dz);
    assert.ok(distance > 0, `Trajet bloqué dans ${level.name}`);
    const travel = Math.min(distance, 0.05);
    position = moveInLevel(position, dx / distance * travel, dz / distance * travel, 0.5, level);
    assert.ok(canStand(position.x, position.z, 0.5, level));
  }
  assert.fail(`Destination inaccessible dans ${level.name}`);
}

for (const level of LEVELS) {
  test(`${level.name} : le BFS rejoint la sortie et chaque garde peut rejoindre le départ`, () => {
    followRoute(level.spawn, level.exit, level);
    for (const enemy of level.enemies) followRoute(enemy, level.spawn, level);
  });
}

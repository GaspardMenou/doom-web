import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceProjectiles} from '../../src/game/projectiles.js';

const arena = {size: 80, walls: []};
function scenario(projectiles = [{}], player = {x: 20, z: 10}) {
  return {levelIndex: 0, status: 'playing', playerHealth: 3, player,
    projectiles: projectiles.map((projectile, index) => ({id: index, ownerId: 'gunner', x: 0, z: 10,
      vx: 10, vz: 0, radius: 0.18, life: 3, ...projectile})),
  };
}

test('un projectile avance en ligne droite et peut être esquivé sans devenir une tête chercheuse', () => {
  const state = scenario();
  const before = structuredClone(state);
  const next = advanceProjectiles(state, 0.1, arena);
  assert.deepEqual(state, before);
  assert.equal(next.projectiles[0].x, 1);
  assert.equal(next.projectiles[0].z, 10);
  assert.equal(next.projectiles[0].life, 2.9);
  const dodged = advanceProjectiles({...next, player: {x: 2, z: 11}}, 0.2, arena);
  assert.equal(dodged.playerHealth, 3);
  assert.equal(dodged.projectiles[0].z, 10);
});

test('le segment du projectile touche le joueur même entre deux images et disparaît après un seul dégât', () => {
  const state = scenario([{x: -2, vx: 20}], {x: 0, z: 10});
  const next = advanceProjectiles(state, 0.2, arena);
  assert.equal(next.playerHealth, 2);
  assert.equal(next.projectiles.length, 0);
});

test('le rayon du projectile compte pour les impacts qui frôlent le joueur', () => {
  for (const [z, health] of [[10.42, 2], [10.44, 3]]) {
    const next = advanceProjectiles(scenario([{x: -1, z, vx: 20}], {x: 0, z: 10}), 0.1, arena);
    assert.equal(next.playerHealth, health);
  }
});

test('un mur intercepte le projectile avant le joueur, mais pas si le joueur est touché en premier', () => {
  const wall = {...arena, walls: [{x: 0, z: 10, width: 0.2, depth: 4}]};
  const blocked = advanceProjectiles(scenario([{x: -2, vx: 20}], {x: 1.5, z: 10}), 0.2, wall);
  assert.equal(blocked.playerHealth, 3);
  assert.equal(blocked.projectiles.length, 0);
  const hitFirst = advanceProjectiles(scenario([{x: -3, vx: 20}], {x: -1, z: 10}), 0.2, wall);
  assert.equal(hitFirst.playerHealth, 2);
});

test('les projectiles expirés ou sortis du niveau sont supprimés', () => {
  const state = scenario([{life: 0.05}, {x: 39, vx: 20}]);
  assert.equal(advanceProjectiles(state, 0.1, arena).projectiles.length, 0);
});

test('plusieurs impacts terminent la partie sans vie négative', () => {
  const state = {...scenario([{x: -1, vx: 20}, {x: -1, vx: 20}], {x: 0, z: 10}), playerHealth: 1};
  const next = advanceProjectiles(state, 0.1, arena);
  assert.equal(next.playerHealth, 0);
  assert.equal(next.status, 'lost');
});

test('la fin de partie et une durée nulle figent les projectiles', () => {
  const state = scenario();
  assert.equal(advanceProjectiles(state, 0, arena), state);
  for (const status of ['lost', 'won']) {
    const ended = {...state, status};
    assert.equal(advanceProjectiles(ended, 0.1, arena), ended);
  }
});

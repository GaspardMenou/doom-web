import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceEnemy, createEnemy} from '../../src/game/enemy.js';
import {canStand} from '../../src/game/level.js';

const arena = {size: 80, walls: []};
const divider = {...arena, walls: [{x: 0, z: 0, width: 4, depth: 2}]};

function scenario(enemies = [{}], player = {x: 0, z: 10, angle: 0}) {
  return {levelIndex: 0, status: 'playing', player, playerHealth: 3,
    projectiles: [], nextProjectileId: 0,
    enemies: enemies.map((enemy, index) => ({...createEnemy({id: 'test-' + index, x: 0, z: 20}), ...enemy})),
  };
}

test('les quatre types démarrent avec leurs vies, leur taille et une alerte indépendante', () => {
  const spawn = {id: 'spawn', type: 'runner', x: 2, z: 10};
  const runner = createEnemy(spawn);
  assert.deepEqual([runner.health, runner.radius, runner.mode, runner.alerted], [1, 0.4, 'idle', false]);
  assert.deepEqual(['guard', 'runner', 'brute', 'gunner'].map(type => createEnemy({...spawn, type}).health), [2, 1, 5, 3]);
  runner.health = 0;
  assert.equal(createEnemy(spawn).health, 1);
  assert.equal('health' in spawn, false);
});

test('les gardes détectent à quatorze mètres avec vue libre et les sentinelles voient plus loin', () => {
  assert.equal(advanceEnemy(scenario([{z: 24}]), 0.05, arena).enemies[0].alerted, true);
  const far = scenario([{z: 24.01}]);
  const next = advanceEnemy(far, 0.05, arena);
  assert.equal(next.enemies[0].alerted, false);
  assert.equal(next.enemies[0].z, 24.01);
  const hidden = scenario([{z: -3}], {x: 0, z: 3});
  assert.equal(advanceEnemy(hidden, 0.05, divider).enemies[0].alerted, false);
  const gunner = scenario([createEnemy({id: 'gunner', type: 'gunner', x: 0, z: 32})]);
  assert.equal(advanceEnemy(gunner, 0.05, arena).enemies[0].alerted, true);
});

test('un garde alerté mémorise le joueur derrière un mur et abandonne au-delà de vingt-huit mètres', () => {
  const hidden = scenario([{z: -3, alerted: true}], {x: 0, z: 3});
  const chasing = advanceEnemy(hidden, 0.05, divider);
  assert.equal(chasing.enemies[0].alerted, true);
  assert.equal(chasing.enemies[0].mode, 'walk');
  assert.ok(canStand(chasing.enemies[0].x, chasing.enemies[0].z, 0.5, divider));
  const edge = scenario([{x: -14, z: 10, alerted: true}], {x: 14, z: 10});
  assert.equal(advanceEnemy(edge, 0.05, arena).enemies[0].alerted, true);
  edge.player.x = 14.01;
  const lost = advanceEnemy(edge, 0.05, arena).enemies[0];
  assert.equal(lost.alerted, false);
  assert.equal(lost.x, -14);
  assert.equal(lost.mode, 'idle');
});

test('un traqueur court plus vite que le garde et le colosse, même en diagonale', () => {
  for (const [type, speed] of [['guard', 2.2], ['runner', 5], ['brute', 1.6]]) {
    const enemy = createEnemy({id: type, type, x: 2, z: 20});
    const next = advanceEnemy(scenario([enemy]), 0.2, arena).enemies[0];
    assert.ok(Math.abs(Math.hypot(next.x - 2, next.z - 20) - speed * 0.2) < 0.000001);
    assert.equal(next.mode, 'walk');
  }
});

test('un garde s’arrête à portée et peut attaquer sans déplacement ni division par zéro', () => {
  const next = advanceEnemy(scenario([{z: 11.11}]), 0.05, arena);
  assert.ok(Math.abs(next.enemies[0].z - 11.1) < 0.000001);
  assert.equal(next.playerHealth, 2);
  assert.equal(next.enemies[0].mode, 'attack');
  const overlap = advanceEnemy(scenario([{z: 10}]), 0.05, arena);
  assert.equal(overlap.enemies[0].x, 0);
  assert.equal(overlap.enemies[0].z, 10);
  assert.equal(overlap.playerHealth, 2);
});

test('chaque attaque attend une seconde et sa pose dure les premières 0,3 seconde', () => {
  let state = advanceEnemy(scenario([{z: 11}]), 0.05, arena);
  assert.equal(state.playerHealth, 2);
  assert.equal(state.enemies[0].attackCooldown, 1);
  state = advanceEnemy(state, 0.2, arena);
  assert.equal(state.enemies[0].mode, 'attack');
  state = advanceEnemy(state, 0.11, arena);
  assert.equal(state.enemies[0].mode, 'idle');
  assert.equal(state.playerHealth, 2);
  state = advanceEnemy(state, 0.69, arena);
  assert.equal(state.playerHealth, 1);
});

test('les délais des gardes restent indépendants et diminuent aussi sans alerte', () => {
  const next = advanceEnemy(scenario([{z: 11, attackCooldown: 0.4}, {x: 1, z: 10}]), 0.05, arena);
  assert.equal(next.playerHealth, 2);
  assert.ok(Math.abs(next.enemies[0].attackCooldown - 0.35) < 0.000001);
  assert.equal(next.enemies[1].attackCooldown, 1);
  const far = scenario([{x: -19, z: 10, attackCooldown: 0.8}], {x: 19, z: 10});
  assert.ok(Math.abs(advanceEnemy(far, 0.25, arena).enemies[0].attackCooldown - 0.55) < 0.000001);
});

test('plusieurs ennemis peuvent attaquer ensemble sans rendre la vie négative', () => {
  const state = scenario([{z: 11}, {x: 1, z: 10}]);
  assert.equal(advanceEnemy(state, 0.05, arena).playerHealth, 1);
  state.playerHealth = 1;
  const next = advanceEnemy(state, 0.05, arena);
  assert.equal(next.playerHealth, 0);
  assert.equal(next.status, 'lost');
});

test('un mur bloque les coups et les tirs des ennemis alertés', () => {
  const wall = {...arena, walls: [{x: 0, z: 10, width: 4, depth: 0.2}]};
  const state = scenario([{z: 9.5, alerted: true}], {x: 0, z: 10.5});
  assert.equal(advanceEnemy(state, 0.05, wall).playerHealth, 3);
  const gunner = scenario([{...createEnemy({id: 'g', type: 'gunner', x: 0, z: -3}), alerted: true}], {x: 0, z: 3});
  assert.equal(advanceEnemy(gunner, 0.05, divider).projectiles.length, 0);
});

test('la sentinelle tire un projectile dirigé vers le joueur sans dommage instantané', () => {
  const state = scenario([createEnemy({id: 'gunner', type: 'gunner', x: 0, z: 22})]);
  const next = advanceEnemy(state, 0.05, arena);
  assert.equal(next.playerHealth, 3);
  assert.equal(next.projectiles.length, 1);
  assert.equal(next.projectiles[0].ownerId, 'gunner');
  assert.equal(next.projectiles[0].vx, 0);
  assert.equal(next.projectiles[0].vz, -10);
  assert.equal(next.nextProjectileId, 1);
  assert.equal(next.enemies[0].mode, 'attack');
  assert.equal(advanceEnemy(next, 0.05, arena).projectiles.length, 1);
});

test('la sentinelle recule quand le joueur arrive trop près', () => {
  const state = scenario([createEnemy({id: 'gunner', type: 'gunner', x: 0, z: 15})]);
  const next = advanceEnemy(state, 0.1, arena).enemies[0];
  assert.ok(next.z > 15);
  assert.ok(next.z < 20);
});

test('la poursuite garde brièvement son chemin pour ne pas recalculer le BFS à chaque image', () => {
  const state = scenario([{z: -3, alerted: true}], {x: 0, z: 3});
  const first = advanceEnemy(state, 0.05, divider);
  const next = advanceEnemy(first, 0.05, divider);
  assert.ok(first.enemies[0].pathCooldown > next.enemies[0].pathCooldown);
  assert.deepEqual(next.enemies[0].waypoint, first.enemies[0].waypoint);
});

test('les ennemis vivants ne traversent pas les autres gardes', () => {
  const state = scenario([{z: 13}, {z: 14}], {x: 0, z: 10});
  const next = advanceEnemy(state, 0.2, arena);
  assert.ok(Math.hypot(next.enemies[0].x - next.enemies[1].x, next.enemies[0].z - next.enemies[1].z) >= 1 - 0.000001);
});

test('un mort ne poursuit ni n’attaque et les autres gardes continuent', () => {
  const state = scenario([{z: 11, health: 0, mode: 'dead'}, {}]);
  const next = advanceEnemy(state, 0.05, arena);
  assert.equal(next.enemies[0], state.enemies[0]);
  assert.equal(next.playerHealth, 3);
  assert.equal(next.enemies[1].mode, 'walk');
});

test('sans temps écoulé ou après la fin, les ennemis restent figés', () => {
  const state = scenario();
  assert.equal(advanceEnemy(state, 0), state);
  assert.equal(advanceEnemy(state, -1), state);
  for (const status of ['lost', 'won']) {
    const ended = {...state, status};
    assert.equal(advanceEnemy(ended, 0.05), ended);
  }
});

test('30 et 60 images par seconde donnent les mêmes attaques et positions', () => {
  function run(fps) {
    let state = scenario([{z: 15.5}]);
    for (let frame = 0; frame < fps * 3.5; frame++) state = advanceEnemy(state, 1 / fps, arena);
    return state;
  }
  const at30 = run(30);
  const at60 = run(60);
  assert.equal(at30.playerHealth, 1);
  assert.equal(at30.playerHealth, at60.playerHealth);
  assert.ok(Math.abs(at30.enemies[0].z - at60.enemies[0].z) < 0.000001);
  assert.ok(Math.abs(at30.enemies[0].attackCooldown - at60.enemies[0].attackCooldown) < 0.000001);
});

test('la poursuite, la détection et les attaques ne modifient pas l’état précédent', () => {
  const state = scenario([{z: 11}, {}]);
  const before = structuredClone(state);
  const next = advanceEnemy(state, 0.05, arena);
  assert.deepEqual(state, before);
  assert.notEqual(next.enemies, state.enemies);
});

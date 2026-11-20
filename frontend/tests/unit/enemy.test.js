import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceEnemy, createEnemy} from '../../src/game/enemy.js';
import {canStand} from '../../src/game/level.js';
import {ENEMY_TYPES} from '../../src/game/enemyTypes.js';

const arena = {size: 80, walls: []};
const divider = {...arena, walls: [{x: 0, z: 0, width: 4, depth: 2}]};
const guard = ENEMY_TYPES.guard;

function scenario(enemies = [{}], player = {x: 0, z: 10, angle: 0}) {
  return {levelIndex: 0, status: 'playing', player, playerHealth: 3,
    projectiles: [], nextProjectileId: 0,
    enemies: enemies.map((enemy, index) => ({...createEnemy({id: 'test-' + index, x: 0, z: 20}), ...enemy})),
  };
}

test('les quatre types démarrent avec leurs vies, leur taille et une alerte indépendante', () => {
  const spawn = {id: 'spawn', type: 'runner', x: 2, z: 10};
  const runner = createEnemy(spawn);
  assert.deepEqual([runner.health, runner.radius, runner.mode, runner.alerted],
    [ENEMY_TYPES.runner.health, ENEMY_TYPES.runner.radius, 'idle', false]);
  for (const [type, spec] of Object.entries(ENEMY_TYPES)) {
    assert.equal(createEnemy({...spawn, type}).health, spec.health);
  }
  runner.health = 0;
  assert.equal(createEnemy(spawn).health, ENEMY_TYPES.runner.health);
  assert.equal('health' in spawn, false);
});

test('chaque type détecte à sa portée avec vue libre et ignore un joueur derrière un mur', () => {
  for (const [type, spec] of Object.entries(ENEMY_TYPES)) {
    const enemy = createEnemy({id: type, type, x: 0, z: 10 + spec.detectRange});
    assert.equal(advanceEnemy(scenario([enemy]), 0.05, arena).enemies[0].alerted, true, type);
    const far = {...enemy, z: enemy.z + 0.01};
    const next = advanceEnemy(scenario([far]), 0.05, arena).enemies[0];
    assert.equal(next.alerted, false, type);
    assert.equal(next.z, far.z);
    const hidden = scenario([{...enemy, z: -3}], {x: 0, z: 3});
    assert.equal(advanceEnemy(hidden, 0.05, divider).enemies[0].alerted, false, type);
  }
});

test('un garde alerté mémorise le joueur derrière un mur et abandonne au-delà de sa portée d’oubli', () => {
  const hidden = scenario([{z: -3, alerted: true}], {x: 0, z: 3});
  const chasing = advanceEnemy(hidden, 0.05, divider);
  assert.equal(chasing.enemies[0].alerted, true);
  assert.equal(chasing.enemies[0].mode, 'walk');
  assert.ok(canStand(chasing.enemies[0].x, chasing.enemies[0].z, guard.radius, divider));
  const halfRange = guard.forgetRange / 2;
  const edge = scenario([{x: -halfRange, z: 10, alerted: true}], {x: halfRange, z: 10});
  assert.equal(advanceEnemy(edge, 0.05, arena).enemies[0].alerted, true);
  edge.player.x += 0.01;
  const lost = advanceEnemy(edge, 0.05, arena).enemies[0];
  assert.equal(lost.alerted, false);
  assert.equal(lost.x, -halfRange);
  assert.equal(lost.mode, 'idle');
});

test('les ennemis de mêlée respectent leur vitesse du catalogue, même en diagonale', () => {
  for (const type of ['guard', 'runner', 'brute']) {
    const enemy = createEnemy({id: type, type, x: 2, z: 20});
    const next = advanceEnemy(scenario([enemy]), 0.2, arena).enemies[0];
    assert.ok(Math.abs(Math.hypot(next.x - 2, next.z - 20) - ENEMY_TYPES[type].speed * 0.2) < 0.000001);
    assert.equal(next.mode, 'walk');
  }
});

test('un garde s’arrête à portée et peut attaquer sans déplacement ni division par zéro', () => {
  const next = advanceEnemy(scenario([{z: 10 + guard.attackRange + 0.01}]), 0.05, arena);
  assert.ok(Math.abs(next.enemies[0].z - (10 + guard.attackRange)) < 0.000001);
  assert.equal(next.playerHealth, 2);
  assert.equal(next.enemies[0].mode, 'attack');
  const overlap = advanceEnemy(scenario([{z: 10}]), 0.05, arena);
  assert.equal(overlap.enemies[0].x, 0);
  assert.equal(overlap.enemies[0].z, 10);
  assert.equal(overlap.playerHealth, 2);
});

test('chaque attaque respecte son délai et déclenche une pose d’attaque', () => {
  let state = advanceEnemy(scenario([{z: 10 + guard.attackRange * 0.9}]), 0.05, arena);
  assert.equal(state.playerHealth, 2);
  assert.equal(state.enemies[0].attackCooldown, guard.attackDelay);
  const early = Math.min(0.2, guard.attackDelay / 2);
  state = advanceEnemy(state, early, arena);
  assert.equal(state.enemies[0].mode, 'attack');
  state = advanceEnemy(state, guard.attackDelay - early - 0.001, arena);
  assert.equal(state.playerHealth, 2);
  state = advanceEnemy(state, 0.001, arena);
  assert.equal(state.playerHealth, 1);
  assert.equal(state.enemies[0].mode, 'attack');
});

test('les délais des gardes restent indépendants et diminuent aussi sans alerte', () => {
  const next = advanceEnemy(scenario([{z: 10 + guard.attackRange * 0.9, attackCooldown: guard.attackDelay * 0.4},
    {x: guard.attackRange * 0.9, z: 10}]), 0.05, arena);
  assert.equal(next.playerHealth, 2);
  assert.ok(Math.abs(next.enemies[0].attackCooldown - (guard.attackDelay * 0.4 - 0.05)) < 0.000001);
  assert.equal(next.enemies[1].attackCooldown, guard.attackDelay);
  const farX = (guard.forgetRange + 10) / 2;
  const far = scenario([{x: -farX, z: 10, attackCooldown: guard.attackDelay * 0.8}], {x: farX, z: 10});
  assert.ok(Math.abs(advanceEnemy(far, guard.attackDelay * 0.25, arena).enemies[0].attackCooldown - guard.attackDelay * 0.55) < 0.000001);
});

test('plusieurs ennemis peuvent attaquer ensemble sans rendre la vie négative', () => {
  const state = scenario([{z: 10 + guard.attackRange * 0.9}, {x: guard.attackRange * 0.9, z: 10}]);
  assert.equal(advanceEnemy(state, 0.05, arena).playerHealth, 1);
  state.playerHealth = 1;
  const next = advanceEnemy(state, 0.05, arena);
  assert.equal(next.playerHealth, 0);
  assert.equal(next.status, 'lost');
});

test('un mur bloque les coups et les tirs des ennemis alertés', () => {
  const wall = {...arena, walls: [{x: 0, z: 10, width: 4, depth: 0.2}]};
  const gap = guard.attackRange / 2;
  const state = scenario([{z: 10 - gap, alerted: true}], {x: 0, z: 10 + gap});
  assert.equal(advanceEnemy(state, 0.05, arena).playerHealth, 2);
  assert.equal(advanceEnemy(state, 0.05, wall).playerHealth, 3);
  const gunner = scenario([{...createEnemy({id: 'g', type: 'gunner', x: 0, z: -3}), alerted: true}], {x: 0, z: 3});
  assert.equal(advanceEnemy(gunner, 0.05, divider).projectiles.length, 0);
});

test('la sentinelle tire un projectile dirigé vers le joueur sans dommage instantané', () => {
  const state = scenario([createEnemy({id: 'gunner', type: 'gunner', x: 0, z: 10 + ENEMY_TYPES.gunner.attackRange * 0.75})]);
  const next = advanceEnemy(state, 0.05, arena);
  assert.equal(next.playerHealth, 3);
  assert.equal(next.projectiles.length, 1);
  assert.equal(next.projectiles[0].ownerId, 'gunner');
  assert.equal(next.projectiles[0].vx, 0);
  assert.equal(next.projectiles[0].vz, -10);
  assert.equal(next.nextProjectileId, 1);
  assert.equal(next.enemies[0].mode, 'attack');
  assert.equal(advanceEnemy(next, ENEMY_TYPES.gunner.attackDelay / 2, arena).projectiles.length, 1);
});

test('la sentinelle recule quand le joueur arrive trop près', () => {
  const state = scenario([createEnemy({id: 'gunner', type: 'gunner', x: 0, z: 15})]);
  const next = advanceEnemy(state, 0.1, arena).enemies[0];
  assert.ok(next.z > 15);
  assert.ok(next.z < 20);
});

test('la poursuite réutilise brièvement son chemin entre deux images', () => {
  const state = scenario([{z: -3, alerted: true}], {x: 0, z: 3});
  const first = advanceEnemy(state, 0.05, divider);
  const next = advanceEnemy(first, 0.05, divider);
  assert.ok(first.enemies[0].pathCooldown > next.enemies[0].pathCooldown);
  assert.deepEqual(next.enemies[0].waypoint, first.enemies[0].waypoint);
});

test('les ennemis vivants ne traversent pas les autres gardes', () => {
  const state = scenario([{z: 13}, {z: 14}], {x: 0, z: 10});
  const next = advanceEnemy(state, 0.2, arena);
  assert.ok(Math.hypot(next.enemies[0].x - next.enemies[1].x, next.enemies[0].z - next.enemies[1].z) >= 2 * guard.radius - 0.000001);
});

test('un mort ne poursuit ni n’attaque et les autres gardes continuent', () => {
  const state = scenario([{z: 10 + guard.attackRange * 0.9, health: 0, mode: 'dead'},
    {z: 10 + guard.attackRange + guard.speed, alerted: true}]);
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
    // Deux secondes d’approche, quelle que soit la vitesse choisie dans le catalogue.
    let state = scenario([{z: 10 + guard.attackRange + guard.speed * 2, alerted: true}]);
    let remaining = 2 + guard.attackDelay * 1.5;
    while (remaining > 0.000001) {
      const dt = Math.min(1 / fps, remaining);
      state = advanceEnemy(state, dt, arena);
      remaining -= dt;
    }
    return state;
  }
  const at30 = run(30);
  const at60 = run(60);
  assert.equal(at30.playerHealth, 1);
  assert.equal(at30.playerHealth, at60.playerHealth);
  assert.ok(Math.abs(at30.enemies[0].z - at60.enemies[0].z) < 0.000001);
  assert.ok(Math.abs(at30.enemies[0].attackCooldown - at60.enemies[0].attackCooldown) <= 1 / 30 + 0.000001);
});

test('la poursuite, la détection et les attaques ne modifient pas l’état précédent', () => {
  const state = scenario([{z: 10 + guard.attackRange * 0.9}, {}]);
  const before = structuredClone(state);
  const next = advanceEnemy(state, 0.05, arena);
  assert.deepEqual(state, before);
  assert.notEqual(next.enemies, state.enemies);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {newGame, shoot} from './game.js';
import {advanceEnemy} from './enemy.js';
import {canStand} from './level.js';

function scenario(enemies = [{}], player = {x: 0, z: 2, angle: 0}) {
  return {...newGame(), player, enemies: enemies.map((enemy, index) => ({
    id: `test-${index}`, x: 0, z: 5, health: 2, attackCooldown: 0,
    alerted: false, mode: 'idle', ...enemy,
  }))};
}

test('la détection demande une vue dégagée et une distance de quatre mètres maximum', () => {
  const near = scenario([{}], {x: 0, z: 1, angle: 0});
  assert.equal(advanceEnemy(near, 0.05).enemies[0].alerted, true);
  const far = scenario([{}], {x: 0, z: 0.99, angle: 0});
  const next = advanceEnemy(far, 0.05);
  assert.equal(next.enemies[0].alerted, false);
  assert.equal(next.enemies[0].z, 5);
  assert.equal(next.enemies[0].mode, 'idle');
  const hidden = scenario([{z: -4}], {x: 0, z: 0, angle: 0});
  assert.equal(advanceEnemy(hidden, 0.05).enemies[0].alerted, false);
});

test('un ennemi alerté mémorise le joueur derrière un mur, puis le perd au-delà de six mètres', () => {
  const hidden = scenario([{z: -4, alerted: true}], {x: 0, z: 0, angle: 0});
  const chasing = advanceEnemy(hidden, 0.05);
  assert.equal(chasing.enemies[0].alerted, true);
  assert.equal(chasing.enemies[0].mode, 'walk');
  assert.ok(canStand(chasing.enemies[0].x, chasing.enemies[0].z, 0.5));
  const edge = scenario([{x: -3, z: 5, alerted: true}], {x: 3, z: 5, angle: 0});
  assert.equal(advanceEnemy(edge, 0.05).enemies[0].alerted, true);
  edge.player.x = 3.01;
  const lost = advanceEnemy(edge, 0.05).enemies[0];
  assert.equal(lost.alerted, false);
  assert.equal(lost.x, -3);
  assert.equal(lost.mode, 'idle');
});

test('un impact alerte aussi un garde hors du rayon de détection', () => {
  const state = scenario([{}], {x: 0, z: 0, angle: 0});
  const hit = shoot(state, state.enemies[0].id);
  assert.equal(hit.enemies[0].alerted, true);
  assert.ok(advanceEnemy(hit, 0.05).enemies[0].z < 5);
  const distant = scenario([{x: -3.5}], {x: 3.5, z: 5, angle: 0});
  const alerted = shoot(distant, distant.enemies[0].id);
  assert.equal(alerted.enemies[0].alerted, true);
  assert.equal(advanceEnemy(alerted, 0.05).enemies[0].alerted, false);
});

test('la poursuite avance à un mètre par seconde, y compris en diagonale', () => {
  const straight = advanceEnemy(scenario(), 1).enemies[0];
  assert.equal(straight.z, 4);
  assert.equal(straight.mode, 'walk');
  const diagonal = scenario([{z: 4}], {x: 1, z: 2, angle: 0});
  const next = advanceEnemy(diagonal, 1).enemies[0];
  assert.ok(Math.abs(Math.hypot(next.x, next.z - 4) - 1) < 0.000001);
});

test('un garde s’arrête à portée et une position confondue ne produit pas de NaN', () => {
  const next = advanceEnemy(scenario([{z: 3.01}]), 0.05);
  assert.equal(next.enemies[0].z, 3);
  assert.equal(next.playerHealth, 2);
  assert.equal(next.enemies[0].mode, 'attack');
  const overlap = advanceEnemy(scenario([{z: 2}]), 0.05);
  assert.equal(overlap.enemies[0].x, 0);
  assert.equal(overlap.enemies[0].z, 2);
  assert.equal(overlap.playerHealth, 2);
});

test('chaque attaque attend une seconde et son animation dure les premiers 0,3 seconde', () => {
  let state = advanceEnemy(scenario([{z: 3}]), 0.05);
  assert.equal(state.playerHealth, 2);
  assert.equal(state.enemies[0].attackCooldown, 1);
  state = advanceEnemy(state, 0.2);
  assert.equal(state.enemies[0].mode, 'attack');
  state = advanceEnemy(state, 0.11);
  assert.equal(state.enemies[0].mode, 'idle');
  assert.equal(state.playerHealth, 2);
  state = advanceEnemy(state, 0.69);
  assert.equal(state.playerHealth, 1);
  assert.equal(state.enemies[0].attackCooldown, 1);
});

test('les délais restent indépendants et diminuent aussi sans alerte', () => {
  const state = scenario([{z: 3, attackCooldown: 0.4}, {x: 1, z: 2}]);
  const next = advanceEnemy(state, 0.05);
  assert.equal(next.playerHealth, 2);
  assert.ok(Math.abs(next.enemies[0].attackCooldown - 0.35) < 0.000001);
  assert.equal(next.enemies[1].attackCooldown, 1);
  const far = scenario([{x: -3.5, attackCooldown: 0.8}], {x: 3.5, z: 5, angle: 0});
  assert.ok(Math.abs(advanceEnemy(far, 0.25).enemies[0].attackCooldown - 0.55) < 0.000001);
});

test('plusieurs ennemis peuvent attaquer ensemble sans rendre la vie négative', () => {
  const state = scenario([{z: 3}, {x: 1, z: 2}]);
  assert.equal(advanceEnemy(state, 0.05).playerHealth, 1);
  state.playerHealth = 1;
  const next = advanceEnemy(state, 0.05);
  assert.equal(next.playerHealth, 0);
  assert.equal(next.status, 'lost');
  assert.ok(next.enemies.every(enemy => enemy.mode === 'attack'));
});

test('un mur empêche une attaque même avec un garde alerté à moins d’un mètre', () => {
  const state = scenario([{z: -1, alerted: true}], {x: 0, z: -0.1, angle: 0});
  assert.equal(advanceEnemy(state, 0.05).playerHealth, 3);
});

test('un mort ne poursuit ni n’attaque et les autres gardes continuent', () => {
  const state = scenario([{z: 3, health: 0, mode: 'dead'}, {}]);
  const next = advanceEnemy(state, 0.05);
  assert.equal(next.enemies[0], state.enemies[0]);
  assert.equal(next.playerHealth, 3);
  assert.equal(next.enemies[1].mode, 'walk');
});

test('sans temps écoulé ou après la fin de partie, aucun garde ne change', () => {
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
    let state = scenario([{}], {x: 0, z: 1, angle: 0});
    for (let frame = 0; frame < fps * 4.5; frame++) state = advanceEnemy(state, 1 / fps);
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
  const state = scenario([{z: 3}, {}]);
  const before = structuredClone(state);
  const next = advanceEnemy(state, 0.05);
  assert.deepEqual(state, before);
  assert.notEqual(next.enemies, state.enemies);
  assert.notEqual(next.enemies[0], state.enemies[0]);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {advance, newGame} from '../../src/game/game.js';
import {atExit} from '../../src/game/level.js';
import {createEnemy} from '../../src/game/enemy.js';
import {ARENA} from '../fixtures/arena.js';

const EXIT = ARENA.exit;

function scenario() {
  return {...newGame(0, 123), player: {...ARENA.spawn}, projectiles: [], medkits: [],
    enemies: [createEnemy({id: 'victory-guard', type: 'guard', x: -4, z: 4})]};
}

test('entrer vivant dans la sortie donne la victoire même avec les gardes vivants', () => {
  const state = scenario();
  state.player = {...state.player, x: EXIT.x, z: EXIT.z + 0.8};
  state.playerHealth = 1;
  const next = advance(state, {forward: true}, 0.05, ARENA);
  assert.equal(next.status, 'won');
  assert.equal(next.playerHealth, 1);
  assert.ok(next.enemies.every(enemy => enemy.health === 2));
  assert.equal(atExit(next.player, ARENA), true);
});

test('passer à côté de la sortie ne suffit pas', () => {
  const state = {...scenario(), enemies: []};
  state.player = {...state.player, x: EXIT.x - EXIT.width, z: EXIT.z};
  assert.equal(advance(state, {}, 0.05, ARENA).status, 'playing');
});

test('un coup fatal au moment d’entrer dans la sortie donne la défaite', () => {
  const state = scenario();
  state.player = {...state.player, x: EXIT.x, z: EXIT.z + 0.8};
  state.enemies = [{...state.enemies[0], x: EXIT.x, z: EXIT.z - 0.2}];
  state.playerHealth = 1;
  const next = advance(state, {forward: true}, 0.05, ARENA);
  assert.equal(atExit(next.player, ARENA), true);
  assert.equal(next.playerHealth, 0);
  assert.equal(next.status, 'lost');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {scorePoints} from '../../src/game/score.js';

test('les éliminations comptent même après une défaite, avec 500 points par secteur franchi', () => {
  assert.equal(scorePoints({status: 'playing', levelIndex: 0, killPoints: 250}), 250);
  assert.equal(scorePoints({status: 'lost', levelIndex: 1, killPoints: 250, playerHealth: 0}), 750);
});

test('la victoire finale ajoute 1000 points et 100 par PV, sans bonus final aux sorties intermédiaires', () => {
  assert.equal(scorePoints({status: 'won', levelIndex: 0, killPoints: 100, playerHealth: 3}), 600);
  assert.equal(scorePoints({status: 'won', levelIndex: 2, killPoints: 750, playerHealth: 2}), 3450);
});

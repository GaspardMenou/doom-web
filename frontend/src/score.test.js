import assert from 'node:assert/strict';
import test from 'node:test';
import {scorePoints} from './score.js';

test('une victoire rapporte 60 points plus 10 par PV restant', () => {
  assert.equal(scorePoints({status: 'won', playerHealth: 3}), 90);
  assert.equal(scorePoints({status: 'won', playerHealth: 2}), 80);
  assert.equal(scorePoints({status: 'won', playerHealth: 1}), 70);
});

test('une défaite ou une partie en cours ne rapporte aucun point', () => {
  assert.equal(scorePoints({status: 'lost', playerHealth: 0}), 0);
  assert.equal(scorePoints({status: 'playing', playerHealth: 3}), 0);
});

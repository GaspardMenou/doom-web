import assert from 'node:assert/strict';
import test from 'node:test';
import {newGame} from './game.js';
import {scorePoints} from './score.js';

test('atteindre la sortie avec trois PV rapporte 90 points', () => {
  const state = {...newGame(), status: 'won'};
  assert.equal(scorePoints(state), 90);
});

test('chaque PV conservé à la victoire rapporte dix points', () => {
  assert.equal(scorePoints({...newGame(), status: 'won', playerHealth: 1}), 70);
  assert.equal(scorePoints({...newGame(), status: 'won', playerHealth: 2}), 80);
});

test('une défaite ou une partie en cours ne rapporte aucun point', () => {
  assert.equal(scorePoints({...newGame(), status: 'lost', playerHealth: 0}), 0);
  assert.equal(scorePoints(newGame()), 0);
});

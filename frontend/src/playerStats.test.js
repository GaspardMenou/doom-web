import assert from 'node:assert/strict';
import test from 'node:test';
import {readPlayerStats} from './playerStats.js';

test('le front accepte le contrat de statistiques prévu pour GET /players/', () => {
  const rows = [{player: 'Ada', total_points: 150, games_played: 2, average_points: 75}];
  assert.equal(readPlayerStats(rows), rows);
  assert.deepEqual(readPlayerStats([]), []);
});

test('un joueur sans partie et une moyenne décimale sont acceptés', () => {
  const rows = [
    {player: 'Ada', total_points: 170, games_played: 3, average_points: 170 / 3},
    {player: 'Sam', total_points: 0, games_played: 0, average_points: 0},
  ];
  assert.equal(readPlayerStats(rows), rows);
});

test('une réponse API incomplète ou invalide produit une erreur compréhensible', () => {
  const valid = {player: 'Ada', total_points: 150, games_played: 2, average_points: 75};
  const invalidResponses = [
    null,
    {},
    [null],
    [{...valid, player: ''}],
    [{...valid, games_played: -1}],
    [{...valid, games_played: 1.5}],
    [{...valid, total_points: '150'}],
    [{...valid, average_points: null}],
    [{...valid, average_points: Infinity}],
  ];
  for (const rows of invalidResponses) {
    assert.throws(() => readPlayerStats(rows), /statistiques.*illisibles/);
  }
});

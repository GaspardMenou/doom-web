import assert from 'node:assert/strict';
import test from 'node:test';
import {createApi, jsonBody} from './api.js';

test('une réponse 204 ne tente pas de lire un JSON vide', async () => {
  const api = createApi('http://localhost:8001/', async url => {
    assert.equal(url, 'http://localhost:8001/scores/');
    return new Response(null, {status: 204});
  });
  assert.equal(await api('/scores/'), null);
});

test('une erreur HTTP est signalée au lieu de passer pour un succès', async () => {
  const api = createApi('http://localhost:8001', async () => new Response('', {status: 500}));
  await assert.rejects(api('/scores/'), /500/);
});

test('le score est envoyé en POST avec un corps JSON', () => {
  const options = jsonBody('POST', {player: 'Ada', points: 80});
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(options.body), {player: 'Ada', points: 80});
});

test('une panne réseau indique quoi vérifier', async () => {
  const api = createApi('http://localhost:8001', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(api('/scores/'), /backend.*URL.*CORS/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {connectEvents, eventsUrl, normalizePlayerName} from '../../src/api/events.js';

const PAGE = 'https://game.example.test/play/index.html';

test('le pseudo retire les espaces extérieurs et accepte de 1 à 24 caractères', () => {
  assert.equal(normalizePlayerName('  Ada Lovelace  '), 'Ada Lovelace');
  assert.equal(normalizePlayerName('A'), 'A');
  assert.equal(normalizePlayerName('🙂'.repeat(24)), '🙂'.repeat(24));
  for (const value of ['', '   ', 'A'.repeat(25), null, 12]) {
    assert.throws(() => normalizePlayerName(value), /1 à 24/);
  }
});

test('l’URL WebSocket conserve le préfixe de l’API et choisit ws ou wss', () => {
  for (const [base, page, expected] of [
    [undefined, PAGE, 'ws://localhost:8001/ws/events'],
    ['http://localhost:8001/', PAGE, 'ws://localhost:8001/ws/events'],
    ['https://api.example.test/v1/api/', PAGE, 'wss://api.example.test/v1/api/ws/events'],
    ['/api', PAGE, 'wss://game.example.test/api/ws/events'],
    ['/api///?test=1#section', PAGE, 'wss://game.example.test/api/ws/events'],
    ['/api', 'http://game.example.test/', 'ws://game.example.test/api/ws/events'],
    ['api', PAGE, 'wss://game.example.test/play/api/ws/events'],
    ['//api.example.test/base', PAGE, 'wss://api.example.test/base/ws/events'],
  ]) assert.equal(eventsUrl(base, page), expected);
  assert.throws(() => eventsUrl('file:///api', PAGE));
});

class FakeSocket {
  static instances = [];
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; this.closed = 0; FakeSocket.instances.push(this); }
  send(data) { this.sent.push(data); }
  close() { this.closed++; this.readyState = 3; }
}

test('un envoi attend une connexion ouverte et seul l’écho reçu alimente le fil', () => {
  const statuses = [];
  const received = [];
  const connection = connectEvents('/api', {onStatus: status => statuses.push(status), onEvent: event => received.push(event)}, FakeSocket, PAGE);
  const socket = FakeSocket.instances.at(-1);
  assert.equal(socket.url, 'wss://game.example.test/api/ws/events');
  assert.deepEqual(statuses, ['connecting']);
  assert.equal(connection.send({type: 'death', player: 'Ada'}), false);
  assert.deepEqual(socket.sent, []);
  socket.readyState = 1;
  socket.onopen();
  assert.equal(connection.send({type: 'death', player: ' Ada '}), true);
  assert.deepEqual(socket.sent.map(JSON.parse), [{type: 'death', player: 'Ada'}]);
  assert.deepEqual(received, []);
  socket.onmessage({data: socket.sent[0]});
  assert.deepEqual(received, [{type: 'death', player: 'Ada'}]);
  assert.deepEqual(statuses, ['connecting', 'open']);
  connection.close();
});

test('la réception ignore les JSON et événements invalides sans interpréter le pseudo comme du HTML', () => {
  const received = [];
  const connection = connectEvents('/api', {onStatus: () => {}, onEvent: event => received.push(event)}, FakeSocket, PAGE);
  const socket = FakeSocket.instances.at(-1);
  for (const data of ['{', 'null', '[]', '{}', '{"type":"chat","player":"Ada"}',
    '{"type":"death","player":" "}', JSON.stringify({type: 'victory', player: 'A'.repeat(25)})]) {
    socket.onmessage({data});
  }
  socket.onmessage({data: JSON.stringify({type: 'victory', player: '<b>Ada</b>'})});
  assert.deepEqual(received, [{type: 'victory', player: '<b>Ada</b>'}]);
  connection.close();
});

test('le démontage ferme une connexion en attente ou ouverte et ignore ses callbacks retardés', () => {
  for (const readyState of [0, 1]) {
    const received = [];
    const statuses = [];
    const connection = connectEvents('/api', {onStatus: status => statuses.push(status), onEvent: event => received.push(event)}, FakeSocket, PAGE);
    const socket = FakeSocket.instances.at(-1);
    socket.readyState = readyState;
    const delayed = {open: socket.onopen, message: socket.onmessage, error: socket.onerror, close: socket.onclose};
    connection.close();
    connection.close();
    delayed.open();
    delayed.message({data: '{"type":"death","player":"Ada"}'});
    delayed.error();
    delayed.close({code: 1000});
    assert.equal(connection.send({type: 'death', player: 'Ada'}), false);
    assert.equal(socket.closed, 1);
    assert.deepEqual(received, []);
    assert.deepEqual(statuses, ['connecting']);
  }
});

test('les erreurs réseau, d’envoi et de construction restent non bloquantes, et 1008 déconnecte le fil', () => {
  const statuses = [];
  const callbacks = {onStatus: status => statuses.push(status), onEvent: () => {}};
  const connection = connectEvents('/api', callbacks, FakeSocket, PAGE);
  const socket = FakeSocket.instances.at(-1);
  socket.readyState = 1;
  socket.onerror();
  assert.equal(statuses.at(-1), 'error');
  assert.equal(connection.send({type: 'death', player: ' '}), false);
  assert.deepEqual(socket.sent, []);
  socket.send = () => { throw new Error('network'); };
  assert.equal(connection.send({type: 'death', player: 'Ada'}), false);
  socket.onclose({code: 1008});
  assert.equal(statuses.at(-1), 'closed');
  connection.close();
  const failed = connectEvents('/api', callbacks, class { constructor() { throw new Error('unavailable'); } }, PAGE);
  assert.equal(statuses.at(-1), 'error');
  assert.equal(failed.send({type: 'victory', player: 'Ada'}), false);
  assert.doesNotThrow(() => failed.close());
});

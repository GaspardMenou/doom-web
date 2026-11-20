import assert from 'node:assert/strict';
import test from 'node:test';
import {createGameEventSender} from '../../src/api/gameEvents.js';

test('seules la défaite et la victoire finale émettent, une seule fois par campagne', () => {
  const sender = createGameEventSender();
  const sent = [];
  const send = event => { sent.push(event); return true; };
  for (const status of ['paused', 'playing', 'won']) {
    assert.equal(sender.announce({status, campaignWon: false, playerName: 'Ada'}, send), false);
  }
  const lost = {status: 'lost', campaignWon: false, playerName: 'Ada', player: {x: 1, z: 2}};
  assert.equal(sender.announce(lost, send), true);
  for (let frame = 0; frame < 20; frame++) assert.equal(sender.announce({...lost}, send), false);
  sender.reset();
  const won = {status: 'won', campaignWon: true, playerName: 'Lin'};
  assert.equal(sender.announce(won, send), true);
  assert.equal(sender.announce(won, send), false); // Réexécution d'effet, comme en StrictMode.
  assert.deepEqual(sent, [{type: 'death', player: 'Ada'}, {type: 'victory', player: 'Lin'}]);
});

test('une fin de partie hors connexion ne déclenche ni répétition ni rattrapage', () => {
  const sender = createGameEventSender();
  const state = {status: 'lost', campaignWon: false, playerName: 'Ada'};
  let attempts = 0;
  const offline = () => { attempts++; return false; };
  assert.equal(sender.announce(state, offline), false);
  assert.equal(sender.announce(state, offline), false);
  assert.equal(attempts, 1);
  sender.reset();
  assert.equal(sender.announce({...state, playerName: ''}, offline), false);
  assert.equal(attempts, 1);
});

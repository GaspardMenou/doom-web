import assert from 'node:assert/strict';
import test from 'node:test';
import {toggleFullscreen} from './fullscreen.js';

test('le bouton demande le plein écran pour le jeu', async () => {
  let requested = false;
  const element = {requestFullscreen: async () => { requested = true; }};
  await toggleFullscreen(element, {fullscreenElement: null});
  assert.equal(requested, true);
});

test('si le plein écran est actif, le bouton le quitte', async () => {
  let exited = false;
  const page = {fullscreenElement: {}, exitFullscreen: async () => { exited = true; }};
  await toggleFullscreen({}, page);
  assert.equal(exited, true);
});

test('un navigateur incompatible explique que le plein écran est indisponible', async () => {
  await assert.rejects(toggleFullscreen({}, {fullscreenElement: null}), /plein écran.*indisponible/);
});

test('un refus du navigateur remonte au bouton pour afficher une erreur récupérable', async () => {
  const refusal = new Error('Permission denied');
  const element = {requestFullscreen: async () => { throw refusal; }};
  await assert.rejects(toggleFullscreen(element, {fullscreenElement: null}), error => error === refusal);
});

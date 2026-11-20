import assert from 'node:assert/strict';
import test from 'node:test';
import {bindKeyboard} from '../../src/engine/input.js';

test('Maj active la course et son relâchement revient à la vitesse normale', () => {
  const canvas = new EventTarget();
  const keyboard = bindKeyboard(canvas);
  key(canvas, 'keydown', 'ShiftLeft');
  assert.equal(keyboard.read().sprint, true);
  key(canvas, 'keyup', 'ShiftLeft');
  assert.equal(keyboard.read().sprint, false);
  keyboard.destroy();
});

function key(target, type, code, character = '') {
  const event = new Event(type, {cancelable: true});
  Object.assign(event, {code, key: character});
  target.dispatchEvent(event);
  return event;
}

test('les touches physiques fonctionnent aussi sur un clavier AZERTY', () => {
  const canvas = new EventTarget();
  const keyboard = bindKeyboard(canvas);
  const event = key(canvas, 'keydown', 'KeyW', 'z');

  assert.equal(keyboard.read().forward, true);
  assert.equal(event.defaultPrevented, true);
  keyboard.destroy();
});

test('les flèches et WASD donnent les quatre directions', () => {
  const canvas = new EventTarget();
  const keyboard = bindKeyboard(canvas);
  const directions = {
    KeyW: 'forward', ArrowUp: 'forward',
    KeyS: 'backward', ArrowDown: 'backward',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
  };

  for (const [code, direction] of Object.entries(directions)) {
    key(canvas, 'keydown', code);
    assert.equal(keyboard.read()[direction], true);
    key(canvas, 'keyup', code);
    assert.equal(keyboard.read()[direction], false);
  }
  keyboard.destroy();
});

test('relâcher une touche garde son autre raccourci actif', () => {
  const canvas = new EventTarget();
  const keyboard = bindKeyboard(canvas);
  key(canvas, 'keydown', 'KeyW');
  key(canvas, 'keydown', 'ArrowUp');
  key(canvas, 'keyup', 'KeyW');

  assert.equal(keyboard.read().forward, true);
  keyboard.clear();
  assert.equal(keyboard.read().forward, false);
  keyboard.destroy();
});

test('perdre le focus et démonter le jeu ne laissent pas de touche coincée', () => {
  const canvas = new EventTarget();
  const keyboard = bindKeyboard(canvas);
  key(canvas, 'keydown', 'KeyW');
  canvas.dispatchEvent(new Event('blur'));
  assert.equal(keyboard.read().forward, false);

  keyboard.destroy();
  key(canvas, 'keydown', 'KeyD');
  assert.equal(keyboard.read().right, false);
  assert.equal(key(canvas, 'keydown', 'Enter').defaultPrevented, false);
});

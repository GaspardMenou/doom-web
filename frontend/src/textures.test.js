import assert from 'node:assert/strict';
import test from 'node:test';
import {NearestFilter, RepeatWrapping} from 'three';
import {EXIT} from './level.js';
import {createRoom} from './room.js';
import {createTexture} from './textures.js';

test('les textures industrielles sont pixelisées, opaques et reproductibles sans image externe', () => {
  for (const surface of ['floor', 'wall', 'ceiling', 'enemy', 'exit']) {
    const first = createTexture(surface);
    const second = createTexture(surface);
    assert.equal(first.image.width, 64);
    assert.equal(first.image.height, 64);
    assert.deepEqual(first.image.data, second.image.data);
    assert.equal(first.image.data.length, 64 * 64 * 4);
    assert.ok(first.image.data.every((value, index) => index % 4 !== 3 || value === 255));
    assert.equal(first.magFilter, NearestFilter);
    assert.equal(first.minFilter, NearestFilter);
    assert.equal(first.wrapS, RepeatWrapping);
    assert.equal(first.wrapT, RepeatWrapping);
    first.dispose();
    second.dispose();
  }
});

test('le décor reste plat et conserve la géométrie de l’ennemi et de la sortie', () => {
  const scene = createRoom();
  assert.ok(scene.children.every(object => object.isMesh && object.children.length === 0));
  const target = scene.getObjectByName('target');
  assert.deepEqual(target.position.toArray(), [0, 1.6, -2]);
  assert.equal(target.geometry.parameters.width, 1);
  assert.equal(target.geometry.parameters.height, 1);
  assert.equal(target.geometry.parameters.depth, 1);
  const exit = scene.getObjectByName('exit');
  assert.deepEqual(exit.position.toArray(), [EXIT.x, 0.02, EXIT.z]);
  assert.equal(exit.geometry.parameters.width, EXIT.width);
  assert.equal(exit.geometry.parameters.height, EXIT.depth);
  for (const object of scene.children) {
    assert.ok(object.material.map?.isDataTexture);
    object.geometry.dispose();
    object.material.map.dispose();
    object.material.dispose();
  }
});

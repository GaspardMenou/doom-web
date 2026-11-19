import assert from 'node:assert/strict';
import test from 'node:test';
import {DoubleSide, NearestFilter, RepeatWrapping} from 'three';
import {LEVELS} from './levels/index.js';
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

test('les trois décors gardent leurs murs, leur sortie et leurs gardes au sol', () => {
  for (const level of LEVELS) {
    const scene = createRoom(level);
    assert.ok(scene.children.every(object => object.isMesh && object.children.length === 0));
    assert.equal(scene.children.length, 7 + level.walls.length + level.enemies.length * 2);
    for (const enemy of level.enemies) {
    const target = scene.getObjectByName(`target:${enemy.id}`);
    assert.deepEqual(target.position.toArray(), [enemy.x, 0.9, enemy.z]);
    assert.equal(target.geometry.parameters.width, 1);
    assert.equal(target.geometry.parameters.height, 1.8);
    assert.equal(target.geometry.parameters.depth, 1);
    assert.equal(target.visible, true);
    assert.equal(target.material.opacity, 0);
    assert.equal(target.material.transparent, true);
    assert.equal(target.material.depthWrite, false);
    const model = scene.getObjectByName(`enemy-model:${enemy.id}`);
    assert.deepEqual(model.position.toArray(), [enemy.x, 0.82, enemy.z]);
    assert.equal(model.geometry.parameters.width, 1);
    assert.equal(model.geometry.parameters.height, 1.8);
    assert.equal(model.material.alphaTest, 0.5);
    assert.equal(model.material.side, DoubleSide);
    assert.equal(model.material.depthWrite, false);
    }
    const exit = scene.getObjectByName('exit');
    assert.deepEqual(exit.position.toArray(), [level.exit.x, 0.02, level.exit.z]);
    assert.equal(exit.geometry.parameters.width, level.exit.width);
    assert.equal(exit.geometry.parameters.height, level.exit.depth);
    for (const wall of level.walls) {
      assert.ok(scene.children.some(object => object.geometry.parameters.width === wall.width &&
        object.geometry.parameters.depth === wall.depth && object.position.x === wall.x && object.position.z === wall.z));
    }
    for (const object of scene.children) {
      if (!object.userData.enemyId) assert.ok(object.material.map?.isDataTexture);
      object.geometry.dispose();
      object.material.map?.dispose();
      object.material.dispose();
    }
  }
});

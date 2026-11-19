import assert from 'node:assert/strict';
import test from 'node:test';
import {NearestFilter, RepeatWrapping} from 'three';
import {LEVELS} from './levels/index.js';
import {createRoom} from './room.js';
import {createTexture} from './textures.js';

test('les textures de secours fournissent des pixels opaques sans image externe', () => {
  for (const surface of ['floor', 'wall', 'ceiling', 'enemy', 'exit']) {
    const texture = createTexture(surface);
    assert.ok(texture.image.width > 0 && texture.image.height > 0);
    assert.equal(texture.image.data.length, texture.image.width * texture.image.height * 4);
    assert.ok(texture.image.data.every((value, index) => index % 4 !== 3 || value === 255));
    assert.equal(texture.magFilter, NearestFilter);
    assert.equal(texture.minFilter, NearestFilter);
    assert.equal(texture.wrapS, RepeatWrapping);
    assert.equal(texture.wrapT, RepeatWrapping);
    texture.dispose();
  }
});

test('les trois décors placent les murs, la sortie et les gardes d’après leur plan', () => {
  for (const level of LEVELS) {
    const scene = createRoom(level);
    for (const enemy of level.enemies) {
      const target = scene.getObjectByName(`target:${enemy.id}`);
      const model = scene.getObjectByName(`enemy-model:${enemy.id}`);
      assert.equal(target.userData.enemyId, enemy.id);
      assert.deepEqual([target.position.x, target.position.z], [enemy.x, enemy.z]);
      assert.deepEqual([model.position.x, model.position.z], [enemy.x, enemy.z]);
    }
    const exit = scene.getObjectByName('exit');
    assert.deepEqual([exit.position.x, exit.position.z], [level.exit.x, level.exit.z]);
    assert.equal(exit.geometry.parameters.width, level.exit.width);
    assert.equal(exit.geometry.parameters.height, level.exit.depth);
    for (const wall of level.walls) {
      assert.ok(scene.children.some(object => object.geometry.parameters.width === wall.width &&
        object.geometry.parameters.depth === wall.depth && object.position.x === wall.x && object.position.z === wall.z));
    }
    for (const object of scene.children) {
      object.geometry.dispose();
      object.material.map?.dispose();
      object.material.dispose();
    }
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {NearestFilter, RepeatWrapping} from 'three';
import {LEVELS} from '../../src/game/levels/index.js';
import {createRoom} from '../../src/engine/room.js';
import {createTexture} from '../../src/engine/textures.js';
import {ENEMY_TYPES} from '../../src/game/enemyTypes.js';

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
    assert.equal(scene.getObjectByName('ceiling').position.y, level.height);
    assert.equal(scene.fog.near, 12);
    assert.ok(scene.fog.far >= level.size * 0.75);
    for (const enemy of level.enemies) {
      const type = ENEMY_TYPES[enemy.type ?? 'guard'];
      const target = scene.getObjectByName(`target:${enemy.id}`);
      const model = scene.getObjectByName(`enemy-model:${enemy.id}`);
      assert.equal(target.userData.enemyId, enemy.id);
      assert.deepEqual([target.position.x, target.position.z], [enemy.x, enemy.z]);
      assert.deepEqual([model.position.x, model.position.z], [enemy.x, enemy.z]);
      assert.equal(target.scale.x, type.scale);
      assert.equal(model.scale.x, type.scale);
    }
    const exit = scene.getObjectByName('exit');
    assert.deepEqual([exit.position.x, exit.position.z], [level.exit.x, level.exit.z]);
    assert.equal(exit.geometry.parameters.width, level.exit.width);
    assert.equal(exit.geometry.parameters.height, level.exit.depth);
    for (const wall of level.walls) {
      assert.ok(scene.children.some(object => object.isMesh && object.geometry.parameters.width === wall.width &&
        object.geometry.parameters.depth === wall.depth && object.position.x === wall.x && object.position.z === wall.z));
    }
    for (const medkit of level.medkits) {
      const view = scene.getObjectByName(`medkit:${medkit.id}`);
      assert.deepEqual([view.position.x, view.position.z], [medkit.x, medkit.z]);
    }
    scene.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      object.material.map?.dispose();
      object.material.dispose();
    });
  }
});

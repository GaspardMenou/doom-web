import assert from 'node:assert/strict';
import test from 'node:test';
import {NearestFilter, RepeatWrapping, SRGBColorSpace, Texture} from 'three';
import {LEVELS} from './levels/index.js';
import {createRoom} from './room.js';

function disposeRoom(scene) {
  for (const object of scene.children) {
    object.geometry.dispose();
    object.material.map?.dispose();
    object.material.dispose();
  }
}

test('une image de mur est chargée une fois puis répétée séparément sur chaque mur', () => {
  const level = LEVELS[1];
  const loads = new Map();
  const scene = createRoom(level, (url, callback) => loads.set(url, callback));
  assert.deepEqual([...loads.keys()], [level.wallTexture, '/art/enemy-guard-sheet.png']);
  const walls = scene.children.filter(object => object.geometry.type === 'BoxGeometry' && !object.userData.enemyId);
  let oldMapsDisposed = 0;
  for (const wall of walls) wall.material.map.addEventListener('dispose', () => oldMapsDisposed++);
  const source = new Texture();
  let sourceDisposed = 0;
  source.addEventListener('dispose', () => sourceDisposed++);

  loads.get(level.wallTexture)(source);

  assert.equal(oldMapsDisposed, walls.length);
  assert.equal(sourceDisposed, 1);
  assert.equal(new Set(walls.map(wall => wall.material.map)).size, walls.length);
  for (const wall of walls) {
    const map = wall.material.map;
    assert.notEqual(map, source);
    assert.equal(map.magFilter, NearestFilter);
    assert.equal(map.minFilter, NearestFilter);
    assert.equal(map.colorSpace, SRGBColorSpace);
    assert.equal(map.wrapS, RepeatWrapping);
    assert.equal(map.wrapT, RepeatWrapping);
    assert.deepEqual(map.repeat.toArray(), [Math.max(wall.geometry.parameters.width, wall.geometry.parameters.depth) / 2, 1.5]);
    assert.equal(wall.material.color.getHex(), 0xffffff);
  }
  const models = scene.children.filter(object => object.name.startsWith('enemy-model:'));
  const enemyImage = new Texture();
  let oldEnemyMapDisposed = 0;
  for (const model of models) model.material.map.addEventListener('dispose', () => oldEnemyMapDisposed++);
  loads.get('/art/enemy-guard-sheet.png')(enemyImage);
  assert.equal(oldEnemyMapDisposed, models.length);
  assert.equal(new Set(models.map(model => model.material.map)).size, models.length);
  for (const model of models) {
    assert.notEqual(model.material.map, enemyImage);
    assert.equal(model.material.map.magFilter, NearestFilter);
    assert.equal(model.material.map.minFilter, NearestFilter);
    assert.equal(model.material.map.colorSpace, SRGBColorSpace);
    assert.deepEqual(model.material.map.repeat.toArray(), [0.5, 0.5]);
    assert.deepEqual(model.material.map.offset.toArray(), [0, 0.5]);
    assert.equal(model.material.map.userData.animationSheet, true);
  }
  disposeRoom(scene);
});

test('les images arrivées après le démontage sont libérées sans changer la scène', () => {
  const loads = new Map();
  const scene = createRoom(LEVELS[0], (url, callback) => loads.set(url, callback));
  const maps = scene.children.map(object => object.material.map);
  scene.userData.disposed = true;
  disposeRoom(scene);
  let disposed = 0;
  for (const callback of loads.values()) {
    const image = new Texture();
    image.addEventListener('dispose', () => disposed++);
    callback(image);
  }

  assert.equal(disposed, 2);
  assert.deepEqual(scene.children.map(object => object.material.map), maps);
});

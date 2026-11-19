import assert from 'node:assert/strict';
import test from 'node:test';
import {NearestFilter, PerspectiveCamera, RepeatWrapping, SRGBColorSpace, Texture} from 'three';
import {LEVELS} from './levels/index.js';
import {createRoom} from './room.js';
import {castShot} from './shooting.js';

const level = {
  ...LEVELS[0], size: 64, height: 5, walls: [],
  enemies: [
    {id: 'guard', type: 'guard', x: 0, z: -5},
    {id: 'brute', type: 'brute', x: 5, z: -5},
    {id: 'runner', type: 'runner', x: -5, z: -5},
    {id: 'gunner', type: 'gunner', x: 10, z: -5},
  ],
  medkits: [{id: 'health', x: 0, z: -2}],
  exit: {x: 6, z: -12, width: 3, depth: 3},
};

function disposeRoom(scene) {
  scene.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    object.material.map?.dispose();
    object.material.dispose();
  });
}

test('les images de murs et de gardes remplacent les textures de secours sans les partager', () => {
  const loads = new Map();
  const scene = createRoom(level, (url, callback) => loads.set(url, callback));
  assert.deepEqual([...loads.keys()], [level.wallTexture,
    '/art/enemy-guard-sheet.png', '/art/enemy-runner-sheet.png', '/art/enemy-gunner-sheet.png']);
  const walls = scene.children.filter(object => object.isMesh && object.geometry.type === 'BoxGeometry' &&
    !object.userData.enemyId && !object.userData.decorative);
  let oldMapsDisposed = 0;
  for (const wall of walls) wall.material.map.addEventListener('dispose', () => oldMapsDisposed++);
  const source = new Texture({src: 'test-wall.webp'});
  let sourceDisposed = 0;
  source.addEventListener('dispose', () => sourceDisposed++);

  loads.get(level.wallTexture)(source);

  assert.equal(oldMapsDisposed, walls.length);
  assert.equal(sourceDisposed, 1);
  assert.equal(new Set(walls.map(wall => wall.material.map)).size, walls.length);
  for (const wall of walls) {
    const map = wall.material.map;
    assert.equal(map.image, source.image);
    assert.equal(map.magFilter, NearestFilter);
    assert.equal(map.minFilter, NearestFilter);
    assert.equal(map.colorSpace, SRGBColorSpace);
    assert.equal(map.wrapS, RepeatWrapping);
    assert.equal(map.wrapT, RepeatWrapping);
    assert.deepEqual(map.repeat.toArray(), [Math.max(wall.geometry.parameters.width, wall.geometry.parameters.depth) / 2, 2.5]);
  }
  const models = ['guard', 'brute'].map(id => scene.getObjectByName(`enemy-model:${id}`));
  const enemyImage = new Texture({src: 'test-guard.png'});
  let oldEnemyMapDisposed = 0;
  for (const model of models) model.material.map.addEventListener('dispose', () => oldEnemyMapDisposed++);
  loads.get('/art/enemy-guard-sheet.png')(enemyImage);
  assert.equal(oldEnemyMapDisposed, models.length);
  assert.equal(new Set(models.map(model => model.material.map)).size, models.length);
  for (const model of models) {
    assert.equal(model.material.map.image, enemyImage.image);
    assert.equal(model.material.map.magFilter, NearestFilter);
    assert.equal(model.material.map.minFilter, NearestFilter);
    assert.equal(model.material.map.colorSpace, SRGBColorSpace);
    assert.deepEqual(model.material.map.repeat.toArray(), [0.5, 0.5]);
    assert.deepEqual(model.material.map.offset.toArray(), [0, 0.5]);
    assert.equal(model.material.map.userData.animationSheet, true);
  }
  const runnerImage = new Texture({src: 'test-runner.png'});
  const gunnerImage = new Texture({src: 'test-gunner.png'});
  loads.get('/art/enemy-runner-sheet.png')(runnerImage);
  loads.get('/art/enemy-gunner-sheet.png')(gunnerImage);
  assert.equal(scene.getObjectByName('enemy-model:runner').material.map.image, runnerImage.image);
  assert.equal(scene.getObjectByName('enemy-model:gunner').material.map.image, gunnerImage.image);
  disposeRoom(scene);
});

test('les images arrivées après le démontage sont libérées sans changer la scène', () => {
  const loads = new Map();
  const scene = createRoom(level, (url, callback) => loads.set(url, callback));
  const models = scene.children.filter(object => object.isMesh);
  const maps = models.map(object => object.material.map);
  scene.userData.disposed = true;
  disposeRoom(scene);
  let disposed = 0;
  for (const callback of loads.values()) {
    const image = new Texture();
    image.addEventListener('dispose', () => disposed++);
    callback(image);
  }

  assert.equal(disposed, 4);
  assert.deepEqual(models.map(object => object.material.map), maps);
});

test('le sas signale la sortie en hauteur et les soins ne bloquent pas les tirs', () => {
  const scene = createRoom(level);
  const gate = scene.getObjectByName('exit-gate');
  const signal = scene.getObjectByName('exit-signal');
  const medkit = scene.getObjectByName('medkit:health');
  assert.ok(gate && signal, 'la sortie doit avoir une structure et un signal distincts du sol');
  assert.ok(signal.position.y > 3);
  assert.equal(signal.material.fog, false);
  assert.deepEqual([medkit.position.x, medkit.position.z], [0, -2]);
  const decorations = [];
  scene.traverse(object => {
    if (object.isMesh && object.userData.decorative) decorations.push(object);
  });
  const target = scene.getObjectByName('target:guard');
  const camera = new PerspectiveCamera(85, 1, 0.05, 140);
  camera.position.set(0, 0.2, 2);
  assert.equal(castShot(camera, [...decorations, target]).object, target);
  disposeRoom(scene);
});

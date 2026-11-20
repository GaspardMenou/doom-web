import assert from 'node:assert/strict';
import test from 'node:test';
import {BoxGeometry, BufferGeometry, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector3} from 'three';
import {castShot} from '../../src/engine/shooting.js';
import {createRoom} from '../../src/engine/room.js';
import {ARENA} from '../fixtures/arena.js';

const TRAINING_ROOM = {...ARENA, height: 4.5, wallTexture: '/art/walls/entry.webp',
  enemies: [{id: 'target', type: 'guard', x: 0, z: -4.5}]};

test('le tir donne le point du premier impact sur le mur devant la cible', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  const wall = new Mesh(new BoxGeometry(2, 2, 1), new MeshBasicMaterial());
  target.position.z = -4;
  wall.position.z = -2;
  const impact = castShot(camera, [target, wall]);

  assert.notEqual(impact, null);
  assert.equal(impact.object, wall);
  assert.deepEqual(impact.point.toArray(), [0, 0, -1.5]);
  assert.equal(impact.distance, 1.5);
});

test('un tir dans le vide ne produit aucun impact', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);

  assert.equal(castShot(camera, []), null);
});

test('une cible derrière le joueur ne reçoit pas le tir', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  target.position.z = 4;

  assert.equal(castShot(camera, [target]), null);
});

test('un mur derrière la cible ne bloque pas le tir même si le mur est listé en premier', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  const wall = new Mesh(new BoxGeometry(2, 2, 1), new MeshBasicMaterial());
  target.position.z = -4;
  wall.position.z = -6;

  assert.equal(castShot(camera, [wall, target]).object, target);
});

test('une cible invisible est ignorée', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  target.position.z = -4;
  target.visible = false;

  assert.equal(castShot(camera, [target]), null);
});

test('le tracé du tir précédent ne bloque pas le suivant', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  const tracer = new Line(
    new BufferGeometry().setFromPoints([new Vector3(0, 0, -1), new Vector3(0, 0, -2)]),
    new LineBasicMaterial(),
  );
  target.position.z = -4;

  assert.equal(castShot(camera, [tracer, target]).object, target);
});

test('le tir suit la rotation de la caméra', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  target.position.x = -4;

  assert.equal(castShot(camera, [target]), null);
  camera.rotation.y = Math.PI / 2;
  assert.equal(castShot(camera, [target]).object, target);
});

test('les déplacements de la caméra et de la cible sont pris en compte entre deux rendus', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  target.position.z = -4;

  assert.equal(castShot(camera, [target]).object, target);
  camera.position.x = 2;
  assert.equal(castShot(camera, [target]), null);
  target.position.x = 2;
  assert.equal(castShot(camera, [target]).object, target);
});

test('dans une vraie scène, la cloison bloque le tir mais le passage le laisse passer', () => {
  const scene = createRoom(TRAINING_ROOM);
  const target = scene.children.find(object => object.userData.enemyId);
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  camera.position.set(0, 1.6, 2);
  target.position.set(0, 0.9, -4.5);
  assert.notEqual(castShot(camera, scene.children)?.object, target);

  camera.position.x = -3.5;
  target.position.x = -3.5;
  assert.equal(castShot(camera, scene.children).object, target);
});

test('le garde reste touchable à bout portant même au contact de son sprite', () => {
  const scene = createRoom(TRAINING_ROOM);
  const target = scene.children.find(object => object.userData.enemyId);
  const camera = new PerspectiveCamera(75, 1, 0.05, 100);
  camera.position.set(target.position.x, 1.6, target.position.z);
  assert.equal(castShot(camera, scene.children).object, target);
});

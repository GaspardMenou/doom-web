import assert from 'node:assert/strict';
import test from 'node:test';
import {BoxGeometry, GridHelper, Mesh, MeshBasicMaterial, PerspectiveCamera} from 'three';
import {castShot, hitsTarget} from './shooting.js';
import {createRoom} from './room.js';

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

test('une cible devant le viseur est touchée avant le premier rendu', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  target.position.z = -4;

  assert.equal(hitsTarget(camera, [target], target), true);
});

test('une cible à côté du viseur ne reçoit pas le tir', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  target.position.set(3, 0, -4);

  assert.equal(hitsTarget(camera, [target], target), false);
});

test('une cible derrière le joueur ne reçoit pas le tir', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  target.position.z = 4;

  assert.equal(hitsTarget(camera, [target], target), false);
});

test('un mur devant la cible bloque le tir même si la cible est listée en premier', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  const wall = new Mesh(new BoxGeometry(2, 2, 1), new MeshBasicMaterial());
  target.position.z = -4;
  wall.position.z = -2;

  assert.equal(hitsTarget(camera, [target, wall], target), false);
});

test('un mur derrière la cible ne bloque pas le tir même si le mur est listé en premier', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  const wall = new Mesh(new BoxGeometry(2, 2, 1), new MeshBasicMaterial());
  target.position.z = -4;
  wall.position.z = -6;

  assert.equal(hitsTarget(camera, [wall, target], target), true);
});

test('une cible invisible est ignorée', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  target.position.z = -4;
  target.visible = false;

  assert.equal(hitsTarget(camera, [target], target), false);
});

test('la grille de repérage ne bloque pas un tir', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  const grid = new GridHelper(10, 10);
  target.position.z = -4;

  assert.equal(hitsTarget(camera, [grid, target], target), true);
});

test('le tir suit la rotation de la caméra', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  target.position.x = -4;

  assert.equal(hitsTarget(camera, [target], target), false);
  camera.rotation.y = Math.PI / 2;
  assert.equal(hitsTarget(camera, [target], target), true);
});

test('les déplacements de la caméra et de la cible sont pris en compte entre deux rendus', () => {
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  target.position.z = -4;

  assert.equal(hitsTarget(camera, [target], target), true);
  camera.position.x = 2;
  assert.equal(hitsTarget(camera, [target], target), false);
  target.position.x = 2;
  assert.equal(hitsTarget(camera, [target], target), true);
});

test('dans le niveau réel, la cloison bloque le tir mais le passage le laisse passer', () => {
  const scene = createRoom();
  const target = scene.getObjectByName('target');
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  camera.position.set(0, 1.6, 2);
  assert.equal(hitsTarget(camera, scene.children, target), false);

  camera.position.x = 3.5;
  target.position.x = 3.5;
  assert.equal(hitsTarget(camera, scene.children, target), true);
});

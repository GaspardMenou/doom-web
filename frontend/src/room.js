import * as THREE from 'three';
import {ROOM_SIZE} from './game.js';

export function createRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b8c7ce');

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
    new THREE.MeshBasicMaterial({color: '#66756a'}),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new THREE.GridHelper(ROOM_SIZE, 10, '#263b32', '#8b9b8f');
  grid.position.y = 0.01;
  scene.add(grid);

  function wall(width, depth, x, z, color) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 3, depth),
      new THREE.MeshBasicMaterial({color}),
    );
    mesh.position.set(x, 1.5, z);
    scene.add(mesh);
  }

  const edge = ROOM_SIZE / 2 + 0.1;
  wall(ROOM_SIZE, 0.2, 0, -edge, '#a16f5d');
  wall(ROOM_SIZE, 0.2, 0, edge, '#9a8b73');
  wall(0.2, ROOM_SIZE, -edge, 0, '#738c9c');
  wall(0.2, ROOM_SIZE, edge, 0, '#85977a');

  const target = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({color: '#b22f4a'}),
  );
  target.name = 'target';
  target.position.set(0, 1.6, -2);
  scene.add(target);
  return scene;
}

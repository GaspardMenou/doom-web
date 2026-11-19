import * as THREE from 'three';
import {EXIT, ROOM_SIZE, WALLS} from './level.js';
import {createTexture} from './textures.js';

export function createRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#14150f');
  scene.fog = new THREE.Fog('#14150f', 5, 20);

  const floorMap = createTexture('floor');
  floorMap.repeat.set(ROOM_SIZE / 2, ROOM_SIZE / 2);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
    new THREE.MeshBasicMaterial({map: floorMap}),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const ceilingMap = createTexture('ceiling');
  ceilingMap.repeat.set(ROOM_SIZE / 2, ROOM_SIZE / 2);
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
    new THREE.MeshBasicMaterial({map: ceilingMap}),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 3;
  scene.add(ceiling);

  function wall(width, depth, x, z, color) {
    const map = createTexture('wall');
    map.repeat.set(Math.max(width, depth) / 2, 1);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 3, depth),
      new THREE.MeshBasicMaterial({color, map}),
    );
    mesh.position.set(x, 1.5, z);
    scene.add(mesh);
  }

  const edge = ROOM_SIZE / 2 + 0.1;
  wall(ROOM_SIZE, 0.2, 0, -edge, '#d2c6a5');
  wall(ROOM_SIZE, 0.2, 0, edge, '#aeb3a0');
  wall(0.2, ROOM_SIZE, -edge, 0, '#969f8c');
  wall(0.2, ROOM_SIZE, edge, 0, '#c2bfa5');
  for (const obstacle of WALLS) {
    wall(obstacle.width, obstacle.depth, obstacle.x, obstacle.z, '#c4b997');
  }

  const exit = new THREE.Mesh(
    new THREE.PlaneGeometry(EXIT.width, EXIT.depth),
    new THREE.MeshBasicMaterial({map: createTexture('exit'), fog: false}),
  );
  exit.name = 'exit';
  exit.rotation.x = -Math.PI / 2;
  exit.position.set(EXIT.x, 0.02, EXIT.z);
  scene.add(exit);

  const target = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({color: '#b22f4a', map: createTexture('enemy')}),
  );
  target.name = 'target';
  target.position.set(0, 1.6, -2);
  scene.add(target);
  return scene;
}

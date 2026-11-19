import * as THREE from 'three';
import {LEVELS} from './levels/index.js';
import {createTexture} from './textures.js';

export function createRoom(level = LEVELS[0], loadTexture) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#14150f');
  scene.fog = new THREE.Fog('#14150f', 5, 20);
  const walls = [];

  const floorMap = createTexture('floor');
  floorMap.repeat.set(level.size / 2, level.size / 2);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(level.size, level.size),
    new THREE.MeshBasicMaterial({map: floorMap}),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const ceilingMap = createTexture('ceiling');
  ceilingMap.repeat.set(level.size / 2, level.size / 2);
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(level.size, level.size),
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
    walls.push(mesh);
  }

  const edge = level.size / 2 + 0.1;
  wall(level.size, 0.2, 0, -edge, '#d2c6a5');
  wall(level.size, 0.2, 0, edge, '#aeb3a0');
  wall(0.2, level.size, -edge, 0, '#969f8c');
  wall(0.2, level.size, edge, 0, '#c2bfa5');
  for (const obstacle of level.walls) {
    wall(obstacle.width, obstacle.depth, obstacle.x, obstacle.z, '#c4b997');
  }

  const exit = new THREE.Mesh(
    new THREE.PlaneGeometry(level.exit.width, level.exit.depth),
    new THREE.MeshBasicMaterial({map: createTexture('exit'), fog: false}),
  );
  exit.name = 'exit';
  exit.rotation.x = -Math.PI / 2;
  exit.position.set(level.exit.x, 0.02, level.exit.z);
  scene.add(exit);

  const models = [];
  for (const enemy of level.enemies) {
    const target = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.8, 1),
      new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide}),
    );
    target.name = `target:${enemy.id}`;
    target.userData.enemyId = enemy.id;
    target.position.set(enemy.x, 0.9, enemy.z);
    scene.add(target);

    const model = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1.8),
      new THREE.MeshBasicMaterial({map: createTexture('enemy'), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, depthWrite: false}),
    );
    model.name = `enemy-model:${enemy.id}`;
    // Le volume invisible reçoit les tirs ; l'image sert uniquement à l'affichage.
    model.raycast = () => {};
    model.position.set(enemy.x, 0.82, enemy.z);
    scene.add(model);
    models.push(model);
  }

  if (loadTexture) {
    loadTexture(level.wallTexture, source => {
      if (scene.userData.disposed) { source.dispose(); return; }
      source.colorSpace = THREE.SRGBColorSpace;
      source.magFilter = source.minFilter = THREE.NearestFilter;
      source.wrapS = source.wrapT = THREE.RepeatWrapping;
      for (const mesh of walls) {
        const map = source.clone();
        map.repeat.set(Math.max(mesh.geometry.parameters.width, mesh.geometry.parameters.depth) / 2, 1.5);
        map.needsUpdate = true;
        mesh.material.map.dispose();
        mesh.material.map = map;
        mesh.material.color.set('#ffffff');
        mesh.material.needsUpdate = true;
      }
      source.dispose();
    });
    loadTexture('/art/enemy-guard-sheet.png', source => {
      if (scene.userData.disposed) { source.dispose(); return; }
      source.colorSpace = THREE.SRGBColorSpace;
      source.magFilter = source.minFilter = THREE.NearestFilter;
      for (const model of models) {
        const map = source.clone();
        map.repeat.set(0.5, 0.5);
        map.offset.set(0, 0.5);
        map.generateMipmaps = false;
        map.userData.animationSheet = true;
        map.needsUpdate = true;
        model.material.map.dispose();
        model.material.map = map;
        model.material.needsUpdate = true;
      }
      source.dispose();
    });
  }
  return scene;
}

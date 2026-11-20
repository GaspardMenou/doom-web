import * as THREE from 'three';
import {LEVELS} from '../game/levels/index.js';
import {createTexture} from './textures.js';
import {ENEMY_TYPES} from '../game/enemyTypes.js';

export function createRoom(level = LEVELS[0], loadTexture) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#14150f');
  scene.fog = new THREE.Fog('#14150f', 12, level.size * 0.8);
  const height = level.height ?? 3;
  const walls = [];

  const floorMap = createTexture('floor');
  floorMap.repeat.set(level.size / 2, level.size / 2);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(level.size, level.size),
    new THREE.MeshBasicMaterial({map: floorMap}),
  );
  floor.name = 'floor';
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const ceilingMap = createTexture('ceiling');
  ceilingMap.repeat.set(level.size / 2, level.size / 2);
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(level.size, level.size),
    new THREE.MeshBasicMaterial({map: ceilingMap}),
  );
  ceiling.name = 'ceiling';
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;
  scene.add(ceiling);

  function wall(width, depth, x, z, color) {
    const map = createTexture('wall');
    map.repeat.set(Math.max(width, depth) / 2, 1);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshBasicMaterial({color, map}),
    );
    mesh.position.set(x, height / 2, z);
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
  exit.userData.decorative = true;
  exit.raycast = () => {};
  exit.rotation.x = -Math.PI / 2;
  exit.position.set(level.exit.x, 0.14, level.exit.z);
  scene.add(exit);

  function detail(parent, size, position, color, bright = false) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshBasicMaterial({color, fog: !bright}),
    );
    mesh.position.set(...position);
    mesh.userData.decorative = true;
    mesh.raycast = () => {};
    parent.add(mesh);
    return mesh;
  }

  const gate = new THREE.Group();
  gate.name = 'exit-gate';
  gate.userData.decorative = true;
  gate.position.set(level.exit.x, 0, level.exit.z);
  scene.add(gate);
  const width = level.exit.width;
  const depth = level.exit.depth;
  const back = -depth / 2;
  detail(gate, [width + 1.4, 0.12, depth + 1.2], [0, 0.06, 0], '#3b4034');
  for (const side of [-1, 1]) {
    detail(gate, [0.4, 3.3, 0.65], [side * (width / 2 + 0.3), 1.65, back], '#646951');
    detail(gate, [0.08, 2.9, 0.1], [side * (width / 2 + 0.04), 1.65, back + 0.36], '#80ffad', true);
    detail(gate, [0.07, 0.025, depth + 0.8], [side * (width / 2 + 0.42), 0.135, 0], '#80ffad', true);
    detail(gate, [0.46, 0.18, 0.7], [side * (width / 2 + 0.3), 0.45, back], '#e4b15e');
  }
  detail(gate, [width + 1, 0.38, 0.7], [0, 3.3, back], '#646951');
  detail(gate, [width + 0.15, 0.08, 0.1], [0, 3.08, back + 0.36], '#80ffad', true);
  for (const z of [depth / 2 - 0.05, depth / 2 + 0.42]) {
    detail(gate, [width * 0.65, 0.025, 0.1], [0, 0.135, z], '#e4b15e', true);
  }
  const signal = detail(gate, [0.9, 0.18, 0.28], [0, 3.72, back], '#baffd0', true);
  signal.name = 'exit-signal';

  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 2.9),
    new THREE.MeshBasicMaterial({color: '#70ff9f', transparent: true, opacity: 0.12,
      side: THREE.DoubleSide, depthWrite: false, fog: false}),
  );
  field.position.set(0, 1.6, back + 0.04);
  field.userData.decorative = true;
  field.raycast = () => {};
  gate.add(field);

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#111b12';
      context.fillRect(0, 0, 512, 96);
      context.fillStyle = '#baffd0';
      context.font = '700 60px "Barlow Condensed", sans-serif';
      context.textAlign = 'center';
      context.fillText('EXTRACTION', 256, 70);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.magFilter = map.minFilter = THREE.NearestFilter;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.2, 0.6),
        new THREE.MeshBasicMaterial({map, fog: false, side: THREE.DoubleSide}));
      sign.position.set(0, 3.32, back + 0.36);
      sign.userData.decorative = true;
      sign.raycast = () => {};
      gate.add(sign);
    }
  }

  for (const medkit of level.medkits ?? []) {
    const kit = new THREE.Group();
    kit.name = `medkit:${medkit.id}`;
    kit.userData.decorative = true;
    kit.position.set(medkit.x, 0, medkit.z);
    scene.add(kit);
    detail(kit, [0.65, 0.35, 0.5], [0, 0.2, 0], '#eee9d5');
    for (const side of [-1, 1]) {
      detail(kit, [0.26, 0.07, 0.015], [0, 0.2, side * 0.258], '#c64331');
      detail(kit, [0.07, 0.25, 0.015], [0, 0.2, side * 0.258], '#c64331');
    }
    detail(kit, [0.26, 0.015, 0.07], [0, 0.383, 0], '#c64331');
    detail(kit, [0.07, 0.015, 0.25], [0, 0.383, 0], '#c64331');
  }

  const modelsBySprite = new Map();
  for (const enemy of level.enemies) {
    const type = ENEMY_TYPES[enemy.type ?? 'guard'];
    const target = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.8, 1),
      new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide}),
    );
    target.name = `target:${enemy.id}`;
    target.userData.enemyId = enemy.id;
    target.scale.setScalar(type.scale);
    target.position.set(enemy.x, 0.9 * type.scale, enemy.z);
    scene.add(target);

    const model = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1.8),
      new THREE.MeshBasicMaterial({map: createTexture('enemy'), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, depthWrite: false}),
    );
    model.name = `enemy-model:${enemy.id}`;
    // Le volume invisible reçoit les tirs ; l'image sert uniquement à l'affichage.
    model.raycast = () => {};
    model.scale.setScalar(type.scale);
    model.position.set(enemy.x, 0.82 * type.scale, enemy.z);
    scene.add(model);
    if (!modelsBySprite.has(type.sprite)) modelsBySprite.set(type.sprite, []);
    modelsBySprite.get(type.sprite).push(model);
  }

  if (loadTexture) {
    loadTexture(level.wallTexture, source => {
      if (scene.userData.disposed) { source.dispose(); return; }
      source.colorSpace = THREE.SRGBColorSpace;
      source.magFilter = source.minFilter = THREE.NearestFilter;
      source.wrapS = source.wrapT = THREE.RepeatWrapping;
      source.generateMipmaps = false;
      for (const mesh of walls) {
        const map = source.clone();
        map.repeat.set(Math.max(mesh.geometry.parameters.width, mesh.geometry.parameters.depth) / 2, height / 2);
        map.needsUpdate = true;
        mesh.material.map.dispose();
        mesh.material.map = map;
        mesh.material.color.set('#ffffff');
        mesh.material.needsUpdate = true;
      }
      source.dispose();
    });
    for (const [url, models] of modelsBySprite) loadTexture(url, source => {
      if (scene.userData.disposed) { source.dispose(); return; }
      source.colorSpace = THREE.SRGBColorSpace;
      source.magFilter = source.minFilter = THREE.NearestFilter;
      source.generateMipmaps = false;
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

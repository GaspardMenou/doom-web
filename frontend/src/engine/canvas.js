import * as THREE from 'three';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';
import {advance, newGame, nextLevel as beginNextLevel, shoot} from '../game/game.js';
import {LEVELS} from '../game/levels/index.js';
import {bindKeyboard} from './input.js';
import {createRoom} from './room.js';
import {castShot} from './shooting.js';
import {enemyFrame} from './enemyAnimation.js';
import {ENEMY_TYPES} from '../game/enemyTypes.js';

export function mountGame(canvas, onState = () => {}) {
  const renderer = new THREE.WebGLRenderer({canvas});
  const loader = new THREE.TextureLoader();
  const seedParam = new URLSearchParams(window.location.search).get('seed');
  const launchSeed = seedParam !== null && /^\d+$/.test(seedParam) && Number(seedParam) <= 4294967295 ? Number(seedParam) : undefined;
  let state = newGame(0, launchSeed);
  let mapVisible = false;
  let triggerHeld = false;
  let nextShotAt = 0;
  let lastPublish = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function makeRoom() {
    return createRoom({...LEVELS[state.levelIndex], enemies: state.enemies, medkits: state.medkits},
      (url, loaded) => loader.load(url, loaded, undefined, () => {}));
  }
  let scene = makeRoom();
  function findEnemyViews() {
    return new Map(state.enemies.map(enemy => [enemy.id, {
      target: scene.getObjectByName(`target:${enemy.id}`),
      model: scene.getObjectByName(`enemy-model:${enemy.id}`),
      hitUntil: 0,
    }]));
  }
  let enemyViews = findEnemyViews();
  const projectileViews = new Map();
  const orbGeometry = new THREE.OctahedronGeometry(0.18);
  const orbMaterial = new THREE.MeshBasicMaterial({color: '#ff7c30', fog: false});
  const tracer = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({color: '#ffe17a', transparent: true}),
  );
  tracer.visible = false;
  scene.add(tracer);
  const camera = new THREE.PerspectiveCamera(85, canvas.width / canvas.height, 0.05, 150);
  camera.rotation.order = 'YXZ';
  const controls = new PointerLockControls(camera, canvas);
  const keyboard = bindKeyboard(canvas);
  let previous = null;
  let animationTime = 0;
  let shotUntil = 0;
  camera.position.set(state.player.x, 1.6, state.player.z);

  function resize() {
    const width = canvas.parentElement.clientWidth || 640;
    const height = canvas.parentElement.clientHeight || 400;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.parentElement);
  resize();

  function publish(status, feedback = {}) {
    onState({
      ...feedback,
      enemies: state.enemies,
      playerHealth: state.playerHealth,
      levelIndex: state.levelIndex,
      seed: state.seed,
      player: state.player,
      medkits: state.medkits,
      kills: state.kills,
      killPoints: state.killPoints,
      mapVisible,
      status: state.status === 'playing' ? status : state.status,
    });
  }
  function locked() {
    keyboard.clear();
    previous = null;
    publish('playing');
  }
  function unlocked() {
    triggerHeld = false;
    keyboard.clear();
    previous = null;
    tracer.visible = false;
    publish('paused');
  }
  function pointerError() {
    publish('paused', {error: 'La souris n’a pas pu être capturée. Cliquez sur Reprendre pour réessayer.'});
  }
  async function resume() {
    if (state.status !== 'playing') return;
    canvas.focus();
    try {
      await canvas.requestPointerLock();
    } catch {
      pointerError();
    }
  }
  function pause() {
    triggerHeld = false;
    keyboard.clear();
    previous = null;
    tracer.visible = false;
    if (controls.isLocked) controls.unlock();
  }
  function visibility() {
    if (document.hidden) pause();
  }

  function showShot(impact) {
    const distance = impact?.distance ?? 80;
    const start = new THREE.Vector3(0, -0.2, -Math.min(0.3, distance / 2)).applyMatrix4(camera.matrixWorld);
    const end = impact?.point ?? camera.position.clone().addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 80);
    tracer.geometry.setFromPoints([start, end]);
    tracer.geometry.computeBoundingSphere();
    tracer.material.opacity = 1;
    tracer.visible = true;
    shotUntil = performance.now() + 100;
  }

  function fire(now = performance.now()) {
    if (!controls.isLocked || state.status !== 'playing' || now < nextShotAt) return;
    nextShotAt = now + 130;
    const impact = castShot(camera, scene.children);
    const enemyId = impact?.object.userData.enemyId ?? null;
    showShot(impact);
    state = shoot(state, enemyId);
    if (enemyId) {
      const view = enemyViews.get(enemyId);
      view.hitUntil = animationTime + 120;
      view.target.visible = view.model.visible = state.enemies.find(enemy => enemy.id === enemyId).health > 0;
    }
    publish('playing', {lastShot: enemyId ? 'Touché !' : 'Tir manqué.'});
  }
  function click(event) {
    if (event.button !== 0) return;
    if (controls.isLocked) fire();
    else resume();
  }
  function keydown(event) {
    if (event.code === 'KeyM' && controls.isLocked && !event.repeat) {
      event.preventDefault();
      mapVisible = !mapVisible;
      publish('playing');
      return;
    }
    if (event.code !== 'Space' || !controls.isLocked) return;
    event.preventDefault();
    triggerHeld = true;
    if (!event.repeat) fire();
  }
  function keyup(event) { if (event.code === 'Space') triggerHeld = false; }
  function mousedown(event) {
    if (event.button === 0 && controls.isLocked) { triggerHeld = true; fire(); }
  }
  function mouseup(event) { if (event.button === 0) triggerHeld = false; }

  controls.addEventListener('lock', locked);
  controls.addEventListener('unlock', unlocked);
  canvas.addEventListener('click', click);
  canvas.addEventListener('keydown', keydown);
  canvas.addEventListener('mousedown', mousedown);
  window.addEventListener('mouseup', mouseup);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', visibility);
  document.addEventListener('pointerlockerror', pointerError);
  publish('paused');

  renderer.setAnimationLoop(now => {
    const seconds = previous === null ? 0 : (now - previous) / 1000;
    previous = now;
    if (controls.isLocked) {
      animationTime += Math.min(seconds, 0.05) * 1000;
      const healthBefore = state.playerHealth;
      const statusBefore = state.status;
      const input = keyboard.read();
      state = advance(state, {...input, angle: camera.rotation.y}, seconds);
      const walking = input.forward || input.backward || input.left || input.right;
      const bob = !reducedMotion && walking ? Math.sin(animationTime / 70) * (input.sprint ? 0.045 : 0.025) : 0;
      camera.position.set(state.player.x, 1.6 + bob, state.player.z);
      const fov = input.sprint && walking ? 92 : 85;
      if (!reducedMotion && Math.abs(camera.fov - fov) > 0.01) {
        camera.fov += (fov - camera.fov) * Math.min(seconds * 10, 1);
        camera.updateProjectionMatrix();
      }
      if (triggerHeld) fire(now);
      if (state.playerHealth !== healthBefore || state.status !== statusBefore) {
        publish('playing');
        if (state.status !== 'playing') pause();
      }
      if (now - lastPublish > 150) { publish('playing'); lastPublish = now; }
    }
    if (tracer.visible) {
      tracer.material.opacity = Math.max(0, (shotUntil - now) / 100);
      tracer.visible = tracer.material.opacity > 0;
    }
    for (const enemy of state.enemies) {
      const type = ENEMY_TYPES[enemy.type];
      const view = enemyViews.get(enemy.id);
      const alive = enemy.health > 0;
      view.target.visible = view.model.visible = alive;
      view.target.position.set(enemy.x, 0.9 * type.scale, enemy.z);
      const bob = enemy.mode === 'walk' ? Math.sin(animationTime / 90) * 0.015 : 0;
      view.model.position.set(enemy.x, 0.82 * type.scale + bob, enemy.z);
      view.model.lookAt(camera.position.x, view.model.position.y, camera.position.z);
      view.model.material.color.set(animationTime < view.hitUntil ? '#ff937c' : enemy.type === 'brute' ? '#c8b7a6' : '#ffffff');
      const map = view.model.material.map;
      if (map.userData.animationSheet) {
        const frame = enemyFrame(enemy, animationTime / 1000);
        map.offset.set(frame % 2 / 2, 0.5 - Math.floor(frame / 2) / 2);
      }
    }
    const activeProjectiles = new Set(state.projectiles.map(projectile => projectile.id));
    for (const [id, mesh] of projectileViews) {
      if (!activeProjectiles.has(id)) { scene.remove(mesh); projectileViews.delete(id); }
    }
    for (const projectile of state.projectiles) {
      if (!projectileViews.has(projectile.id)) {
        const mesh = new THREE.Mesh(orbGeometry, orbMaterial);
        mesh.raycast = () => {};
        scene.add(mesh);
        projectileViews.set(projectile.id, mesh);
      }
      const mesh = projectileViews.get(projectile.id);
      mesh.position.set(projectile.x, 1.2, projectile.z);
      mesh.rotation.y = animationTime / 180;
    }
    for (const medkit of state.medkits) {
      const mesh = scene.getObjectByName(`medkit:${medkit.id}`);
      if (mesh) mesh.visible = !medkit.taken;
    }
    renderer.render(scene, camera);
  });

  function releaseRoom() {
    scene.userData.disposed = true;
    scene.remove(tracer);
    for (const mesh of projectileViews.values()) scene.remove(mesh);
    projectileViews.clear();
    scene.traverse(object => {
      object.geometry?.dispose();
      if (object.material) { object.material.map?.dispose(); object.material.dispose(); }
    });
    scene.clear();
  }

  function openLevel(next) {
    pause();
    releaseRoom();
    state = next;
    mapVisible = false;
    nextShotAt = 0;
    animationTime = 0;
    scene = makeRoom();
    enemyViews = findEnemyViews();
    scene.add(tracer);
    camera.position.set(state.player.x, 1.6, state.player.z);
    camera.rotation.set(0, state.player.angle, 0);
    publish('paused');
  }

  return {
    pause,
    resume,
    restart(seed = launchSeed) {
      openLevel(newGame(0, seed));
    },
    nextLevel() {
      const next = beginNextLevel(state);
      if (next !== state) openLevel(next);
    },
    destroy() {
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.removeEventListener('lock', locked);
      controls.removeEventListener('unlock', unlocked);
      if (controls.isLocked) controls.unlock();
      controls.dispose();
      keyboard.destroy();
      canvas.removeEventListener('click', click);
      canvas.removeEventListener('keydown', keydown);
      canvas.removeEventListener('mousedown', mousedown);
      window.removeEventListener('mouseup', mouseup);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointerlockerror', pointerError);
      releaseRoom();
      tracer.geometry.dispose();
      tracer.material.dispose();
      orbGeometry.dispose();
      orbMaterial.dispose();
      renderer.dispose();
    },
  };
}

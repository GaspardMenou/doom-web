import * as THREE from 'three';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';
import {advance, newGame, nextLevel as beginNextLevel, shoot} from './game.js';
import {LEVELS} from './levels/index.js';
import {bindKeyboard} from './input.js';
import {createRoom} from './room.js';
import {castShot} from './shooting.js';
import {enemyFrame} from './enemyAnimation.js';

export function mountGame(canvas, onState = () => {}) {
  const renderer = new THREE.WebGLRenderer({canvas});
  const loader = new THREE.TextureLoader();
  let state = newGame();
  function makeRoom() {
    return createRoom(LEVELS[state.levelIndex], (url, loaded) => loader.load(url, loaded, undefined, () => {}));
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
  const tracer = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({color: '#ffe17a', transparent: true}),
  );
  tracer.visible = false;
  scene.add(tracer);
  const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.05, 40);
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
      status: state.status === 'playing' ? status : state.status,
    });
  }
  function locked() {
    keyboard.clear();
    previous = null;
    publish('playing');
  }
  function unlocked() {
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
    keyboard.clear();
    previous = null;
    tracer.visible = false;
    if (controls.isLocked) controls.unlock();
  }
  function visibility() {
    if (document.hidden) pause();
  }

  function showShot(impact) {
    const distance = impact?.distance ?? 15;
    const start = new THREE.Vector3(0, -0.2, -Math.min(0.3, distance / 2)).applyMatrix4(camera.matrixWorld);
    const end = impact?.point ?? camera.position.clone().addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 15);
    tracer.geometry.setFromPoints([start, end]);
    tracer.geometry.computeBoundingSphere();
    tracer.material.opacity = 1;
    tracer.visible = true;
    shotUntil = performance.now() + 100;
  }

  function fire() {
    if (!controls.isLocked || state.status !== 'playing') return;
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
    if (event.code !== 'Space' || !controls.isLocked) return;
    event.preventDefault();
    if (!event.repeat) fire();
  }

  controls.addEventListener('lock', locked);
  controls.addEventListener('unlock', unlocked);
  canvas.addEventListener('click', click);
  canvas.addEventListener('keydown', keydown);
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
      state = advance(state, {...keyboard.read(), angle: camera.rotation.y}, seconds);
      camera.position.set(state.player.x, 1.6, state.player.z);
      if (state.playerHealth !== healthBefore || state.status !== statusBefore) {
        publish('playing');
        if (state.status !== 'playing') pause();
      }
    }
    if (tracer.visible) {
      tracer.material.opacity = Math.max(0, (shotUntil - now) / 100);
      tracer.visible = tracer.material.opacity > 0;
    }
    for (const enemy of state.enemies) {
      const view = enemyViews.get(enemy.id);
      const alive = enemy.health > 0;
      view.target.visible = view.model.visible = alive;
      view.target.position.set(enemy.x, 0.9, enemy.z);
      const bob = enemy.mode === 'walk' ? Math.sin(animationTime / 90) * 0.015 : 0;
      view.model.position.set(enemy.x, 0.82 + bob, enemy.z);
      view.model.lookAt(camera.position.x, view.model.position.y, camera.position.z);
      view.model.material.color.set(animationTime < view.hitUntil ? '#ff937c' : '#ffffff');
      const map = view.model.material.map;
      if (map.userData.animationSheet) {
        const frame = enemyFrame(enemy, animationTime / 1000);
        map.offset.set(frame % 2 / 2, 0.5 - Math.floor(frame / 2) / 2);
      }
    }
    renderer.render(scene, camera);
  });

  function releaseRoom() {
    scene.userData.disposed = true;
    scene.remove(tracer);
    for (const object of scene.children) {
      object.geometry.dispose();
      object.material.map?.dispose();
      object.material.dispose();
    }
    scene.clear();
  }

  function openLevel(next) {
    pause();
    releaseRoom();
    state = next;
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
    restart() {
      openLevel(newGame());
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
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointerlockerror', pointerError);
      releaseRoom();
      tracer.geometry.dispose();
      tracer.material.dispose();
      renderer.dispose();
    },
  };
}

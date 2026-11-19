import * as THREE from 'three';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';
import {advance, newGame, shoot} from './game.js';
import {bindKeyboard} from './input.js';
import {createRoom} from './room.js';
import {castShot} from './shooting.js';

export function mountGame(canvas, onState = () => {}) {
  const renderer = new THREE.WebGLRenderer({canvas});
  const scene = createRoom();
  const target = scene.getObjectByName('target');
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
  let state = newGame();
  let previous = null;
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
      targetHealth: state.targetHealth,
      playerHealth: state.playerHealth,
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
    const hit = impact?.object === target;
    showShot(impact);
    state = shoot(state, hit);
    target.visible = state.targetHealth > 0;
    target.material.color.set(state.targetHealth === 1 ? '#d48228' : '#b22f4a');
    publish('playing', {lastShot: hit ? 'Touché !' : 'Tir manqué.'});
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
      const healthBefore = state.playerHealth;
      const statusBefore = state.status;
      state = advance(state, {...keyboard.read(), angle: camera.rotation.y}, seconds);
      camera.position.set(state.player.x, 1.6, state.player.z);
      target.position.set(state.enemy.x, 1.6, state.enemy.z);
      if (state.playerHealth !== healthBefore || state.status !== statusBefore) {
        publish('playing');
        if (state.status !== 'playing') pause();
      }
    }
    if (tracer.visible) {
      tracer.material.opacity = Math.max(0, (shotUntil - now) / 100);
      tracer.visible = tracer.material.opacity > 0;
    }
    renderer.render(scene, camera);
  });

  return {
    pause,
    resume,
    restart() {
      pause();
      state = newGame();
      camera.position.set(state.player.x, 1.6, state.player.z);
      camera.rotation.set(0, 0, 0);
      target.visible = true;
      target.position.set(state.enemy.x, 1.6, state.enemy.z);
      target.material.color.set('#b22f4a');
      publish('paused');
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
      for (const object of scene.children) {
        object.geometry.dispose();
        object.material.map?.dispose();
        object.material.dispose();
      }
      renderer.dispose();
    },
  };
}

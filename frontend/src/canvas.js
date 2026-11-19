import * as THREE from 'three';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';
import {advance, newGame, shoot} from './game.js';
import {bindKeyboard} from './input.js';
import {createRoom} from './room.js';
import {hitsTarget} from './shooting.js';

export function mountGame(canvas, onState = () => {}) {
  const renderer = new THREE.WebGLRenderer({canvas});
  renderer.setSize(canvas.width, canvas.height, false);
  const scene = createRoom();
  const target = scene.getObjectByName('target');
  const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.05, 40);
  camera.rotation.order = 'YXZ';
  const controls = new PointerLockControls(camera, canvas);
  const keyboard = bindKeyboard(canvas);
  let state = newGame();
  let previous = null;
  camera.position.set(state.player.x, 1.6, state.player.z);

  function locked() {
    keyboard.clear();
    previous = null;
    onState({status: 'playing', targetHealth: state.targetHealth});
  }
  function unlocked() {
    keyboard.clear();
    previous = null;
    onState({status: 'paused', targetHealth: state.targetHealth});
  }
  function pointerError() {
    onState({status: 'paused', targetHealth: state.targetHealth, error: 'La souris n’a pas pu être capturée. Cliquez sur Entrer pour réessayer.'});
  }
  async function resume() {
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
    if (controls.isLocked) controls.unlock();
  }
  function visibility() {
    if (document.hidden) pause();
  }

  function fire() {
    if (!controls.isLocked) return;
    const hit = hitsTarget(camera, scene.children, target);
    state = shoot(state, hit);
    target.visible = state.targetHealth > 0;
    target.material.color.set(state.targetHealth === 1 ? '#d48228' : '#b22f4a');
    onState({status: 'playing', targetHealth: state.targetHealth, lastShot: hit ? 'Touché !' : 'Tir manqué.'});
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
  onState({status: 'paused', targetHealth: state.targetHealth});

  renderer.setAnimationLoop(now => {
    const seconds = previous === null ? 0 : (now - previous) / 1000;
    previous = now;
    if (controls.isLocked) {
      state = advance(state, {...keyboard.read(), angle: camera.rotation.y}, seconds);
      camera.position.set(state.player.x, 1.6, state.player.z);
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
      target.material.color.set('#b22f4a');
      onState({status: 'paused', targetHealth: state.targetHealth});
    },
    destroy() {
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
        object.material.dispose();
      }
      renderer.dispose();
    },
  };
}

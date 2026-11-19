import * as THREE from 'three';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';
import {advance, newGame} from './game.js';
import {bindKeyboard} from './input.js';
import {createRoom} from './room.js';

export function mountGame(canvas, onState = () => {}) {
  const renderer = new THREE.WebGLRenderer({canvas});
  renderer.setSize(canvas.width, canvas.height, false);
  const scene = createRoom();
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
    onState({status: 'playing'});
  }
  function unlocked() {
    keyboard.clear();
    previous = null;
    onState({status: 'paused'});
  }
  function pointerError() {
    onState({status: 'paused', error: 'La souris n’a pas pu être capturée. Cliquez sur Entrer pour réessayer.'});
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

  controls.addEventListener('lock', locked);
  controls.addEventListener('unlock', unlocked);
  canvas.addEventListener('click', resume);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', visibility);
  document.addEventListener('pointerlockerror', pointerError);
  onState({status: 'paused'});

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
      onState({status: 'paused'});
    },
    destroy() {
      renderer.setAnimationLoop(null);
      controls.removeEventListener('lock', locked);
      controls.removeEventListener('unlock', unlocked);
      if (controls.isLocked) controls.unlock();
      controls.dispose();
      keyboard.destroy();
      canvas.removeEventListener('click', resume);
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

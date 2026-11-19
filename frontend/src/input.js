const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];

export function bindKeyboard(canvas) {
  const pressed = new Set();
  function keydown(event) {
    if (!movementKeys.includes(event.code)) return;
    event.preventDefault();
    pressed.add(event.code);
  }
  function keyup(event) { pressed.delete(event.code); }
  function clear() { pressed.clear(); }

  canvas.addEventListener('keydown', keydown);
  canvas.addEventListener('keyup', keyup);
  canvas.addEventListener('blur', clear);

  return {
    read() {
      return {
        forward: pressed.has('KeyW') || pressed.has('ArrowUp'),
        backward: pressed.has('KeyS') || pressed.has('ArrowDown'),
        left: pressed.has('KeyA') || pressed.has('ArrowLeft'),
        right: pressed.has('KeyD') || pressed.has('ArrowRight'),
      };
    },
    clear,
    destroy() {
      clear();
      canvas.removeEventListener('keydown', keydown);
      canvas.removeEventListener('keyup', keyup);
      canvas.removeEventListener('blur', clear);
    },
  };
}

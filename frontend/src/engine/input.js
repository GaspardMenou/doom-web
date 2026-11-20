const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
const keyCodes = {
  z: 'KeyW', w: 'KeyW', q: 'KeyA', a: 'KeyA', s: 'KeyS', d: 'KeyD',
  arrowup: 'ArrowUp', arrowleft: 'ArrowLeft', arrowdown: 'ArrowDown', arrowright: 'ArrowRight', shift: 'ShiftLeft',
};

export function bindKeyboard(canvas) {
  const pressed = new Map();
  const keyId = event => event.code && event.code !== 'Unidentified' ? event.code : event.key?.toLowerCase();
  function keydown(event) {
    const code = keyCodes[event.key?.toLowerCase()] ?? event.code;
    if (!movementKeys.includes(code)) return;
    event.preventDefault();
    pressed.set(keyId(event), code);
  }
  function keyup(event) { pressed.delete(keyId(event)); }
  function clear() { pressed.clear(); }

  canvas.addEventListener('keydown', keydown);
  canvas.addEventListener('keyup', keyup);
  canvas.addEventListener('blur', clear);

  return {
    read() {
      const active = new Set(pressed.values());
      return {
        forward: active.has('KeyW') || active.has('ArrowUp'),
        backward: active.has('KeyS') || active.has('ArrowDown'),
        left: active.has('KeyA') || active.has('ArrowLeft'),
        right: active.has('KeyD') || active.has('ArrowRight'),
        sprint: active.has('ShiftLeft') || active.has('ShiftRight'),
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

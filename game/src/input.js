// Keyboard and mouse input for Lumen Drift. Held keys give a steering vector;
// one-shot presses (start, dash, pause, restart, mute) are queued as bit flags
// and taken once by the loop, so a press between two frames is never lost and
// never counted twice. Moving the mouse steers the moth toward the cursor.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_RESTART = 8;
export const ACTION_MUTE = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const DASH = new Set(['Space']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  let mouse = null;
  let mouseAt = 0;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      held.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    held.clear();
  });
  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    mouseAt = performance.now();
  });
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  function keyVector() {
    let x = 0;
    let y = 0;
    for (const code of held) {
      if (LEFT.has(code)) x -= 1;
      if (RIGHT.has(code)) x += 1;
      if (UP.has(code)) y -= 1;
      if (DOWN.has(code)) y += 1;
    }
    return { x, y };
  }

  return {
    /** Steering vector from keys, or toward the mouse when it moved recently. */
    steer() {
      const keys = keyVector();
      if (keys.x !== 0 || keys.y !== 0) return keys;
      if (mouse !== null && performance.now() - mouseAt < 2500) return { mouse: true, x: mouse.x, y: mouse.y };
      return { x: 0, y: 0 };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

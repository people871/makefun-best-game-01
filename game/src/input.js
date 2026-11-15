// Keyboard + mouse input for VOIDHARVEST.
// Movement: WASD or arrow keys. Aim: mouse position; fire: hold left mouse.
// Keyboard-only fallback: arrow keys move, Space fires toward the nearest
// enemy (or straight up when nothing is near), Shift slows to a fine aim.
// The game reads this through small queries — moveAxis(), aimPoint() — so the
// selftest and staged screenshots can drive the same code with scripted input.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = canvas.width / 2;
    this.mouseY = canvas.height / 2;
    this.mouseDown = false;
    // Scripted overrides used by ?shot= and ?selftest=1.
    this.script = null;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
      this.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  down(key) {
    return this.keys.has(key);
  }

  // True only on the frame the key went down; consumed by endOfFrame().
  wasPressed(key) {
    return this.pressed.has(key);
  }

  endOfFrame() {
    this.pressed.clear();
  }

  // Normalised movement vector from WASD / arrows. {x, y} in [-1, 1].
  moveAxis() {
    if (this.script && this.script.move) return this.script.move;
    let x = 0;
    let y = 0;
    if (this.down('a') || this.down('ArrowLeft')) x -= 1;
    if (this.down('d') || this.down('ArrowRight')) x += 1;
    if (this.down('w') || this.down('ArrowUp')) y -= 1;
    if (this.down('s') || this.down('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  // Aim point in canvas pixels. Mouse by default; with the keyboard-only
  // fallback the caller passes a world target instead (see player.js).
  aimPoint() {
    if (this.script && this.script.aim) return this.script.aim;
    return { x: this.mouseX, y: this.mouseY };
  }

  firing() {
    if (this.script) return !!this.script.firing;
    return this.mouseDown || this.down(' ');
  }

  // Keyboard-only play uses Space to fire; the mouse is optional entirely.
  usingKeyboardFire() {
    return this.down(' ');
  }
}

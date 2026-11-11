const MOVEMENT_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
]);

/**
 * Keyboard + pointer controller. Pointer coordinates are normalised device
 * coordinates so the game can translate them to its own world scale on resize.
 */
export class Input {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.keys = new Set();
    this.pointer = {
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      deltaX: 0,
      deltaY: 0,
      active: false,
      down: false,
      type: "mouse",
    };

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);
    this.onBlur = this.onBlur.bind(this);

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
  }

  get axis() {
    let x = 0;
    let y = 0;
    if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) x -= 1;
    if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) x += 1;
    if (this.keys.has("ArrowUp") || this.keys.has("KeyW")) y += 1;
    if (this.keys.has("ArrowDown") || this.keys.has("KeyS")) y -= 1;

    if (x !== 0 && y !== 0) {
      const length = Math.SQRT2;
      x /= length;
      y /= length;
    }
    return { x, y };
  }

  setPointerFromEvent(event) {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  onKeyDown(event) {
    const isButton =
      event.target instanceof HTMLElement &&
      (event.target.tagName === "BUTTON" || event.target.tagName === "A");

    if ((MOVEMENT_KEYS.has(event.code) || event.code === "Space") && !isButton) {
      event.preventDefault();
    }

    this.keys.add(event.code);

    if (event.repeat) return;

    if (event.code === "Escape" || event.code === "KeyP") {
      this.callbacks.onPause?.();
    } else if (event.code === "KeyM") {
      this.callbacks.onMute?.();
    } else if ((event.code === "Enter" || event.code === "Space") && !isButton) {
      this.callbacks.onConfirm?.();
    }
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
  }

  onPointerMove(event) {
    this.pointer.type = event.pointerType || "mouse";
    this.setPointerFromEvent(event);
    this.pointer.deltaX = this.pointer.x - this.pointer.startX;
    this.pointer.deltaY = this.pointer.y - this.pointer.startY;
    this.pointer.active = event.pointerType !== "mouse" ? this.pointer.down : true;
  }

  onPointerDown(event) {
    this.pointer.type = event.pointerType || "mouse";
    this.setPointerFromEvent(event);
    this.pointer.startX = this.pointer.x;
    this.pointer.startY = this.pointer.y;
    this.pointer.deltaX = 0;
    this.pointer.deltaY = 0;
    this.pointer.down = true;
    this.pointer.active = true;
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic events and some browsers may reject pointer capture.
    }
    this.callbacks.onPointerDown?.();
  }

  onPointerUp(event) {
    this.pointer.down = false;
    if ((event.pointerType || "mouse") !== "mouse") {
      this.pointer.active = false;
    }
  }

  onPointerLeave(event) {
    if ((event.pointerType || "mouse") === "mouse" && !this.pointer.down) {
      this.pointer.active = false;
    }
  }

  onBlur() {
    this.keys.clear();
    this.pointer.active = false;
    this.pointer.down = false;
  }

  /** Ignore the pointer until it moves again, e.g. after clicking "start". */
  clearPointer() {
    this.pointer.active = false;
    this.pointer.down = false;
    this.pointer.deltaX = 0;
    this.pointer.deltaY = 0;
  }
}

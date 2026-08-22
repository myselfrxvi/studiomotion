
export class Engine {
  constructor() {
    this.animations = new Set();
    this.isPaused = false;
    this.speed = 1.0;
    this.fps = 60;
    this.lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.rafId = null;
    this._tick = this._tick.bind(this);
  }

  add(anim) {
    this.animations.add(anim);
    if (!this.rafId && !this.isPaused && typeof requestAnimationFrame !== 'undefined') {
      this.lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.rafId = requestAnimationFrame(this._tick);
    }
  }

  remove(anim) {
    this.animations.delete(anim);
    if (this.animations.size === 0 && this.rafId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  pause() {
    this.isPaused = true;
    if (this.rafId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (this.animations.size > 0 && typeof requestAnimationFrame !== 'undefined') {
        this.rafId = requestAnimationFrame(this._tick);
      }
    }
  }

  _tick(currentTime) {
    if (this.isPaused) return;
    const now = currentTime || (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const rawDelta = now - this.lastTime;
    this.lastTime = now;
    const delta = Math.min(64, Math.max(0, rawDelta)) * this.speed;

    const animList = Array.from(this.animations);
    for (let i = 0; i < animList.length; i++) {
      animList[i]._step(delta);
    }

    if (this.animations.size > 0 && typeof requestAnimationFrame !== 'undefined') {
      this.rafId = requestAnimationFrame(this._tick);
    } else {
      this.rafId = null;
    }
  }
}

export const GlobalEngine = new Engine();

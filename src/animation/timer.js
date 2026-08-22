
import { GlobalEngine } from '../engine/engine.js';

export class Timer {
  constructor(config = {}) {
    this.duration = config.duration || Infinity;
    this.loop = config.loop || false;
    this.onTick = config.onTick || null;
    this.onComplete = config.onComplete || null;
    this.currentTime = 0;
    this.isRunning = false;
    this.lastStepTime = 0;

    if (config.autoplay !== false) this.play();
  }

  play() {
    this.isRunning = true;
    this.lastStepTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    GlobalEngine.add(this);
    return this;
  }

  pause() {
    this.isRunning = false;
    GlobalEngine.remove(this);
    return this;
  }

  restart() {
    this.currentTime = 0;
    return this.play();
  }

  _step() {
    if (!this.isRunning) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = Math.min(64, Math.max(0, now - (this.lastStepTime || now)));
    this.lastStepTime = now;
    this.currentTime += dt;

    if (this.onTick) this.onTick(this.currentTime);

    if (this.currentTime >= this.duration) {
      if (this.loop) {
        this.currentTime = 0;
      } else {
        this.pause();
        if (this.onComplete) this.onComplete(this);
      }
    }
  }
}

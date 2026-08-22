
import { clamp } from '../core/utils.js';
import { GlobalEngine } from '../engine/engine.js';
import { Animation } from '../animation/animation.js';

export class Timeline {
  constructor(config = {}) {
    this.children = [];
    this.labels = new Map();
    this.currentTime = 0;
    this.duration = 0;
    this.isRunning = false;
    this.loop = config.loop || false;
    this.onComplete = config.onComplete || null;

    if (config.autoplay !== false) {
      this.play();
    }
  }

  add(animConfig, offset = '+=0') {
    const startTime = this._calcOffset(offset);
    const anim = new Animation(Object.assign({}, animConfig, { autoplay: false }));
    this.children.push({ anim, startTime });

    const endTime = startTime + (anim.duration + anim.delay + anim.endDelay);
    if (endTime > this.duration) this.duration = endTime;

    return this;
  }

  addLabel(labelName, offset = '+=0') {
    this.labels.set(labelName, this._calcOffset(offset));
    return this;
  }

  _calcOffset(offset) {
    if (typeof offset === 'number') return offset;
    if (typeof offset === 'string') {
      if (this.labels.has(offset)) return this.labels.get(offset);
      if (offset.startsWith('+=')) return this.duration + parseFloat(offset.slice(2));
      if (offset.startsWith('-=')) return Math.max(0, this.duration - parseFloat(offset.slice(2)));
      return parseFloat(offset) || this.duration;
    }
    return this.duration;
  }

  play() {
    this.isRunning = true;
    GlobalEngine.add(this);
    return this;
  }

  pause() {
    this.isRunning = false;
    GlobalEngine.remove(this);
    return this;
  }

  restart() {
    this.pause();
    this.currentTime = 0;
    this.children.forEach(c => c.anim.seek(0));
    this.play();
    return this;
  }

  seek(progressRatio) {
    this.currentTime = clamp(progressRatio, 0, 1) * this.duration;
    this._syncChildren();
    return this;
  }

  _step(delta) {
    this.currentTime += delta;
    this._syncChildren();

    if (this.currentTime >= this.duration) {
      if (this.loop) {
        this.currentTime = 0;
        this.children.forEach(c => c.anim.seek(0));
      } else {
        this.pause();
        if (this.onComplete) this.onComplete(this);
      }
    }
  }

  _syncChildren() {
    this.children.forEach(c => {
      if (this.currentTime >= c.startTime) {
        const childProgress = clamp((this.currentTime - c.startTime) / c.anim.duration, 0, 1);
        c.anim.seek(childProgress);
      }
    });
  }
}

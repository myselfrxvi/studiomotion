import { clamp } from '../core/utils.js';
import { GlobalEngine } from '../engine/engine.js';
import { Animation } from '../animation/animation.js';

export class Timeline {
  constructor(config = {}) {
    this.children = [];
    this.callbacks = [];
    this.labels = new Map();
    this.currentTime = 0;
    this.duration = 0;
    this.isRunning = false;
    this.loop = config.loop || false;
    this.timeScale = config.timeScale !== undefined ? config.timeScale : 1;
    this.isReversed = false;
    this.direction = config.direction || 'normal';

    this.onBegin = config.onBegin || null;
    this.onUpdate = config.onUpdate || null;
    this.onLoop = config.onLoop || null;
    this.onComplete = config.onComplete || null;

    this.began = false;
    this.completed = false;
    this.lastStepTime = 0;

    if (config.autoplay !== false) {
      this.play();
    }
  }

  add(item, offset = '+=0') {
    const startTime = this._calcOffset(offset);
    let child = null;
    let childDuration = 0;

    if (item instanceof Animation || item instanceof Timeline) {
      child = item;
      child.pause();
      childDuration = (child.duration || 0) + (child.endDelay || 0);
    } else if (typeof item === 'object' && item !== null) {
      child = new Animation(Object.assign({}, item, { autoplay: false }));
      childDuration = (child.duration || 0) + (child.endDelay || 0);
    }

    if (child) {
      this.children.push({ child, startTime, duration: childDuration });
      const endTime = startTime + childDuration;
      if (endTime > this.duration) this.duration = endTime;
    }

    return this;
  }

  set(targets, props, offset = '+=0') {
    return this.add(Object.assign({ targets, duration: 0 }, props), offset);
  }

  addCallback(fn, offset = '+=0') {
    const time = this._calcOffset(offset);
    this.callbacks.push({ fn, time, executed: false });
    if (time > this.duration) this.duration = time;
    return this;
  }

  addLabel(labelName, offset = '+=0') {
    this.labels.set(labelName, this._calcOffset(offset));
    return this;
  }

  _calcOffset(offset) {
    if (typeof offset === 'number') return Math.max(0, offset);
    if (typeof offset === 'string') {
      const match = offset.match(/^([a-zA-Z0-9_-]+)?([+-]=?)([\d.]+%?)$/);
      if (match) {
        const label = match[1];
        const op = match[2];
        let valStr = match[3];

        let baseTime = this.duration;
        if (label && this.labels.has(label)) {
          baseTime = this.labels.get(label);
        }

        let delta = 0;
        if (valStr.endsWith('%')) {
          const lastChild = this.children[this.children.length - 1];
          const refDur = lastChild ? lastChild.duration : this.duration;
          delta = (parseFloat(valStr) / 100) * refDur;
        } else {
          delta = parseFloat(valStr) || 0;
        }

        if (op === '+=' || op === '+') return Math.max(0, baseTime + delta);
        if (op === '-=' || op === '-') return Math.max(0, baseTime - delta);
      }

      if (this.labels.has(offset)) return this.labels.get(offset);
      return parseFloat(offset) || this.duration;
    }
    return this.duration;
  }

  play() {
    this.isRunning = true;
    this.completed = false;
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
    this.pause();
    this.currentTime = 0;
    this.began = false;
    this.completed = false;
    this.callbacks.forEach(cb => { cb.executed = false; });
    this.children.forEach(c => c.child.seek(0));
    this.play();
    return this;
  }

  reverse() {
    this.isReversed = !this.isReversed;
    return this;
  }

  seek(progressRatio) {
    this.currentTime = clamp(progressRatio, 0, 1) * this.duration;
    this._syncChildren();
    return this;
  }

  _step() {
    if (!this.isRunning) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = Math.min(64, Math.max(0, now - (this.lastStepTime || now))) * this.timeScale;
    this.lastStepTime = now;

    if (!this.began) {
      this.began = true;
      if (this.onBegin) this.onBegin(this);
    }

    if (this.isReversed) {
      this.currentTime -= dt;
    } else {
      this.currentTime += dt;
    }

    this._syncChildren();

    for (let i = 0; i < this.callbacks.length; i++) {
      const cb = this.callbacks[i];
      if (!cb.executed && this.currentTime >= cb.time) {
        cb.executed = true;
        cb.fn(this);
      }
    }

    if (this.onUpdate) this.onUpdate(this);

    const isEnd = !this.isReversed && this.currentTime >= this.duration;
    const isStart = this.isReversed && this.currentTime <= 0;

    if (isEnd || isStart) {
      if (this.loop) {
        if (typeof this.loop === 'number') {
          this.loop--;
          if (this.loop <= 0) {
            this._complete();
            return;
          }
        }
        if (this.direction === 'alternate') {
          this.isReversed = !this.isReversed;
        }
        this.currentTime = this.isReversed ? this.duration : 0;
        this.callbacks.forEach(cb => { cb.executed = false; });
        if (this.onLoop) this.onLoop(this);
      } else {
        this._complete();
      }
    }
  }

  _complete() {
    this.completed = true;
    this.isRunning = false;
    GlobalEngine.remove(this);
    if (this.onComplete) this.onComplete(this);
  }

  _syncChildren() {
    for (let i = 0; i < this.children.length; i++) {
      const c = this.children[i];
      if (this.currentTime < c.startTime) {
        if (c.child.progress > 0) {
          c.child.seek(0);
        }
      } else if (this.currentTime >= c.startTime + c.duration) {
        c.child.seek(1);
      } else if (c.duration > 0) {
        const childProgress = (this.currentTime - c.startTime) / c.duration;
        c.child.seek(childProgress);
      } else {
        c.child.seek(1);
      }
    }
  }
}

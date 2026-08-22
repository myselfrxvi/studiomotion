
(function (global, factory) {
  var instance = factory();
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = instance;
  }
  if (typeof define === 'function' && define.amd) {
    define(function () { return instance; });
  }
  if (typeof global !== 'undefined') global.StudioMotion = instance;
  if (typeof window !== 'undefined') window.StudioMotion = instance;
  if (typeof self !== 'undefined') self.StudioMotion = instance;
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const Utils = {
    clamp: (val, min, max) => Math.min(Math.max(val, min), max),
    lerp: (a, b, t) => a + (b - a) * t,
    mapRange: (val, inMin, inMax, outMin, outMax) => outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin),
    random: (min, max) => Math.random() * (max - min) + min,
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    stagger: (val, opts = {}) => {
      const from = opts.from || 0;
      const ease = typeof opts.easing === 'function' ? opts.easing : (t => t);
      return (index, total = 1) => {
        let factor = total > 1 ? index / (total - 1) : 0;
        if (from === 'center') factor = Math.abs(index - (total - 1) / 2) / ((total - 1) / 2 || 1);
        else if (from === 'last') factor = 1 - factor;
        return ease(factor) * (typeof val === 'function' ? val(index, total) : val * index);
      };
    },
    toArray: targets => {
      if (!targets) return [];
      if (typeof targets === 'string') return Array.from(document.querySelectorAll(targets));
      if (targets instanceof Element || targets instanceof SVGElement) return [targets];
      if (NodeList.prototype.isPrototypeOf(targets) || HTMLCollection.prototype.isPrototypeOf(targets) || Array.isArray(targets)) return Array.from(targets);
      return [targets];
    },
    parseColor: str => {
      if (typeof str !== 'string') return null;
      if (str.startsWith('#')) {
        let hex = str.slice(1);
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const num = parseInt(hex, 16);
        return [ (num >> 16) & 255, (num >> 8) & 255, num & 255, 1 ];
      }
      const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        return [ parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), match[4] !== undefined ? parseFloat(match[4]) : 1 ];
      }
      return null;
    }
  };

  const EASINGS = {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    easeInCubic: t => t * t * t,
    easeOutCubic: t => --t * t * t + 1,
    easeInOutCubic: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
    easeInExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
    easeOutExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    easeInOutExpo: t => {
      if (t === 0 || t === 1) return t;
      return t < 0.5 ? 0.5 * Math.pow(2, 20 * t - 10) : 1 - 0.5 * Math.pow(2, -20 * t + 10);
    },
    easeOutBack: (t, overshoot = 1.70158) => {
      const c = overshoot + 1;
      return 1 + c * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
    },
    easeOutBounce: t => {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
    spring: (t, mass = 1, stiffness = 100, damping = 10) => {
      const w0 = Math.sqrt(stiffness / mass);
      const zeta = damping / (2 * Math.sqrt(stiffness * mass));
      if (zeta < 1) {
        const wd = w0 * Math.sqrt(1 - zeta * zeta);
        return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
      }
      return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
    },
    cubicBezier: (x1, y1, x2, y2) => {
      return function (t) {
        const cx = 3 * x1;
        const bx = 3 * (x2 - x1) - cx;
        const ax = 1 - cx - bx;
        const cy = 3 * y1;
        const by = 3 * (y2 - y1) - cy;
        const ay = 1 - cy - by;
        return ((ay * t + by) * t + cy) * t;
      };
    }
  };

  class Engine {
    constructor() {
      this.animations = new Set();
      this.isPaused = false;
      this.speed = 1.0;
      this.fps = 60;
      this.lastTime = performance.now();
      this.rafId = null;
      this._tick = this._tick.bind(this);
    }

    add(anim) {
      this.animations.add(anim);
      if (!this.rafId && !this.isPaused) {
        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame(this._tick);
      }
    }

    remove(anim) {
      this.animations.delete(anim);
      if (this.animations.size === 0 && this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    pause() {
      this.isPaused = true;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    resume() {
      if (!this.isPaused) return;
      this.isPaused = false;
      this.lastTime = performance.now();
      if (this.animations.size > 0 && !this.rafId) {
        this.rafId = requestAnimationFrame(this._tick);
      }
    }

    _tick(now) {
      if (this.isPaused) return;
      this.lastTime = now;

      this.animations.forEach(anim => {
        if (anim.isRunning) anim._step(now);
      });

      if (this.animations.size > 0) {
        this.rafId = requestAnimationFrame(this._tick);
      } else {
        this.rafId = null;
      }
    }
  }

  const GlobalEngine = new Engine();

  class Timer {
    constructor(opts = {}) {
      this.duration = opts.duration || Infinity;
      this.onTick = opts.onTick || null;
      this.onComplete = opts.onComplete || null;
      this.elapsed = 0;
      this.isRunning = false;
      this.lastTime = performance.now();
      if (opts.autoplay !== false) this.start();
    }
    start() {
      this.isRunning = true;
      this.lastTime = performance.now();
      GlobalEngine.add(this);
    }
    pause() {
      this.isRunning = false;
      GlobalEngine.remove(this);
    }
    _step(now) {
      const dt = Math.min(64, now - this.lastTime) * GlobalEngine.speed;
      this.lastTime = now;
      this.elapsed += dt;
      if (this.onTick) this.onTick(this.elapsed);
      if (this.elapsed >= this.duration) {
        this.pause();
        if (this.onComplete) this.onComplete();
      }
    }
  }

  const TRANSFORM_PROPS = ['translateX', 'translateY', 'translateZ', 'scale', 'scaleX', 'scaleY', 'scaleZ', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'skewX', 'skewY', 'perspective'];

  function parsePropertyValue(target, prop, rawVal, index, total) {
    let val = typeof rawVal === 'function' ? rawVal(target, index, total) : rawVal;

    let isRelative = false;
    let relOp = null;
    let relVal = 0;
    if (typeof val === 'string' && (val.startsWith('+=') || val.startsWith('-=') || val.startsWith('*='))) {
      isRelative = true;
      relOp = val.slice(0, 2);
      relVal = parseFloat(val.slice(2));
    }

    if (typeof val === 'string' && (val.startsWith('#') || val.startsWith('rgb'))) {
      const c = Utils.parseColor(val);
      if (c) return { isColor: true, color: c, original: val };
    }

    let startVal = 0;
    let endVal = 0;
    let unit = '';

    if (Array.isArray(val)) {
      startVal = parseFloat(val[0]);
      endVal = parseFloat(val[1]);
      const match = String(val[1]).match(/[a-z%]+/i);
      if (match) unit = match[0];
    } else {
      endVal = parseFloat(val);
      const match = String(val).match(/[a-z%]+/i);
      if (match) unit = match[0];
    }

    return { startVal, endVal, unit, isRelative, relOp, relVal };
  }

  class Animation {
    constructor(config = {}) {
      this.targets = Utils.toArray(config.targets);
      this.duration = config.duration !== undefined ? config.duration : 1000;
      this.delay = config.delay || 0;
      this.endDelay = config.endDelay || 0;
      this.easing = typeof config.easing === 'function' ? config.easing : (EASINGS[config.easing] || EASINGS.spring);
      this.direction = config.direction || 'normal';
      this.loop = config.loop !== undefined ? config.loop : 1;
      this.stagger = config.stagger || 0;
      this.round = config.round || null;

      this.onBegin = config.onBegin || null;
      this.onUpdate = config.onUpdate || null;
      this.onRender = config.onRender || null;
      this.onLoop = config.onLoop || null;
      this.onComplete = config.onComplete || null;

      this.keyframes = config.keyframes || null;
      this.props = {};
      const reserved = ['targets', 'duration', 'delay', 'endDelay', 'easing', 'direction', 'loop', 'stagger', 'round', 'keyframes', 'onBegin', 'onUpdate', 'onRender', 'onLoop', 'onComplete', 'autoplay'];

      Object.keys(config).forEach(key => {
        if (!reserved.includes(key)) this.props[key] = config[key];
      });

      this.currentTime = 0;
      this.progress = 0;
      this.isRunning = false;
      this.loopCount = 0;
      this.isReversed = this.direction === 'reverse';
      this.completed = false;
      this.began = false;
      this.paused = true;
      this.lastStepTime = performance.now();

      this.targets.forEach(t => {
        if (t && t.__studioMotion && typeof t.__studioMotion.pause === 'function') {
          t.__studioMotion.pause();
        }
        if (t) t.__studioMotion = this;
      });

      if (config.autoplay !== false) {
        this.play();
      }
    }

    play() {
      this.isRunning = true;
      this.paused = false;
      this.lastStepTime = performance.now();
      if (this.completed) {
        this.currentTime = 0;
        this.progress = 0;
        this.completed = false;
      }
      if (!this.began) {
        this.began = true;
        if (this.onBegin) this.onBegin(this);
      }

      this._applyValues(this.isReversed ? 1 : 0);
      GlobalEngine.add(this);
      return this;
    }

    pause() {
      this.isRunning = false;
      this.paused = true;
      GlobalEngine.remove(this);
      return this;
    }

    reverse() {
      this.isReversed = !this.isReversed;
      return this;
    }

    restart() {
      this.pause();
      this.currentTime = 0;
      this.progress = 0;
      this.loopCount = 0;
      this.completed = false;
      this.began = false;
      this.isReversed = this.direction === 'reverse';
      this.play();
      return this;
    }

    seek(progressRatio) {
      this.progress = Utils.clamp(progressRatio, 0, 1);
      this.currentTime = this.progress * this.duration;
      this._applyValues(this.progress);
      return this;
    }

    _step(now) {
      const dt = Math.min(64, Math.max(0, now - this.lastStepTime)) * GlobalEngine.speed;
      this.lastStepTime = now;
      this.currentTime += dt;

      let rawProgress = this.duration > 0 ? (this.currentTime - this.delay) / this.duration : 1;
      rawProgress = Utils.clamp(rawProgress, 0, 1);

      const easedProgress = this.isReversed ? 1 - this.easing(rawProgress) : this.easing(rawProgress);
      this.progress = rawProgress;

      this._applyValues(easedProgress);

      if (this.onUpdate) this.onUpdate(this);
      if (this.onRender) this.onRender(this);

      if (rawProgress >= 1) {
        this.loopCount++;
        const shouldLoop = this.loop === true || this.loopCount < this.loop;

        if (shouldLoop) {
          if (this.onLoop) this.onLoop(this);
          if (this.direction === 'alternate') this.isReversed = !this.isReversed;
          this.currentTime = 0;
          this.lastStepTime = performance.now();
        } else {
          this.completed = true;
          this.pause();
          if (this.onComplete) this.onComplete(this);
        }
      }
    }

    _applyValues(easedProgress) {
      this.targets.forEach((target, idx) => {
        const staggerDelay = typeof this.stagger === 'function' ? this.stagger(idx, this.targets.length) : idx * this.stagger;
        let itemProgress = this.duration > 0 ? (this.currentTime - this.delay - staggerDelay) / this.duration : 1;
        itemProgress = Utils.clamp(itemProgress, 0, 1);
        const itemEased = this.easing(itemProgress);

        let transformParts = [];

        if (this.keyframes && Array.isArray(this.keyframes)) {
          const stepCount = this.keyframes.length;
          const currentStepIdx = Math.min(stepCount - 1, Math.floor(itemProgress * stepCount));
          const stepConfig = this.keyframes[currentStepIdx];
          Object.keys(stepConfig).forEach(k => {
            if (TRANSFORM_PROPS.includes(k)) {
              transformParts.push(`${k}(${stepConfig[k]})`);
            } else if (target.style) {
              target.style[k] = stepConfig[k];
            }
          });
        }

        Object.keys(this.props).forEach(prop => {
          const rawVal = this.props[prop];
          let val = typeof rawVal === 'function' ? rawVal(target, idx, this.targets.length) : rawVal;

          if (typeof val === 'string' && (val.startsWith('#') || val.startsWith('rgb'))) {
            if (target.style) target.style[prop] = val;
            return;
          }

          let currentVal = 0;
          let unit = '';

          if (Array.isArray(val)) {
            const match = String(val[val.length - 1]).match(/[a-z%]+/i);
            if (match) unit = match[0];

            if (val.length === 2) {
              const startVal = parseFloat(val[0]);
              const endVal = parseFloat(val[1]);
              currentVal = startVal + (endVal - startVal) * itemEased;
            } else if (val.length > 2) {
              const totalSegments = val.length - 1;
              const scaledProgress = itemEased * totalSegments;
              const segIndex = Math.min(totalSegments - 1, Math.max(0, Math.floor(scaledProgress)));
              const subProgress = scaledProgress - segIndex;
              const segStart = parseFloat(val[segIndex]);
              const segEnd = parseFloat(val[segIndex + 1]);
              currentVal = segStart + (segEnd - segStart) * subProgress;
            } else {
              currentVal = parseFloat(val[0]);
            }
          } else {
            const match = String(val).match(/[a-z%]+/i);
            if (match) unit = match[0];
            const endVal = parseFloat(val);
            currentVal = endVal * itemEased;
          }

          if (this.round) currentVal = Math.round(currentVal * this.round) / this.round;

          if (TRANSFORM_PROPS.includes(prop)) {
            if (prop === 'scale' || prop === 'scaleX' || prop === 'scaleY' || prop === 'scaleZ') {
              transformParts.push(`${prop}(${currentVal})`);
            } else if (prop.startsWith('rotate') || prop.startsWith('skew')) {
              transformParts.push(`${prop}(${currentVal}${unit || 'deg'})`);
            } else {
              transformParts.push(`${prop}(${currentVal}${unit || 'px'})`);
            }
          }

          else if (prop.startsWith('--') && target.style) {
            target.style.setProperty(prop, `${currentVal}${unit || ''}`);
          }

          else if (target instanceof SVGElement && target.hasAttribute(prop)) {
            target.setAttribute(prop, currentVal);
          }

          else if (target instanceof HTMLElement && (prop in target) && prop !== 'style') {
            target[prop] = currentVal;
          }

          else if (typeof target === 'object' && target[prop] !== undefined && !target.style) {
            target[prop] = currentVal;
          }

          else if (target.style) {
            if (prop === 'blur') target.style.filter = `blur(${currentVal}${unit || 'px'})`;
            else target.style[prop] = `${currentVal}${unit || ''}`;
          }
        });

        if (transformParts.length > 0 && target.style) {
          target.style.transform = transformParts.join(' ');
        }
      });
    }
  }

  class Timeline {
    constructor(opts = {}) {
      this.children = [];
      this.labels = {};
      this.duration = 0;
      this.currentTime = 0;
      this.isRunning = false;
      this.loop = opts.loop || 1;
      this.onComplete = opts.onComplete || null;
      if (opts.autoplay !== false) this.play();
    }

    add(config, offset = '+=0') {
      config.autoplay = false;
      const anim = new Animation(config);
      let insertionTime = this.duration;

      if (typeof offset === 'number') {
        insertionTime = offset;
      } else if (typeof offset === 'string') {
        if (offset.startsWith('+=')) insertionTime = this.duration + parseFloat(offset.slice(2));
        else if (offset.startsWith('-=')) insertionTime = Math.max(0, this.duration - parseFloat(offset.slice(2)));
        else if (this.labels[offset] !== undefined) insertionTime = this.labels[offset];
      }

      this.children.push({ anim, startTime: insertionTime, endTime: insertionTime + anim.duration + anim.delay });
      this.duration = Math.max(this.duration, insertionTime + anim.duration + anim.delay);
      return this;
    }

    addLabel(name, offset = '+=0') {
      let labelTime = this.duration;
      if (typeof offset === 'number') labelTime = offset;
      else if (offset.startsWith('+=')) labelTime = this.duration + parseFloat(offset.slice(2));
      else if (offset.startsWith('-=')) labelTime = Math.max(0, this.duration - parseFloat(offset.slice(2)));
      this.labels[name] = labelTime;
      return this;
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
      this.currentTime = Utils.clamp(progressRatio, 0, 1) * this.duration;
      this._syncChildren();
      return this;
    }

    _step(delta) {
      this.currentTime += delta;
      this._syncChildren();

      if (this.currentTime >= this.duration) {
        this.pause();
        if (this.onComplete) this.onComplete(this);
      }
    }

    _syncChildren() {
      this.children.forEach(c => {
        if (this.currentTime >= c.startTime) {
          const childProgress = Utils.clamp((this.currentTime - c.startTime) / c.anim.duration, 0, 1);
          c.anim.seek(childProgress);
        }
      });
    }
  }

  function animatable(targetObj, defaultOpts = {}) {
    return new Proxy(targetObj, {
      set(target, prop, value) {
        if (typeof value === 'number' && typeof target[prop] === 'number') {
          new Animation({
            targets: target,
            [prop]: [target[prop], value],
            duration: defaultOpts.duration || 600,
            easing: defaultOpts.easing || 'spring',
            ...defaultOpts
          });
        } else {
          target[prop] = value;
        }
        return true;
      }
    });
  }

  function draggable(target, opts = {}) {
    const els = Utils.toArray(target);
    els.forEach(el => {
      let isDragging = false;
      let startX = 0, startY = 0;
      let curX = 0, curY = 0;
      let velX = 0, velY = 0;
      let lastTime = 0;

      el.style.cursor = 'grab';
      el.style.touchAction = 'none';

      const onPointerDown = e => {
        isDragging = true;
        el.style.cursor = 'grabbing';
        startX = e.clientX - curX;
        startY = e.clientY - curY;
        lastTime = performance.now();
        if (opts.onDragStart) opts.onDragStart(curX, curY);
      };

      const onPointerMove = e => {
        if (!isDragging) return;
        const now = performance.now();
        const dt = now - lastTime || 16;
        const newX = e.clientX - startX;
        const newY = e.clientY - startY;

        velX = (newX - curX) / dt;
        velY = (newY - curY) / dt;
        curX = newX;
        curY = newY;
        lastTime = now;

        el.style.transform = `translate3d(${curX}px, ${curY}px, 0px)`;
        if (opts.onDrag) opts.onDrag(curX, curY);
      };

      const onPointerUp = () => {
        if (!isDragging) return;
        isDragging = false;
        el.style.cursor = 'grab';

        const targetX = opts.snap ? Math.round(curX / opts.snap) * opts.snap : (opts.inertia !== false ? curX + velX * 120 : curX);
        const targetY = opts.snap ? Math.round(curY / opts.snap) * opts.snap : (opts.inertia !== false ? curY + velY * 120 : curY);

        new Animation({
          targets: el,
          translateX: [curX, targetX],
          translateY: [curY, targetY],
          duration: 650,
          easing: 'spring',
          onUpdate: () => {
            curX = targetX;
            curY = targetY;
          },
          onComplete: () => {
            if (opts.onDragEnd) opts.onDragEnd(curX, curY);
          }
        });
      };

      el.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });
  }

  function layout(container, mutationCallback, opts = {}) {
    const parent = typeof container === 'string' ? document.querySelector(container) : container;
    if (!parent) return;

    const children = Array.from(parent.children);
    const firstRects = new Map();
    children.forEach(child => firstRects.set(child, child.getBoundingClientRect()));

    if (typeof mutationCallback === 'function') mutationCallback();

    requestAnimationFrame(() => {
      children.forEach(child => {
        const first = firstRects.get(child);
        const last = child.getBoundingClientRect();
        if (!first) return;

        const dx = first.left - last.left;
        const dy = first.top - last.top;
        const dw = first.width / last.width;
        const dh = first.height / last.height;

        if (dx !== 0 || dy !== 0 || dw !== 1 || dh !== 1) {
          child.style.transform = `translate3d(${dx}px, ${dy}px, 0px) scale(${dw}, ${dh})`;
          child.style.transformOrigin = 'top left';

          new Animation({
            targets: child,
            translateX: [dx, 0],
            translateY: [dy, 0],
            scaleX: [dw, 1],
            scaleY: [dh, 1],
            duration: opts.duration || 600,
            easing: opts.easing || 'spring'
          });
        }
      });
    });
  }

  function scope(rootElement, scopeCallback) {
    const root = typeof rootElement === 'string' ? document.querySelector(rootElement) : rootElement;
    const scopedAnimations = [];

    const scopedStudio = {
      animate: cfg => {
        if (typeof cfg.targets === 'string') cfg.targets = Array.from(root.querySelectorAll(cfg.targets));
        const anim = new Animation(cfg);
        scopedAnimations.push(anim);
        return anim;
      },
      timeline: cfg => {
        const tl = new Timeline(cfg);
        scopedAnimations.push(tl);
        return tl;
      },
      revert: () => {
        scopedAnimations.forEach(a => a.pause());
        scopedAnimations.length = 0;
      }
    };

    if (typeof scopeCallback === 'function') scopeCallback(scopedStudio);
    return scopedStudio;
  }

  const SVG = {
    createDrawable: (targets, opts = {}) => {
      const paths = Utils.toArray(targets);
      return paths.map(path => {
        const len = path.getTotalLength ? path.getTotalLength() : 300;
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        return new Animation({
          targets: path,
          strokeDashoffset: [len, 0],
          duration: opts.duration || 1000,
          easing: opts.easing || 'easeInOutQuad',
          ...opts
        });
      });
    },

    createMotionPath: (target, pathSelector, opts = {}) => {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      const path = typeof pathSelector === 'string' ? document.querySelector(pathSelector) : pathSelector;
      if (!el || !path || !path.getTotalLength) return;

      const len = path.getTotalLength();
      return new Animation({
        targets: el,
        duration: opts.duration || 2000,
        easing: opts.easing || 'linear',
        onUpdate: anim => {
          const pt = path.getPointAtLength(anim.progress * len);
          el.style.transform = `translate3d(${pt.x}px, ${pt.y}px, 0px)`;
          if (opts.autoRotate) {
            const nextPt = path.getPointAtLength(Math.min(len, anim.progress * len + 1));
            const angle = Math.atan2(nextPt.y - pt.y, nextPt.x - pt.x) * (180 / Math.PI);
            el.style.transform += ` rotate(${angle}deg)`;
          }
        },
        ...opts
      });
    },

    morphTo: (targetPath, endPathSelector, opts = {}) => {
      const p1 = typeof targetPath === 'string' ? document.querySelector(targetPath) : targetPath;
      const p2 = typeof endPathSelector === 'string' ? document.querySelector(endPathSelector) : endPathSelector;
      if (!p1 || !p2 || !p1.getTotalLength || !p2.getTotalLength) return;

      const len1 = p1.getTotalLength();
      const len2 = p2.getTotalLength();
      const samples = opts.precision || 60;
      const pts1 = [];
      const pts2 = [];

      for (let i = 0; i <= samples; i++) {
        const pt1 = p1.getPointAtLength((i / samples) * len1);
        const pt2 = p2.getPointAtLength((i / samples) * len2);
        pts1.push(`${i === 0 ? 'M' : 'L'} ${pt1.x.toFixed(2)} ${pt1.y.toFixed(2)}`);
        pts2.push(`${i === 0 ? 'M' : 'L'} ${pt2.x.toFixed(2)} ${pt2.y.toFixed(2)}`);
      }

      return new Animation({
        targets: p1,
        duration: opts.duration || 1000,
        easing: opts.easing || 'easeInOutCubic',
        onUpdate: anim => {
          const d = pts1.map((p, i) => {
            const [cmd, x1, y1] = pts1[i].split(' ');
            const [, x2, y2] = pts2[i].split(' ');
            const curX = parseFloat(x1) + (parseFloat(x2) - parseFloat(x1)) * anim.progress;
            const curY = parseFloat(y1) + (parseFloat(y2) - parseFloat(y1)) * anim.progress;
            return `${cmd} ${curX.toFixed(2)} ${curY.toFixed(2)}`;
          }).join(' ') + ' Z';
          p1.setAttribute('d', d);
        },
        ...opts
      });
    }
  };

  const Text = {
    splitChars: (targets, className = 'char') => {
      const els = Utils.toArray(targets);
      els.forEach(el => {
        const text = el.textContent;
        el.innerHTML = text.split('').map(c => `<span class="${className}" style="display:inline-block;">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
      });
      return els.map(el => Array.from(el.querySelectorAll(`.${className}`))).flat();
    },
    splitWords: (targets, className = 'word') => {
      const els = Utils.toArray(targets);
      els.forEach(el => {
        const text = el.textContent;
        el.innerHTML = text.split(' ').map(w => `<span class="${className}" style="display:inline-block; margin-right:0.25em;">${w}</span>`).join('');
      });
      return els.map(el => Array.from(el.querySelectorAll(`.${className}`))).flat();
    },
    scramble: (targets, endText, opts = {}) => {
      const els = Utils.toArray(targets);
      const chars = opts.chars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}[]:;';
      return els.map(el => {
        const targetStr = endText || el.textContent;
        const len = targetStr.length;
        return new Animation({
          targets: el,
          duration: opts.duration || 1200,
          easing: opts.easing || 'easeOutCubic',
          onUpdate: anim => {
            const revealedCount = Math.floor(anim.progress * len);
            let out = '';
            for (let i = 0; i < len; i++) {
              if (i < revealedCount || targetStr[i] === ' ') {
                out += targetStr[i];
              } else {
                out += chars[Math.floor(Math.random() * chars.length)];
              }
            }
            el.textContent = out;
          },
          ...opts
        });
      });
    }
  };

  class ScrollTriggerInstance {
    constructor(config = {}) {
      this.target = typeof config.target === 'string' ? document.querySelector(config.target) : config.target;
      this.container = config.container ? (typeof config.container === 'string' ? document.querySelector(config.container) : config.container) : window;
      this.axis = config.axis || 'y';
      this.debug = !!config.debug;
      this.repeat = config.repeat !== false;
      this.sync = config.sync || config.scrub !== undefined ? !!config.scrub : false;
      this.scrubSmooth = typeof config.scrub === 'number' ? config.scrub : (config.smooth ? 0.1 : 0);

      this.start = config.start || 'top 85%';
      this.end = config.end || 'bottom 15%';

      this.onEnter = config.onEnter || null;
      this.onLeave = config.onLeave || null;
      this.onEnterBack = config.onEnterBack || null;
      this.onLeaveBack = config.onLeaveBack || null;
      this.onUpdate = config.onUpdate || null;

      this.animation = null;
      this.timeline = config.timeline || null;
      if (config.animation) {
        const animCfg = { ...config.animation, targets: config.animation.targets || this.target, autoplay: false };
        this.animation = new Animation(animCfg);
      }

      this.progress = 0;
      this.targetProgress = 0;
      this.scrollPosition = 0;
      this.isInView = false;
      this.direction = 1;
      this.velocity = 0;
      this.lastScroll = 0;
      this.lastScrollTime = performance.now();
      this.enabled = true;
      this.rafId = null;

      this._onScroll = this._onScroll.bind(this);
      this._smoothTick = this._smoothTick.bind(this);
      this.enable();
      this.refresh();
    }

    _parseThreshold(val, isStart = true) {
      if (typeof val === 'number') return val;
      const parts = String(val).split(' ');
      const targetPos = parts[0] || (isStart ? 'top' : 'bottom');
      const viewportPos = parts[1] || (isStart ? '85%' : '15%');

      if (!this.target) return 0;
      const rect = this.target.getBoundingClientRect();
      const vh = this.container === window ? (window.innerHeight || document.documentElement.clientHeight) : this.container.clientHeight;
      const scrollY = this.container === window ? (window.pageYOffset || document.documentElement.scrollTop || 0) : this.container.scrollTop;

      let targetOffset = rect.top + scrollY;
      if (targetPos === 'center') targetOffset += rect.height / 2;
      if (targetPos === 'bottom') targetOffset += rect.height;

      let vOffset = 0;
      if (viewportPos.endsWith('%')) vOffset = vh * (parseFloat(viewportPos) / 100);
      else if (viewportPos === 'center') vOffset = vh / 2;
      else if (viewportPos === 'bottom') vOffset = vh;
      else vOffset = parseFloat(viewportPos) || 0;

      return targetOffset - vOffset;
    }

    _onScroll() {
      if (!this.enabled || !this.target) return;
      const now = performance.now();
      const currentScroll = this.container === window ? (window.pageYOffset || document.documentElement.scrollTop || 0) : this.container.scrollTop;
      const dt = Math.max(1, now - this.lastScrollTime);
      this.velocity = (currentScroll - this.lastScroll) / dt;
      this.direction = currentScroll >= this.lastScroll ? 1 : -1;
      this.scrollPosition = currentScroll;
      this.lastScroll = currentScroll;
      this.lastScrollTime = now;

      const startPx = this._parseThreshold(this.start, true);
      const endPx = this._parseThreshold(this.end, false);
      const totalDistance = Math.max(1, endPx - startPx);

      const rawProgress = Utils.clamp((currentScroll - startPx) / totalDistance, 0, 1);
      this.targetProgress = rawProgress;

      const inNow = currentScroll >= startPx && currentScroll <= endPx;

      if (inNow && !this.isInView) {
        this.isInView = true;
        if (this.direction === 1 && this.onEnter) this.onEnter(this);
        if (this.direction === -1 && this.onEnterBack) this.onEnterBack(this);
        if (!this.sync && this.animation) this.animation.play();
      } else if (!inNow && this.isInView) {
        this.isInView = false;
        if (this.direction === 1 && this.onLeave) this.onLeave(this);
        if (this.direction === -1 && this.onLeaveBack) this.onLeaveBack(this);
        if (this.repeat && !this.sync && currentScroll < startPx && this.animation) {
          this.animation.pause();
          this.animation.seek(0);
        }
      }

      if (this.sync) {
        if (this.scrubSmooth > 0) {
          if (!this.rafId) {
            this.rafId = requestAnimationFrame(this._smoothTick);
          }
        } else {
          this.progress = rawProgress;
          this._applyProgress(rawProgress);
        }
      } else {
        this.progress = rawProgress;
        if (this.onUpdate) this.onUpdate(this);
      }
    }

    _smoothTick() {
      const diff = this.targetProgress - this.progress;
      if (Math.abs(diff) > 0.0005) {
        this.progress += diff * Math.min(1, Math.max(0.02, 1 - Math.exp(-this.scrubSmooth * 60)));
        this._applyProgress(this.progress);
        this.rafId = requestAnimationFrame(this._smoothTick);
      } else {
        this.progress = this.targetProgress;
        this._applyProgress(this.progress);
        this.rafId = null;
      }
    }

    _applyProgress(p) {
      if (this.animation) {
        this.animation.seek(p);
      }
      if (this.timeline) {
        this.timeline.seek(p);
      }
      if (this.onUpdate) this.onUpdate(this);
    }

    refresh() {
      this._onScroll();
    }

    enable() {
      this.enabled = true;
      const targetScroll = this.container === window ? window : this.container;
      targetScroll.addEventListener('scroll', this._onScroll, { passive: true });
    }

    disable() {
      this.enabled = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      const targetScroll = this.container === window ? window : this.container;
      targetScroll.removeEventListener('scroll', this._onScroll);
    }

    kill() {
      this.disable();
      if (this.animation) this.animation.pause();
      if (this.timeline) this.timeline.pause();
    }
  }

  function onScroll(config) {
    return new ScrollTriggerInstance(config);
  }

  function revealOnScroll(selector = '.reveal-on-scroll', opts = {}) {
    const els = Utils.toArray(selector);
    if (!els.length) return [];
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add('is-revealed');
          if (opts.once !== false) obs.unobserve(el);
          if (opts.onReveal) opts.onReveal(el);
        }
      });
    }, {
      threshold: opts.threshold || 0.15,
      rootMargin: opts.rootMargin || '0px 0px -50px 0px'
    });

    els.forEach(el => observer.observe(el));
    return observer;
  }

  const RECIPES = {

    letterSplit: (targets, opts = {}) => {
      const chars = typeof targets === 'string' && !targets.includes(' ') ? Text.splitChars(targets) : targets;
      return new Animation({ targets: chars, translateY: [40, 0], rotate: [-20, 0], stagger: 35, duration: 650, easing: 'spring', ...opts });
    },
    wordFloat: (targets, opts = {}) => {
      const words = typeof targets === 'string' && !targets.includes(' ') ? Text.splitWords(targets) : targets;
      return new Animation({ targets: words, translateY: [30, 0], opacity: [0, 1], stagger: 70, duration: 600, easing: 'easeOutBack', ...opts });
    },
    blurReveal: (targets, opts = {}) => new Animation({ targets, blur: [16, 0], opacity: [0, 1], duration: 750, easing: 'easeOutCubic', ...opts }),
    skewSlide: (targets, opts = {}) => new Animation({ targets, translateX: [-80, 0], skewX: [-25, 0], duration: 650, easing: 'spring', ...opts }),
    fold3D: (targets, opts = {}) => new Animation({ targets, rotateX: [90, 0], opacity: [0, 1], duration: 700, easing: 'spring', ...opts }),
    conicSweep: (targets, opts = {}) => new Animation({ targets, rotate: [0, 360], duration: 2500, loop: true, easing: 'linear', ...opts }),
    decryptScramble: (targets, finalText, opts = {}) => {
      const els = Utils.toArray(targets);
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      els.forEach(el => {
        const txt = finalText || el.textContent;
        let it = 0;
        const timer = setInterval(() => {
          el.innerText = txt.split("").map((c, i) => {
            if (i < it) return txt[i];
            return chars[Math.floor(Math.random() * chars.length)];
          }).join("");
          if (it >= txt.length) {
            clearInterval(timer);
            if (opts.onComplete) opts.onComplete();
          }
          it += 1 / 2.5;
        }, 30);
      });
    },
    ambientFloat: (targets, opts = {}) => new Animation({ targets, translateY: [-16, 16], scale: [0.95, 1.05], direction: 'alternate', loop: true, duration: 1800, easing: 'easeInOutQuad', ...opts }),
    neonGlow: (targets, opts = {}) => new Animation({ targets, scale: [0.96, 1.04], duration: 1200, direction: 'alternate', loop: true, easing: 'easeInOutQuad', ...opts }),
    underlineSnap: (targets, opts = {}) => new Animation({ targets, scaleX: [0, 1], duration: 550, easing: 'spring', ...opts }),

    tilt3D: (targets, opts = {}) => new Animation({ targets, rotateX: [25, 0], rotateY: [-35, 0], scale: [0.88, 1], duration: 750, easing: 'spring', ...opts }),
    flip180: (targets, opts = {}) => new Animation({ targets, rotateY: [0, 180, 0], duration: 800, easing: 'spring', ...opts }),
    glassShimmer: (targets, opts = {}) => new Animation({ targets, translateX: [-200, 200], duration: 850, easing: 'easeInOutQuad', ...opts }),
    bentoRipple: (targets, opts = {}) => new Animation({ targets, scale: [0, 1], rotate: [-45, 0], stagger: 35, duration: 550, easing: 'easeOutBack', ...opts }),
    depthElevation: (targets, opts = {}) => new Animation({ targets, translateY: [-15, 0], scale: [1.08, 1], duration: 450, easing: 'spring', ...opts }),
    isometricExpand: (targets, opts = {}) => new Animation({ targets, scale: [0.75, 1.1, 1], duration: 600, easing: 'spring', ...opts }),
    borderSpotlight: (targets, opts = {}) => new Animation({ targets, rotate: [0, 360], duration: 2500, loop: true, easing: 'linear', ...opts }),
    cardSwipe: (targets, opts = {}) => new Animation({ targets, translateX: [0, 120, 0], rotate: [0, 15, 0], opacity: [1, 0.2, 1], duration: 750, easing: 'easeOutCubic', ...opts }),
    holoPrism: (targets, opts = {}) => new Animation({ targets, rotate: [-8, 8, 0], scale: [0.95, 1.05, 1], duration: 700, easing: 'spring', ...opts }),
    tactilePush: (targets, opts = {}) => new Animation({ targets, scale: [0.92, 1.06, 1], translateY: [3, 0], duration: 350, easing: 'spring', ...opts }),

    magnetic: (targets, opts = {}) => new Animation({ targets, translateX: [-25, 25, 0], translateY: [-12, 12, 0], duration: 600, easing: 'spring', ...opts }),
    bellWiggle: (targets, opts = {}) => new Animation({ targets, rotate: [-22, 22, -14, 14, -6, 6, 0], duration: 750, easing: 'easeInOutQuad', ...opts }),
    radarRings: (targets, opts = {}) => new Animation({ targets, scale: [0.4, 2.2], opacity: [1, 0], stagger: 200, duration: 1100, loop: true, easing: 'easeOutCubic', ...opts }),
    heartPop: (targets, opts = {}) => new Animation({ targets, scale: [0.6, 1.35, 1], duration: 450, easing: 'spring', ...opts }),
    checkDraw: (targets, opts = {}) => new Animation({ targets, strokeDashoffset: [40, 0], duration: 450, easing: 'easeOutCubic', ...opts }),
    toggleSwitch: (targets, opts = {}) => new Animation({ targets, translateX: [0, 24, 0], duration: 600, easing: 'spring', ...opts }),
    fluidRipple: (targets, opts = {}) => new Animation({ targets, scale: [0, 4], opacity: [0.6, 0], duration: 550, easing: 'easeOutQuad', ...opts }),
    accordionDrawer: (targets, opts = {}) => new Animation({ targets, translateY: [-15, 0], opacity: [0, 1], duration: 450, easing: 'spring', ...opts }),
    statusDot: (targets, opts = {}) => new Animation({ targets, scale: [0.75, 1.3], opacity: [0.5, 1], direction: 'alternate', loop: true, duration: 900, easing: 'easeInOutQuad', ...opts }),
    tooltipPop: (targets, opts = {}) => new Animation({ targets, scale: [0.7, 1.1, 1], translateY: [8, 0], duration: 400, easing: 'spring', ...opts }),

    countUp: (targets, endVal = 100, opts = {}) => {
      const obj = { val: 0 };
      const els = Utils.toArray(targets);
      return new Animation({
        targets: obj,
        val: endVal,
        round: opts.round || 1,
        duration: opts.duration || 1100,
        easing: opts.easing || 'easeOutCubic',
        onUpdate: () => {
          els.forEach(el => { el.textContent = `${obj.val.toFixed(opts.decimals || 0)}${opts.suffix || '%'}`; });
        },
        ...opts
      });
    },
    progressFill: (targets, opts = {}) => new Animation({ targets, scaleX: [0, 1], duration: 900, easing: 'easeOutCubic', ...opts }),
    circularGauge: (targets, opts = {}) => new Animation({ targets, strokeDashoffset: [126, 25], duration: 900, easing: 'easeOutCubic', ...opts }),
    audioEqualizer: (targets, opts = {}) => new Animation({ targets, scaleY: [0.2, 2.2, 0.7], stagger: 40, duration: 550, easing: 'spring', ...opts }),
    tickerMarquee: (targets, opts = {}) => new Animation({ targets, translateX: [0, -200], duration: 3500, loop: true, easing: 'linear', ...opts }),
    stepperFlow: (targets, opts = {}) => new Animation({ targets, scale: [0.5, 1.25, 1], stagger: 120, duration: 450, easing: 'spring', ...opts }),
    sparkline: (targets, opts = {}) => new Animation({ targets, strokeDashoffset: [120, 0], duration: 700, easing: 'easeOutQuad', ...opts }),
    donutChart: (targets, opts = {}) => new Animation({ targets, strokeDashoffset: [113, 28], duration: 750, easing: 'easeInOutCubic', ...opts }),
    telemetryPing: (targets, opts = {}) => new Animation({ targets, scale: [0.5, 1.8], opacity: [1, 0], duration: 800, loop: true, easing: 'easeOutQuad', ...opts }),
    skeletonShimmer: (targets, opts = {}) => new Animation({ targets, translateX: [-100, 100], duration: 1200, loop: true, easing: 'easeInOutQuad', ...opts }),

    modalDrop: (targets, opts = {}) => new Animation({ targets, translateY: [-80, 0], duration: 850, easing: 'easeOutBounce', ...opts }),
    sidebarFly: (targets, opts = {}) => new Animation({ targets, translateX: [80, 0], duration: 550, easing: 'spring', ...opts }),
    morphBlob: (targets, opts = {}) => new Animation({ targets, rotate: [0, 180, 360], scale: [0.85, 1.1, 1], duration: 1100, easing: 'easeInOutCubic', ...opts }),
    svgLogoDraw: (targets, opts = {}) => new Animation({ targets, strokeDashoffset: [120, 0], duration: 750, easing: 'easeInOutQuad', ...opts }),
    planetaryOrbit: (targets, opts = {}) => new Animation({ targets, rotate: [0, 360], duration: 2500, loop: true, easing: 'linear', ...opts }),
    techParticles: (targets, opts = {}) => new Animation({ targets, translateY: [-16, 16], stagger: 50, direction: 'alternate', loop: true, duration: 1200, easing: 'easeInOutQuad', ...opts }),
    tabSlider: (targets, opts = {}) => new Animation({ targets, translateX: [0, 75, 0], duration: 650, easing: 'spring', ...opts }),
    backdropUnmask: (targets, opts = {}) => new Animation({ targets, scale: [0.85, 1], opacity: [0.2, 1], duration: 400, easing: 'spring', ...opts }),
    cardStackRoll: (targets, opts = {}) => new Animation({ targets, scale: [1, 0.9, 1], opacity: [1, 0.5, 1], duration: 600, easing: 'easeInOutQuad', ...opts }),
    curtainWipe: (targets, opts = {}) => new Animation({ targets, scaleY: [1, 0, 1], duration: 700, easing: 'easeInOutQuad', ...opts }),

    gridRipple: (targets, opts = {}) => new Animation({
      targets,
      scale: [0.3, 1.35, 1],
      rotate: [-90, 0],
      stagger: Utils.stagger(opts.stagger || 45, { from: opts.from || 'center' }),
      duration: opts.duration || 650,
      easing: 'spring',
      ...opts
    }),
    fireflySwarm: (targets, opts = {}) => new Animation({
      targets,
      translateX: () => (Math.random() - 0.5) * (opts.rangeX || 160),
      translateY: () => (Math.random() - 0.5) * (opts.rangeY || 120),
      scale: [0.5, 1.4, 1],
      duration: opts.duration || 850,
      easing: 'spring',
      ...opts
    }),
    typewriterHuman: (targets, text, opts = {}) => {
      const els = Utils.toArray(targets);
      const str = text || (els[0] ? els[0].textContent : '');
      return els.map(el => {
        el.textContent = '';
        let i = 0;
        const tick = () => {
          if (i < str.length) {
            el.textContent += str[i++];
            const delay = Math.random() * (opts.variance || 60) + (opts.speed || 40);
            setTimeout(tick, delay);
          } else if (opts.onComplete) {
            opts.onComplete(el);
          }
        };
        tick();
      });
    },
    cursorMagnet: (target, container, opts = {}) => {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      const stage = typeof container === 'string' ? document.querySelector(container) : (container || el.parentElement);
      if (!el || !stage) return;
      const strength = opts.strength || 0.35;
      const onMove = e => {
        const rect = stage.getBoundingClientRect();
        const dx = (e.clientX - rect.left - rect.width / 2) * strength;
        const dy = (e.clientY - rect.top - rect.height / 2) * strength;
        new Animation({
          targets: el,
          translateX: dx,
          translateY: dy,
          rotateX: -dy * 0.4,
          rotateY: dx * 0.4,
          duration: 350,
          easing: 'spring'
        });
      };
      const onLeave = () => {
        new Animation({
          targets: el,
          translateX: 0,
          translateY: 0,
          rotateX: 0,
          rotateY: 0,
          duration: 600,
          easing: 'spring'
        });
      };
      stage.addEventListener('pointermove', onMove);
      stage.addEventListener('pointerleave', onLeave);
      return { destroy: () => { stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave); } };
    },
    chartDraw: (targets, opts = {}) => SVG.createDrawable(targets, { duration: opts.duration || 900, easing: 'easeInOutCubic', ...opts }),
    morphIcon: (targetPath, endPathSelector, opts = {}) => SVG.morphTo(targetPath, endPathSelector, opts),
    layeredSpin: (targets, opts = {}) => new Animation({
      targets,
      rotateX: [35, 0],
      rotateY: [-35, 0],
      rotateZ: [15, 0],
      scale: [0.8, 1],
      duration: opts.duration || 800,
      easing: 'spring',
      ...opts
    }),
    infiniteCarousel: (targets, opts = {}) => new Animation(Object.assign({
      targets,
      translateX: [0, -(opts.distance || 300)],
      duration: opts.duration || 4000,
      loop: true,
      easing: 'linear'
    }, opts)),
    skeletalIK: (targets, opts = {}) => new Animation(Object.assign({
      targets,
      rotate: [-18, 18, -12, 12, 0],
      stagger: opts.stagger || 60,
      duration: opts.duration || 900,
      easing: 'spring'
    }, opts)),
    starlightSwarm: (targets, opts = {}) => new Animation(Object.assign({
      targets,
      scale: [0.2, 1.2, 0.4],
      opacity: [0.2, 1, 0.2],
      stagger: Utils.stagger(opts.stagger || 25, { from: 'center' }),
      loop: true,
      duration: opts.duration || 1400,
      easing: 'easeInOutQuad'
    }, opts)),
    clockScrub: (targets, opts = {}) => new Animation(Object.assign({
      targets,
      rotate: [0, 360],
      duration: opts.duration || 12000,
      loop: true,
      easing: 'linear'
    }, opts))
  };

  const waapi = (targets, keyframes, options = {}) => {
    const els = Utils.toArray(targets);
    return els.map(el => {
      if (el && el.animate) {
        return el.animate(keyframes, Object.assign({ duration: 800, fill: 'both', easing: 'ease-out' }, options));
      }
      return null;
    });
  };

  const Adapters = {
    three: (threeObject, props, options = {}) => {
      return new Animation(Object.assign({}, {
        targets: threeObject,
        duration: options.duration || 1000,
        easing: options.easing || 'spring'
      }, props, options));
    },
    cssVar: (element, varName, values, options = {}) => {
      const el = typeof element === 'string' ? (typeof document !== 'undefined' ? document.querySelector(element) : null) : element;
      if (!el) return null;
      return new Animation(Object.assign({}, {
        targets: el,
        [varName]: values,
        duration: options.duration || 600,
        easing: options.easing || 'spring'
      }, options));
    }
  };

  return {
    version: '2.3.2',
    animate: config => new Animation(config),
    timeline: config => new Timeline(config),
    timer: config => new Timer(config),
    animatable,
    draggable,
    layout,
    scope,
    svg: SVG,
    text: Text,
    onScroll,
    scrollTrigger: onScroll,
    revealOnScroll,
    ScrollTrigger: ScrollTriggerInstance,
    waapi,
    adapters: Adapters,
    animateThree: Adapters.three,
    engine: GlobalEngine,
    easings: EASINGS,
    utils: Utils,
    stagger: Utils.stagger,
    recipes: RECIPES,
    presets: RECIPES,

    spring: (t, o) => RECIPES.letterSplit(t, o),
    shake: (t, o) => RECIPES.bellWiggle(t, o),
    flip: (t, o) => RECIPES.flip180(t, o),
    tilt: (t, o) => RECIPES.tilt3D(t, o),
    modal: (t, o) => RECIPES.modalDrop(t, o),
    draw: (t, o) => SVG.createDrawable(t, o),
    scramble: (t, text, o) => Text.scramble(t, text, o),
    morph: (p1, p2, o) => SVG.morphTo(p1, p2, o),
    magnet: (t, container, o) => RECIPES.cursorMagnet(t, container, o),
    gridRipple: (t, o) => RECIPES.gridRipple(t, o),
    swarm: (t, o) => RECIPES.fireflySwarm(t, o),
    typewriter: (t, text, o) => RECIPES.typewriterHuman(t, text, o)
  };
});

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    global = typeof globalThis !== 'undefined' ? globalThis : global || self;
    global.StudioMotion = factory();
    global.animate = global.StudioMotion.animate;
    global.timeline = global.StudioMotion.timeline;
    global.timer = global.StudioMotion.timer;
    global.onScroll = global.StudioMotion.onScroll;
    global.scrollTrigger = global.StudioMotion.scrollTrigger;
    global.draggable = global.StudioMotion.draggable;
    global.recipes = global.StudioMotion.recipes;
  }
})(this, function () {
  'use strict';

  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const lerp = (a, b, t) => a + (b - a) * t;
  const mapRange = (val, inMin, inMax, outMin, outMax) =>
    outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);
  const random = (min, max) => Math.random() * (max - min) + min;
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const stagger = (val, opts = {}) => {
    const from = opts.from || 0;
    const ease = typeof opts.easing === 'function' ? opts.easing : (t => t);
    const grid = opts.grid;
    const axis = opts.axis;

    return (index, total = 1) => {
      if (grid && Array.isArray(grid)) {
        const [cols, rows] = grid;
        const col = index % cols;
        const row = Math.floor(index / cols);
        let fromX = 0;
        let fromY = 0;

        if (from === 'center') {
          fromX = (cols - 1) / 2;
          fromY = (rows - 1) / 2;
        } else if (from === 'last') {
          fromX = cols - 1;
          fromY = rows - 1;
        } else if (Array.isArray(from)) {
          fromX = from[0];
          fromY = from[1];
        }

        let dist = 0;
        if (axis === 'x') dist = Math.abs(col - fromX);
        else if (axis === 'y') dist = Math.abs(row - fromY);
        else dist = Math.hypot(col - fromX, row - fromY);

        const maxDist = axis === 'x' ? Math.max(fromX, cols - 1 - fromX)
          : axis === 'y' ? Math.max(fromY, rows - 1 - fromY)
          : Math.hypot(Math.max(fromX, cols - 1 - fromX), Math.max(fromY, rows - 1 - fromY));

        const factor = maxDist > 0 ? dist / maxDist : 0;
        const baseVal = typeof val === 'function' ? val(index, total) : val;
        return ease(factor) * baseVal;
      }

      let factor = total > 1 ? index / (total - 1) : 0;
      if (from === 'center') factor = Math.abs(index - (total - 1) / 2) / ((total - 1) / 2 || 1);
      else if (from === 'last') factor = 1 - factor;
      else if (typeof from === 'number' && total > 1) factor = Math.abs(index - from) / Math.max(from, total - 1 - from);

      const baseVal = typeof val === 'function' ? val(index, total) : val * index;
      return ease(factor) * baseVal;
    };
  };

  const toArray = targets => {
    if (!targets) return [];
    if (typeof targets === 'string') {
      if (typeof document !== 'undefined') {
        return Array.from(document.querySelectorAll(targets));
      }
      return [];
    }
    if (typeof Element !== 'undefined' && (targets instanceof Element || targets instanceof SVGElement)) return [targets];
    if (typeof NodeList !== 'undefined' && NodeList.prototype.isPrototypeOf(targets)) return Array.from(targets);
    if (typeof HTMLCollection !== 'undefined' && HTMLCollection.prototype.isPrototypeOf(targets)) return Array.from(targets);
    if (Array.isArray(targets)) return Array.from(targets);
    return [targets];
  };

  const NAMED_COLORS = {
    transparent: [0, 0, 0, 0],
    black: [0, 0, 0, 1],
    white: [255, 255, 255, 1],
    red: [255, 0, 0, 1],
    green: [0, 128, 0, 1],
    blue: [0, 0, 255, 1],
    yellow: [255, 255, 0, 1],
    cyan: [0, 255, 255, 1],
    magenta: [255, 0, 255, 1],
    gray: [128, 128, 128, 1],
    grey: [128, 128, 128, 1],
    orange: [255, 165, 0, 1],
    purple: [128, 0, 128, 1]
  };

  function hslToRgb(h, s, l, a = 1) {
    h = (h % 360 + 360) % 360 / 360;
    s = clamp(s / 100, 0, 1);
    l = clamp(l / 100, 0, 1);

    if (s === 0) {
      const val = Math.round(l * 255);
      return [val, val, val, a];
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const hue2rgb = t => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    return [
      Math.round(hue2rgb(h + 1 / 3) * 255),
      Math.round(hue2rgb(h) * 255),
      Math.round(hue2rgb(h - 1 / 3) * 255),
      a
    ];
  }

  const parseColor = str => {
    if (typeof str !== 'string') return null;
    const lower = str.trim().toLowerCase();
    if (NAMED_COLORS[lower]) return [...NAMED_COLORS[lower]];

    if (lower.startsWith('#')) {
      let hex = lower.slice(1);
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('') + 'ff';
      } else if (hex.length === 4) {
        hex = hex.split('').map(c => c + c).join('');
      } else if (hex.length === 6) {
        hex += 'ff';
      }
      if (hex.length === 8) {
        const num = parseInt(hex, 16);
        return [
          (num >> 24) & 255,
          (num >> 16) & 255,
          (num >> 8) & 255,
          parseFloat(((num & 255) / 255).toFixed(3))
        ];
      }
    }

    const rgbMatch = lower.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
    if (rgbMatch) {
      return [
        parseFloat(rgbMatch[1]),
        parseFloat(rgbMatch[2]),
        parseFloat(rgbMatch[3]),
        rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1
      ];
    }

    const hslMatch = lower.match(/^hsla?\(\s*([\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)$/);
    if (hslMatch) {
      const h = parseFloat(hslMatch[1]);
      const s = parseFloat(hslMatch[2]);
      const l = parseFloat(hslMatch[3]);
      const a = hslMatch[4] !== undefined ? parseFloat(hslMatch[4]) : 1;
      return hslToRgb(h, s, l, a);
    }

    return null;
  };

  const calcRelativeValue = (current, expr) => {
    if (typeof expr !== 'string') return expr;
    const match = expr.match(/^([+\-*/]=)\s*(-?[\d.]+)(.*)$/);
    if (!match) return expr;

    const op = match[1];
    const delta = parseFloat(match[2]);
    const exprUnit = match[3] || '';

    const currStr = String(current);
    const currNum = parseFloat(currStr) || 0;
    const currUnit = currStr.replace(/[-+.\d\s]/g, '') || exprUnit;

    let result = currNum;
    if (op === '+=') result += delta;
    else if (op === '-=') result -= delta;
    else if (op === '*=') result *= delta;
    else if (op === '/=') result = delta !== 0 ? result / delta : result;

    return currUnit ? `${result}${currUnit}` : result;
  };

  const NUMBER_REGEX = /[-+]?(?:\d*\.?\d+(?:[eE][-+]?\d+)?)/g;

  const decomposeValue = val => {
    if (typeof val === 'number') {
      return { type: 'number', num: val, unit: '', isColor: false };
    }
    if (typeof val !== 'string') {
      return { type: 'number', num: parseFloat(val) || 0, unit: '', isColor: false };
    }

    const str = val.trim();
    const color = parseColor(str);
    if (color) {
      return { type: 'color', color, isColor: true };
    }

    const simpleMatch = str.match(/^([-+]?(?:\d*\.?\d+(?:[eE][-+]?\d+)?))\s*([a-zA-Z%]*)$/);
    if (simpleMatch) {
      return {
        type: 'simple',
        num: parseFloat(simpleMatch[1]) || 0,
        unit: simpleMatch[2] || '',
        isColor: false
      };
    }

    const numbers = [];
    const template = [];
    let lastIdx = 0;
    let match;

    NUMBER_REGEX.lastIndex = 0;
    while ((match = NUMBER_REGEX.exec(str)) !== null) {
      template.push(str.slice(lastIdx, match.index));
      numbers.push(parseFloat(match[0]));
      lastIdx = NUMBER_REGEX.lastIndex;
    }
    template.push(str.slice(lastIdx));

    return {
      type: 'complex',
      template,
      numbers,
      isColor: false
    };
  };

  const interpolateDecomposed = (from, to, progress, round = 0) => {
    if (to.type === 'color' || from.type === 'color') {
      const c1 = from.color || [0, 0, 0, 1];
      const c2 = to.color || [0, 0, 0, 1];
      const r = Math.round(lerp(c1[0], c2[0], progress));
      const g = Math.round(lerp(c1[1], c2[1], progress));
      const b = Math.round(lerp(c1[2], c2[2], progress));
      const a = parseFloat(lerp(c1[3], c2[3], progress).toFixed(3));
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    if (to.type === 'complex' && from.type === 'complex') {
      const tmpl = to.template.length >= from.template.length ? to.template : from.template;
      const count = Math.min(from.numbers.length, to.numbers.length);
      let res = '';
      for (let i = 0; i < tmpl.length; i++) {
        res += tmpl[i] || '';
        if (i < count) {
          let n = lerp(from.numbers[i], to.numbers[i], progress);
          if (round > 0) n = parseFloat(n.toFixed(round));
          res += n;
        } else if (i < to.numbers.length) {
          res += to.numbers[i];
        }
      }
      return res;
    }

    const fromNum = from.num !== undefined ? from.num : (from.numbers ? from.numbers[0] : 0);
    const toNum = to.num !== undefined ? to.num : (to.numbers ? to.numbers[0] : 0);
    const unit = to.unit !== undefined ? to.unit : (from.unit || '');
    let val = lerp(fromNum, toNum, progress);
    if (round > 0) val = parseFloat(val.toFixed(round));
    return unit ? `${val}${unit}` : val;
  };

  const easings = {
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
    }
  };

  class Engine {
    constructor() {
      this.animations = new Set();
      this.isTicking = false;
      this.tick = this.tick.bind(this);
    }
    add(anim) {
      this.animations.add(anim);
      if (!this.isTicking) {
        this.isTicking = true;
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(this.tick);
        }
      }
    }
    remove(anim) {
      this.animations.delete(anim);
      if (this.animations.size === 0) {
        this.isTicking = false;
      }
    }
    tick() {
      if (this.animations.size === 0) {
        this.isTicking = false;
        return;
      }
      const anims = Array.from(this.animations);
      for (let i = 0; i < anims.length; i++) {
        anims[i]._step();
      }
      if (this.animations.size > 0 && typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(this.tick);
      } else {
        this.isTicking = false;
      }
    }
  }

  const GlobalEngine = new Engine();

  const RESERVED_PROPS = new Set([
    'targets', 'duration', 'delay', 'endDelay', 'easing', 'loop',
    'direction', 'round', 'autoplay', 'keyframes', 'timeScale',
    'onBegin', 'onUpdate', 'onRender', 'onLoop', 'onComplete', 'stagger'
  ]);

  const TRANSFORM_PROPS = new Set([
    'translateX', 'translateY', 'translateZ',
    'rotate', 'rotateX', 'rotateY', 'rotateZ',
    'scale', 'scaleX', 'scaleY', 'scaleZ',
    'skew', 'skewX', 'skewY',
    'perspective'
  ]);

  function getEasingFunction(easing) {
    if (typeof easing === 'function') return easing;
    if (typeof easing === 'string') {
      if (easings[easing]) return easings[easing];
      const springMatch = easing.match(/^spring\(\s*([\d.]+)?\s*,?\s*([\d.]+)?\s*,?\s*([\d.]+)?\s*\)$/);
      if (springMatch) {
        const m = parseFloat(springMatch[1]) || 1;
        const k = parseFloat(springMatch[2]) || 100;
        const c = parseFloat(springMatch[3]) || 10;
        return t => easings.spring(t, m, k, c);
      }
    }
    return easings.spring;
  }

  class Animation {
    constructor(config = {}) {
      this.config = config;
      this.targets = toArray(config.targets);
      this.globalDuration = config.duration !== undefined ? config.duration : 1000;
      this.globalDelay = config.delay || 0;
      this.globalEndDelay = config.endDelay || 0;
      this.globalEasing = getEasingFunction(config.easing);
      this.loop = config.loop || false;
      this.direction = config.direction || 'normal';
      this.round = config.round || 0;
      this.keyframes = config.keyframes || null;
      this.timeScale = config.timeScale !== undefined ? config.timeScale : 1;

      this.onBegin = config.onBegin || null;
      this.onUpdate = config.onUpdate || null;
      this.onRender = config.onRender || null;
      this.onLoop = config.onLoop || null;
      this.onComplete = config.onComplete || null;

      this.currentTime = 0;
      this.progress = 0;
      this.isRunning = false;
      this.isReversed = this.direction === 'reverse';
      this.began = false;
      this.completed = false;
      this.lastStepTime = 0;

      this.tweens = [];
      this.duration = this.globalDuration;
      this.delay = 0;
      this.endDelay = this.globalEndDelay;

      this._initTweens(config);

      if (config.autoplay !== false) {
        this.play();
      }
    }

    _initTweens(config) {
      const totalTargets = this.targets.length;
      let maxEndTime = this.globalDuration;
      let minDelay = Infinity;

      this.targets.forEach((target, targetIndex) => {
        const targetDelay = typeof config.delay === 'function'
          ? config.delay(targetIndex, totalTargets)
          : (typeof config.stagger === 'function' ? config.stagger(targetIndex, totalTargets) : (this.globalDelay || 0));

        if (targetDelay < minDelay) minDelay = targetDelay;

        if (this.keyframes && Array.isArray(this.keyframes)) {
          const stepCount = this.keyframes.length;
          let runningTime = targetDelay;

          for (let i = 0; i < stepCount; i++) {
            const kf = this.keyframes[i];
            const prevKf = i === 0 ? {} : this.keyframes[i - 1];
            const kfDuration = kf.duration !== undefined ? kf.duration : (this.globalDuration / stepCount);
            const kfDelay = kf.delay || 0;
            const kfEndDelay = kf.endDelay || 0;
            const kfEasing = kf.easing ? getEasingFunction(kf.easing) : this.globalEasing;
            const startTime = runningTime + kfDelay;

            for (const prop in kf) {
              if (RESERVED_PROPS.has(prop)) continue;
              const fromRaw = prevKf[prop] !== undefined ? prevKf[prop] : this._getCurrentValue(target, prop);
              const toRaw = typeof kf[prop] === 'function' ? kf[prop](targetIndex, totalTargets) : kf[prop];

              this.tweens.push({
                target,
                prop,
                type: this._getPropertyType(target, prop),
                from: decomposeValue(fromRaw),
                to: decomposeValue(toRaw),
                startTime,
                duration: kfDuration,
                easing: kfEasing
              });
            }

            runningTime = startTime + kfDuration + kfEndDelay;
            if (runningTime > maxEndTime) maxEndTime = runningTime;
          }
          return;
        }

        for (const prop in config) {
          if (RESERVED_PROPS.has(prop)) continue;

          const val = config[prop];

          if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null && 'value' in val[0]) {
            let runningTime = targetDelay;

            for (let k = 0; k < val.length; k++) {
              const kf = val[k];
              const prevKf = k === 0 ? null : val[k - 1];
              const kfDuration = kf.duration !== undefined ? kf.duration : (this.globalDuration / val.length);
              const kfDelay = kf.delay || 0;
              const kfEndDelay = kf.endDelay || 0;
              const kfEasing = kf.easing ? getEasingFunction(kf.easing) : this.globalEasing;
              const startTime = runningTime + kfDelay;

              let fromRaw = prevKf ? prevKf.value : this._getCurrentValue(target, prop);
              let toRaw = typeof kf.value === 'function' ? kf.value(targetIndex, totalTargets) : kf.value;

              if (typeof toRaw === 'string' && /^[+\-*/]=/.test(toRaw)) {
                toRaw = calcRelativeValue(fromRaw, toRaw);
              }

              this.tweens.push({
                target,
                prop,
                type: this._getPropertyType(target, prop),
                from: decomposeValue(fromRaw),
                to: decomposeValue(toRaw),
                startTime,
                duration: kfDuration,
                easing: kfEasing
              });

              runningTime = startTime + kfDuration + kfEndDelay;
              if (runningTime > maxEndTime) maxEndTime = runningTime;
            }
            continue;
          }

          let fromVal, toVal;

          if (Array.isArray(val)) {
            if (val.length === 1) {
              fromVal = this._getCurrentValue(target, prop);
              toVal = val[0];
            } else if (val.length === 2) {
              fromVal = val[0];
              toVal = val[1];
            } else {
              const stepDur = this.globalDuration / (val.length - 1);
              for (let k = 0; k < val.length - 1; k++) {
                let f = val[k];
                let t = val[k + 1];
                if (typeof t === 'string' && /^[+\-*/]=/.test(t)) {
                  t = calcRelativeValue(f, t);
                }
                const st = targetDelay + k * stepDur;
                this.tweens.push({
                  target,
                  prop,
                  type: this._getPropertyType(target, prop),
                  from: decomposeValue(f),
                  to: decomposeValue(t),
                  startTime: st,
                  duration: stepDur,
                  easing: this.globalEasing
                });
                if (st + stepDur > maxEndTime) maxEndTime = st + stepDur;
              }
              continue;
            }
          } else if (typeof val === 'string' && /^[+\-*/]=/.test(val)) {
            fromVal = this._getCurrentValue(target, prop);
            toVal = calcRelativeValue(fromVal, val);
          } else if (typeof val === 'function') {
            fromVal = this._getCurrentValue(target, prop);
            toVal = val(targetIndex, totalTargets);
          } else {
            fromVal = this._getCurrentValue(target, prop);
            toVal = val;
          }

          const endTime = targetDelay + this.globalDuration;
          if (endTime > maxEndTime) maxEndTime = endTime;

          this.tweens.push({
            target,
            prop,
            type: this._getPropertyType(target, prop),
            from: decomposeValue(fromVal),
            to: decomposeValue(toVal),
            startTime: targetDelay,
            duration: this.globalDuration,
            easing: this.globalDuration === 0 ? (t => t) : this.globalEasing
          });
        }
      });

      this.duration = maxEndTime;
      this.delay = minDelay === Infinity ? 0 : minDelay;
    }

    _getPropertyType(target, prop) {
      if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
        if (prop.startsWith('--')) return 'cssVar';
        if (TRANSFORM_PROPS.has(prop)) return 'transform';
        if (prop in target.style) return 'css';
        if (target.hasAttribute && target.hasAttribute(prop)) return 'attribute';
      }
      if (typeof SVGElement !== 'undefined' && target instanceof SVGElement) {
        if (prop.startsWith('--')) return 'cssVar';
        if (TRANSFORM_PROPS.has(prop)) return 'transform';
        if (prop in target.style) return 'css';
        return 'svgAttribute';
      }
      return 'object';
    }

    _getCurrentValue(target, prop) {
      const type = this._getPropertyType(target, prop);
      if (type === 'transform') {
        target._studioTransforms = target._studioTransforms || {};
        if (target._studioTransforms[prop] !== undefined) return target._studioTransforms[prop];
        if (prop.startsWith('scale')) return 1;
        return 0;
      }
      if (type === 'cssVar') {
        if (typeof window !== 'undefined') {
          const val = getComputedStyle(target).getPropertyValue(prop).trim();
          return val || 0;
        }
        return 0;
      }
      if (type === 'css') {
        if (typeof window !== 'undefined') {
          const val = target.style[prop] || getComputedStyle(target)[prop];
          return val !== undefined ? val : 0;
        }
        return 0;
      }
      if (type === 'attribute' || type === 'svgAttribute') {
        return target.getAttribute(prop) || 0;
      }
      return target[prop] !== undefined ? target[prop] : 0;
    }

    play() {
      this.isRunning = true;
      this.completed = false;
      this.lastStepTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this._renderFrame(this.progress);
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
      this.progress = 0;
      this.began = false;
      this.completed = false;
      this.isReversed = this.direction === 'reverse';
      this.play();
      return this;
    }

    reverse() {
      this.isReversed = !this.isReversed;
      return this;
    }

    seek(progressRatio) {
      this.progress = clamp(progressRatio, 0, 1);
      this.currentTime = this.progress * (this.duration + this.endDelay);
      this._renderFrame(this.progress);
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

      const totalTime = this.duration + this.endDelay;
      this.currentTime += dt;

      let animProgress = totalTime > 0 ? clamp(this.currentTime / totalTime, 0, 1) : 1;
      if (this.isReversed) animProgress = 1 - animProgress;
      this.progress = animProgress;

      this._renderFrame(this.progress);

      if (this.onUpdate) this.onUpdate(this);

      if (this.currentTime >= totalTime) {
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
          this.currentTime = 0;
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

    _renderFrame(progressRatio) {
      const elapsed = progressRatio * (this.duration + this.endDelay);
      const transformMap = new Map();

      const propMap = new Map();
      for (let i = 0; i < this.tweens.length; i++) {
        const tw = this.tweens[i];
        let tMap = propMap.get(tw.target);
        if (!tMap) {
          tMap = new Map();
          propMap.set(tw.target, tMap);
        }
        let list = tMap.get(tw.prop);
        if (!list) {
          list = [];
          tMap.set(tw.prop, list);
        }
        list.push(tw);
      }

      propMap.forEach((props, target) => {
        props.forEach((list, prop) => {
          let activeTween = list[0];
          let p = 0;

          const last = list[list.length - 1];
          const first = list[0];

          if (elapsed >= last.startTime + last.duration) {
            activeTween = last;
            p = 1;
          } else if (elapsed <= first.startTime) {
            activeTween = first;
            p = 0;
          } else {
            for (let i = 0; i < list.length; i++) {
              const tw = list[i];
              const end = tw.startTime + tw.duration;
              if (elapsed >= tw.startTime && elapsed <= end) {
                activeTween = tw;
                p = tw.duration > 0 ? (elapsed - tw.startTime) / tw.duration : 1;
                break;
              } else if (i < list.length - 1 && elapsed > end && elapsed < list[i + 1].startTime) {
                activeTween = tw;
                p = 1;
                break;
              }
            }
          }

          const eased = activeTween.easing(p);
          const val = interpolateDecomposed(activeTween.from, activeTween.to, eased, this.round);

          if (activeTween.type === 'transform') {
            let transforms = transformMap.get(target);
            if (!transforms) {
              transforms = {};
              transformMap.set(target, transforms);
            }
            transforms[prop] = val;
          } else if (activeTween.type === 'css') {
            target.style[prop] = val;
          } else if (activeTween.type === 'cssVar') {
            target.style.setProperty(prop, String(val));
          } else if (activeTween.type === 'svgAttribute' || activeTween.type === 'attribute') {
            target.setAttribute(prop, String(val));
          } else {
            target[prop] = typeof val === 'string' ? parseFloat(val) || val : val;
          }
        });
      });

      transformMap.forEach((transforms, target) => {
        target._studioTransforms = Object.assign(target._studioTransforms || {}, transforms);
        const tf = target._studioTransforms;
        let str = '';

        if (tf.perspective !== undefined) str += `perspective(${tf.perspective}px) `;
        if (tf.translateX !== undefined || tf.translateY !== undefined || tf.translateZ !== undefined) {
          const x = tf.translateX !== undefined ? (typeof tf.translateX === 'number' ? `${tf.translateX}px` : tf.translateX) : '0px';
          const y = tf.translateY !== undefined ? (typeof tf.translateY === 'number' ? `${tf.translateY}px` : tf.translateY) : '0px';
          const z = tf.translateZ !== undefined ? (typeof tf.translateZ === 'number' ? `${tf.translateZ}px` : tf.translateZ) : '0px';
          str += `translate3d(${x}, ${y}, ${z}) `;
        }
        if (tf.rotateX !== undefined) str += `rotateX(${typeof tf.rotateX === 'number' ? `${tf.rotateX}deg` : tf.rotateX}) `;
        if (tf.rotateY !== undefined) str += `rotateY(${typeof tf.rotateY === 'number' ? `${tf.rotateY}deg` : tf.rotateY}) `;
        if (tf.rotateZ !== undefined) str += `rotateZ(${typeof tf.rotateZ === 'number' ? `${tf.rotateZ}deg` : tf.rotateZ}) `;
        if (tf.rotate !== undefined) str += `rotate(${typeof tf.rotate === 'number' ? `${tf.rotate}deg` : tf.rotate}) `;
        if (tf.scale !== undefined) {
          str += `scale(${tf.scale}) `;
        } else if (tf.scaleX !== undefined || tf.scaleY !== undefined || tf.scaleZ !== undefined) {
          str += `scale3d(${tf.scaleX !== undefined ? tf.scaleX : 1}, ${tf.scaleY !== undefined ? tf.scaleY : 1}, ${tf.scaleZ !== undefined ? tf.scaleZ : 1}) `;
        }
        if (tf.skewX !== undefined) str += `skewX(${typeof tf.skewX === 'number' ? `${tf.skewX}deg` : tf.skewX}) `;
        if (tf.skewY !== undefined) str += `skewY(${typeof tf.skewY === 'number' ? `${tf.skewY}deg` : tf.skewY}) `;

        target.style.transform = str.trim();
      });

      if (this.onRender) this.onRender(this);
    }
  }

  class Timeline {
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

  class Timer {
    constructor(config = {}) {
      this.duration = config.duration || 1000;
      this.loop = config.loop || false;
      this.onTick = config.onTick || null;
      this.onComplete = config.onComplete || null;
      this.currentTime = 0;
      this.progress = 0;
      this.isRunning = false;
      this.lastTime = 0;

      if (config.autoplay !== false) {
        this.play();
      }
    }
    play() {
      this.isRunning = true;
      this.lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      GlobalEngine.add(this);
      return this;
    }
    pause() {
      this.isRunning = false;
      GlobalEngine.remove(this);
      return this;
    }
    _step() {
      if (!this.isRunning) return;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const dt = now - this.lastTime;
      this.lastTime = now;
      this.currentTime += dt;
      this.progress = clamp(this.currentTime / this.duration, 0, 1);
      if (this.onTick) this.onTick(this);
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

  class ScrollTriggerInstance {
    constructor(config = {}) {
      this.target = typeof config.target === 'string' ? (typeof document !== 'undefined' ? document.querySelector(config.target) : null) : config.target;
      this.container = config.container ? (typeof config.container === 'string' ? document.querySelector(config.container) : config.container) : (typeof window !== 'undefined' ? window : null);
      this.axis = config.axis || 'y';
      this.debug = !!config.debug;
      this.repeat = config.repeat !== false;
      this.sync = config.sync || config.scrub || false;

      this.start = config.start || 'top 85%';
      this.end = config.end || 'bottom 15%';

      this.onEnter = config.onEnter || null;
      this.onLeave = config.onLeave || null;
      this.onEnterBack = config.onEnterBack || null;
      this.onLeaveBack = config.onLeaveBack || null;
      this.onUpdate = config.onUpdate || null;

      this.animation = null;
      if (config.animation) {
        const animCfg = Object.assign({}, config.animation, { targets: config.animation.targets || this.target, autoplay: false });
        this.animation = new Animation(animCfg);
      }

      this.isInView = false;
      this.progress = 0;
      this.direction = 1;
      this.lastScrollPos = 0;
      this.ticking = false;

      this._onScroll = this._onScroll.bind(this);
      this.init();
    }

    init() {
      if (!this.target || typeof window === 'undefined') return;
      window.addEventListener('scroll', this._onScroll, { passive: true });
      window.addEventListener('resize', this._onScroll, { passive: true });
      this._update();
    }

    _onScroll() {
      if (!this.ticking) {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => {
            this._update();
            this.ticking = false;
          });
          this.ticking = true;
        }
      }
    }

    _update() {
      if (!this.target || typeof window === 'undefined') return;
      const rect = this.target.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      this.direction = scrollY >= this.lastScrollPos ? 1 : -1;
      this.lastScrollPos = scrollY;

      const parseThreshold = (str, isTop) => {
        const parts = String(str).split(' ');
        const pct = parts[1] ? parseFloat(parts[1]) / 100 : (isTop ? 0.85 : 0.15);
        return vh * pct;
      };

      const startTrigger = parseThreshold(this.start, true);
      const endTrigger = parseThreshold(this.end, false);

      const totalDistance = (rect.height + (startTrigger - endTrigger)) || 1;
      const currentDistance = startTrigger - rect.top;
      const rawProgress = currentDistance / totalDistance;
      const p = clamp(rawProgress, 0, 1);
      this.progress = p;

      const currentlyInView = rect.top <= startTrigger && rect.bottom >= endTrigger;

      if (currentlyInView && !this.isInView) {
        this.isInView = true;
        if (this.direction === 1 && this.onEnter) this.onEnter(this);
        if (this.direction === -1 && this.onEnterBack) this.onEnterBack(this);
        if (!this.sync && this.animation) {
          this.animation.restart();
        }
      } else if (!currentlyInView && this.isInView) {
        this.isInView = false;
        if (this.direction === 1 && this.onLeave) this.onLeave(this);
        if (this.direction === -1 && this.onLeaveBack) this.onLeaveBack(this);
      }

      if (this.sync && this.animation) {
        this.animation.seek(p);
      }

      if (this.onUpdate) this.onUpdate(p, this);
    }

    destroy() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', this._onScroll);
        window.removeEventListener('resize', this._onScroll);
      }
    }
  }

  const onScroll = config => new ScrollTriggerInstance(config);

  const draggable = (target, opts = {}) => {
    const els = toArray(target);
    return els.map(el => {
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
        lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (opts.onDragStart) opts.onDragStart(curX, curY);
      };

      const onPointerMove = e => {
        if (!isDragging) return;
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const dt = now - lastTime || 16;
        const newX = e.clientX - startX;
        const newY = e.clientY - startY;

        velX = (newX - curX) / dt;
        velY = (newY - curY) / dt;
        curX = newX;
        curY = newY;
        lastTime = now;

        if (opts.bounds) {
          if (opts.bounds.minX !== undefined) curX = Math.max(opts.bounds.minX, curX);
          if (opts.bounds.maxX !== undefined) curX = Math.min(opts.bounds.maxX, curX);
          if (opts.bounds.minY !== undefined) curY = Math.max(opts.bounds.minY, curY);
          if (opts.bounds.maxY !== undefined) curY = Math.min(opts.bounds.maxY, curY);
        }

        el.style.transform = `translate3d(${curX}px, ${curY}px, 0px)`;
        if (opts.onDrag) opts.onDrag(curX, curY);
      };

      const onPointerUp = () => {
        if (!isDragging) return;
        isDragging = false;
        el.style.cursor = 'grab';

        if (opts.inertia) {
          const targetX = curX + velX * 120;
          const targetY = curY + velY * 120;
          let finalX = targetX;
          let finalY = targetY;

          if (opts.bounds) {
            if (opts.bounds.minX !== undefined) finalX = Math.max(opts.bounds.minX, finalX);
            if (opts.bounds.maxX !== undefined) finalX = Math.min(opts.bounds.maxX, finalX);
            if (opts.bounds.minY !== undefined) finalY = Math.max(opts.bounds.minY, finalY);
            if (opts.bounds.maxY !== undefined) finalY = Math.min(opts.bounds.maxY, finalY);
          }

          if (opts.snap) {
            finalX = Math.round(finalX / opts.snap) * opts.snap;
            finalY = Math.round(finalY / opts.snap) * opts.snap;
          }

          new Animation({
            targets: el,
            translateX: [curX, finalX],
            translateY: [curY, finalY],
            duration: 650,
            easing: 'spring',
            onComplete: () => {
              curX = finalX;
              curY = finalY;
              if (opts.onDragEnd) opts.onDragEnd(curX, curY);
            }
          });
        } else {
          if (opts.snap) {
            curX = Math.round(curX / opts.snap) * opts.snap;
            curY = Math.round(curY / opts.snap) * opts.snap;
            el.style.transform = `translate3d(${curX}px, ${curY}px, 0px)`;
          }
          if (opts.onDragEnd) opts.onDragEnd(curX, curY);
        }
      };

      if (typeof window !== 'undefined') {
        el.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
      }
    });
  };

  const layout = targets => {
    const els = toArray(targets);
    const firstRects = new Map();

    return {
      record: () => {
        els.forEach(el => {
          firstRects.set(el, el.getBoundingClientRect());
        });
      },
      play: (opts = {}) => {
        els.forEach(el => {
          const first = firstRects.get(el);
          if (!first) return;
          const last = el.getBoundingClientRect();

          const dx = first.left - last.left;
          const dy = first.top - last.top;
          const dw = first.width / (last.width || 1);
          const dh = first.height / (last.height || 1);

          new Animation(Object.assign({
            targets: el,
            translateX: [dx, 0],
            translateY: [dy, 0],
            scaleX: [dw, 1],
            scaleY: [dh, 1],
            duration: opts.duration || 600,
            easing: opts.easing || 'spring'
          }, opts));
        });
      }
    };
  };

  const scope = container => {
    const root = typeof container === 'string' ? (typeof document !== 'undefined' ? document.querySelector(container) : null) : container;
    const animations = [];

    return {
      add: anim => {
        animations.push(anim);
        return anim;
      },
      revert: () => {
        animations.forEach(a => {
          if (a.pause) a.pause();
        });
        animations.length = 0;
      },
      select: selector => root ? root.querySelectorAll(selector) : []
    };
  };

  const SVG = {
    createDrawable: (targets, opts = {}) => {
      const paths = toArray(targets);
      return paths.map(path => {
        const len = path.getTotalLength ? path.getTotalLength() : 300;
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        return new Animation(Object.assign({}, {
          targets: path,
          strokeDashoffset: [len, 0],
          duration: opts.duration || 1000,
          easing: opts.easing || 'easeInOutQuad'
        }, opts));
      });
    },

    createMotionPath: (target, pathSelector, opts = {}) => {
      const el = typeof target === 'string' ? (typeof document !== 'undefined' ? document.querySelector(target) : null) : target;
      const path = typeof pathSelector === 'string' ? (typeof document !== 'undefined' ? document.querySelector(pathSelector) : null) : pathSelector;
      if (!el || !path || !path.getTotalLength) return;

      const len = path.getTotalLength();
      return new Animation(Object.assign({}, {
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
        }
      }, opts));
    },

    morphTo: (targetPath, endPathSelector, opts = {}) => {
      const p1 = typeof targetPath === 'string' ? (typeof document !== 'undefined' ? document.querySelector(targetPath) : null) : targetPath;
      if (!p1) return;

      const samples = opts.precision || 60;
      let pathEl2 = null;
      if (typeof endPathSelector === 'string') {
        if (endPathSelector.startsWith('M') || endPathSelector.startsWith('m')) {
          const helper = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          helper.setAttribute('d', endPathSelector);
          pathEl2 = helper;
        } else {
          pathEl2 = document.querySelector(endPathSelector);
        }
      } else {
        pathEl2 = endPathSelector;
      }

      if (!p1.getTotalLength || !pathEl2 || !pathEl2.getTotalLength) return;

      const len1 = p1.getTotalLength();
      const len2 = pathEl2.getTotalLength();
      const pts1 = [];
      const pts2 = [];

      for (let i = 0; i <= samples; i++) {
        const pt1 = p1.getPointAtLength((i / samples) * len1);
        const pt2 = pathEl2.getPointAtLength((i / samples) * len2);
        pts1.push(`${i === 0 ? 'M' : 'L'} ${pt1.x.toFixed(2)} ${pt1.y.toFixed(2)}`);
        pts2.push(`${i === 0 ? 'M' : 'L'} ${pt2.x.toFixed(2)} ${pt2.y.toFixed(2)}`);
      }

      const d1 = pts1.join(' ') + ' Z';
      const d2 = pts2.join(' ') + ' Z';
      p1.setAttribute('d', d1);

      return new Animation(Object.assign({}, {
        targets: p1,
        d: [d1, d2],
        duration: opts.duration || 1000,
        easing: opts.easing || 'easeInOutCubic'
      }, opts));
    }
  };

  const Text = {
    splitChars: (target, wrapperClass = 'sm-char') => {
      const els = toArray(target);
      const allChars = [];
      els.forEach(el => {
        const text = el.textContent;
        el.innerHTML = '';
        text.split('').forEach(char => {
          const span = document.createElement('span');
          span.className = wrapperClass;
          span.textContent = char === ' ' ? '\u00A0' : char;
          span.style.display = 'inline-block';
          el.appendChild(span);
          allChars.push(span);
        });
      });
      return allChars;
    },

    splitWords: (target, wrapperClass = 'sm-word') => {
      const els = toArray(target);
      const allWords = [];
      els.forEach(el => {
        const text = el.textContent;
        el.innerHTML = '';
        text.split(' ').forEach((word, idx, arr) => {
          const span = document.createElement('span');
          span.className = wrapperClass;
          span.textContent = word;
          span.style.display = 'inline-block';
          el.appendChild(span);
          allWords.push(span);
          if (idx < arr.length - 1) {
            el.appendChild(document.createTextNode(' '));
          }
        });
      });
      return allWords;
    },

    scramble: (target, finalStr, opts = {}) => {
      const els = toArray(target);
      const chars = opts.charset || '!<>-_\\/[]{}—=+*^?#________';
      return els.map(el => {
        const targetText = finalStr !== undefined ? finalStr : el.textContent;
        return new Animation({
          targets: { progress: 0 },
          progress: 1,
          duration: opts.duration || 1200,
          easing: opts.easing || 'linear',
          onUpdate: anim => {
            const p = anim.targets[0].progress;
            const revealIdx = Math.floor(p * targetText.length);
            let out = '';
            for (let i = 0; i < targetText.length; i++) {
              if (i < revealIdx) {
                out += targetText[i];
              } else {
                out += chars[Math.floor(Math.random() * chars.length)];
              }
            }
            el.textContent = out;
          },
          onComplete: () => {
            el.textContent = targetText;
          }
        });
      });
    }
  };

  const recipes = {
    letterSplit: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [40, 0], opacity: [0, 1], stagger: 30, duration: 600, easing: 'spring' }, opts)),
    wordFloat: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [25, 0], scale: [0.92, 1], opacity: [0, 1], stagger: 80, duration: 700, easing: 'spring' }, opts)),
    blurUnmask: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.85, 1], opacity: [0, 1], filter: ['blur(12px)', 'blur(0px)'], duration: 650, easing: 'easeOutCubic' }, opts)),
    gradientWave: (targets, opts = {}) => new Animation(Object.assign({ targets, rotate: [-6, 0], scale: [0.95, 1], duration: 800, easing: 'spring' }, opts)),
    typewriterBlink: (targets, opts = {}) => new Animation(Object.assign({ targets, scaleX: [0, 1], duration: 900, easing: 'steps(20)' }, opts)),
    counterRoll: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [60, 0], opacity: [0, 1], duration: 550, easing: 'spring' }, opts)),
    perspectiveFold: (targets, opts = {}) => new Animation(Object.assign({ targets, rotateX: [70, 0], opacity: [0, 1], duration: 850, easing: 'spring' }, opts)),
    neonFlicker: (targets, opts = {}) => new Animation(Object.assign({ targets, opacity: [0.2, 1, 0.4, 1, 0.8, 1], duration: 400, easing: 'linear' }, opts)),
    skewGlitch: (targets, opts = {}) => new Animation(Object.assign({ targets, skewX: [-25, 20, -10, 0], translateX: [-10, 10, 0], duration: 350, easing: 'easeInOutQuad' }, opts)),
    waveStagger: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [-20, 0], stagger: 50, duration: 500, easing: 'spring' }, opts)),

    tilt3D: (targets, opts = {}) => new Animation(Object.assign({ targets, rotateX: [25, 0], rotateY: [-25, 0], scale: [0.9, 1], duration: 800, easing: 'spring' }, opts)),
    bentoGlow: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.96, 1], duration: 500, easing: 'spring' }, opts)),
    depthParallax: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [-30, 0], scale: [1.08, 1], duration: 750, easing: 'spring' }, opts)),
    glassmorphismFlip: (targets, opts = {}) => new Animation(Object.assign({ targets, rotateY: [180, 0], scale: [0.8, 1], duration: 900, easing: 'spring' }, opts)),
    cardElevate: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [-18, 0], scale: [0.95, 1], duration: 600, easing: 'spring' }, opts)),
    perspectiveFan: (targets, opts = {}) => new Animation(Object.assign({ targets, rotate: [-18, 0], translateX: [-30, 0], opacity: [0, 1], stagger: 70, duration: 650, easing: 'spring' }, opts)),
    flip180: (targets, opts = {}) => new Animation(Object.assign({ targets, rotateY: [0, 180, 0], duration: 1000, easing: 'spring' }, opts)),
    isometricPop: (targets, opts = {}) => new Animation(Object.assign({ targets, rotateX: [45, 0], rotateZ: [-25, 0], scale: [0.75, 1], duration: 800, easing: 'spring' }, opts)),
    magneticSpring: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [-35, 35, 0], translateY: [-15, 15, 0], duration: 750, easing: 'spring' }, opts)),
    cardUnfold: (targets, opts = {}) => new Animation(Object.assign({ targets, scaleY: [0, 1], opacity: [0, 1], duration: 600, easing: 'spring' }, opts)),

    buttonPop: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.82, 1.15, 1], duration: 400, easing: 'spring' }, opts)),
    magnetic: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [-25, 25, 0], translateY: [-12, 12, 0], duration: 600, easing: 'spring' }, opts)),
    bellWiggle: (targets, opts = {}) => new Animation(Object.assign({ targets, rotate: [-22, 22, -14, 14, -6, 6, 0], duration: 750, easing: 'easeInOutQuad' }, opts)),
    radarRings: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.4, 2.2], opacity: [1, 0], stagger: 200, duration: 1100, loop: true, easing: 'easeOutCubic' }, opts)),
    heartPop: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.6, 1.35, 1], duration: 450, easing: 'spring' }, opts)),
    checkDraw: (targets, opts = {}) => new Animation(Object.assign({ targets, strokeDashoffset: [40, 0], duration: 450, easing: 'easeOutCubic' }, opts)),
    toggleSwitch: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [0, 24, 0], duration: 600, easing: 'spring' }, opts)),
    fluidRipple: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0, 4], opacity: [0.6, 0], duration: 550, easing: 'easeOutQuad' }, opts)),
    accordionDrawer: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [-15, 0], opacity: [0, 1], duration: 450, easing: 'spring' }, opts)),
    statusDot: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.75, 1.3], opacity: [0.5, 1], direction: 'alternate', loop: true, duration: 900, easing: 'easeInOutQuad' }, opts)),

    countUp: (targets, endVal = 100, opts = {}) => {
      const obj = { val: 0 };
      const els = toArray(targets);
      return new Animation(Object.assign({
        targets: obj,
        val: endVal,
        round: opts.round || 1,
        duration: opts.duration || 1100,
        easing: opts.easing || 'easeOutCubic',
        onUpdate: () => {
          els.forEach(el => { el.textContent = `${obj.val.toFixed(opts.decimals || 0)}${opts.suffix || '%'}`; });
        }
      }, opts));
    },
    progressFill: (targets, opts = {}) => new Animation(Object.assign({ targets, scaleX: [0, 1], duration: 900, easing: 'easeOutCubic' }, opts)),
    circularGauge: (targets, opts = {}) => new Animation(Object.assign({ targets, strokeDashoffset: [126, 25], duration: 900, easing: 'easeOutCubic' }, opts)),
    audioEqualizer: (targets, opts = {}) => new Animation(Object.assign({ targets, scaleY: [0.2, 2.2, 0.7], stagger: 40, duration: 550, easing: 'spring' }, opts)),
    tickerMarquee: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [0, -200], duration: 3500, loop: true, easing: 'linear' }, opts)),
    stepperFlow: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.5, 1.25, 1], stagger: 120, duration: 450, easing: 'spring' }, opts)),
    sparkline: (targets, opts = {}) => new Animation(Object.assign({ targets, strokeDashoffset: [120, 0], duration: 700, easing: 'easeOutQuad' }, opts)),
    donutChart: (targets, opts = {}) => new Animation(Object.assign({ targets, strokeDashoffset: [113, 28], duration: 750, easing: 'easeInOutCubic' }, opts)),
    telemetryPing: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.5, 1.8], opacity: [1, 0], duration: 800, loop: true, easing: 'easeOutQuad' }, opts)),
    skeletonShimmer: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [-100, 100], duration: 1200, loop: true, easing: 'easeInOutQuad' }, opts)),

    modalDrop: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [-80, 0], duration: 850, easing: 'easeOutBounce' }, opts)),
    sidebarFly: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [80, 0], duration: 550, easing: 'spring' }, opts)),
    morphBlob: (targets, opts = {}) => new Animation(Object.assign({ targets, rotate: [0, 180, 360], scale: [0.85, 1.1, 1], duration: 1100, easing: 'easeInOutCubic' }, opts)),
    svgLogoDraw: (targets, opts = {}) => new Animation(Object.assign({ targets, strokeDashoffset: [120, 0], duration: 750, easing: 'easeInOutQuad' }, opts)),
    planetaryOrbit: (targets, opts = {}) => new Animation(Object.assign({ targets, rotate: [0, 360], duration: 2500, loop: true, easing: 'linear' }, opts)),
    techParticles: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [-16, 16], stagger: 50, direction: 'alternate', loop: true, duration: 1200, easing: 'easeInOutQuad' }, opts)),
    tabSlider: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [0, 75, 0], duration: 650, easing: 'spring' }, opts)),
    backdropUnmask: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.85, 1], opacity: [0.2, 1], duration: 400, easing: 'spring' }, opts)),
    cardStackRoll: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [1, 0.9, 1], opacity: [1, 0.5, 1], duration: 600, easing: 'easeInOutQuad' }, opts)),
    curtainWipe: (targets, opts = {}) => new Animation(Object.assign({ targets, scaleY: [1, 0, 1], duration: 700, easing: 'easeInOutQuad' }, opts)),

    gridRipple: (targets, opts = {}) => new Animation(Object.assign({
      targets,
      scale: [0.3, 1.35, 1],
      rotate: [-90, 0],
      stagger: stagger(opts.stagger || 45, { from: opts.from || 'center' }),
      duration: opts.duration || 650,
      easing: 'spring'
    }, opts)),
    fireflySwarm: (targets, opts = {}) => new Animation(Object.assign({
      targets,
      translateX: () => (Math.random() - 0.5) * (opts.rangeX || 160),
      translateY: () => (Math.random() - 0.5) * (opts.rangeY || 120),
      scale: [0.5, 1.4, 1],
      duration: opts.duration || 850,
      easing: 'spring'
    }, opts)),
    typewriterHuman: (targets, text, opts = {}) => {
      const els = toArray(targets);
      const str = text || (els[0] ? els[0].textContent : '');
      return els.map(el => {
        el.textContent = '';
        let i = 0;
        const tick = () => {
          if (i < str.length) {
            el.textContent += str[i++];
            setTimeout(tick, Math.random() * (opts.speedVariance || 40) + (opts.speed || 30));
          } else if (opts.onComplete) {
            opts.onComplete();
          }
        };
        tick();
      });
    },
    cursorMagnet: (target, triggerContainer, opts = {}) => {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      const container = typeof triggerContainer === 'string' ? document.querySelector(triggerContainer) : triggerContainer;
      if (!el || !container) return;

      const strength = opts.strength || 0.4;
      container.addEventListener('mousemove', e => {
        const rect = container.getBoundingClientRect();
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);

        new Animation({
          targets: el,
          translateX: relX * strength,
          translateY: relY * strength,
          duration: 350,
          easing: 'spring'
        });
      });

      container.addEventListener('mouseleave', () => {
        new Animation({
          targets: el,
          translateX: 0,
          translateY: 0,
          duration: 550,
          easing: 'spring'
        });
      });
    }
  };

  const waapi = (target, keyframes, options = {}) => {
    const els = toArray(target);
    return els.map(el => {
      if (el.animate) {
        return el.animate(keyframes, {
          duration: options.duration || 1000,
          iterations: options.loop ? Infinity : 1,
          easing: options.easing || 'ease-in-out',
          fill: options.fill || 'forwards'
        });
      }
      return null;
    });
  };

  const animateThree = (targets, config = {}, options = {}) => {
    const objs = Array.isArray(targets) ? targets : [targets];
    const animations = [];

    objs.forEach((obj, idx) => {
      if (!obj) return;
      const total = objs.length;
      const delay = typeof config.delay === 'function' ? config.delay(idx, total) : (typeof config.stagger === 'function' ? config.stagger(idx, total) : (config.delay || 0));

      if (config.position && obj.position) {
        if (typeof config.position === 'object') {
          const animProps = {};
          if (config.position.x !== undefined) animProps.x = config.position.x;
          if (config.position.y !== undefined) animProps.y = config.position.y;
          if (config.position.z !== undefined) animProps.z = config.position.z;
          animations.push(new Animation(Object.assign({}, config, options, {
            targets: obj.position,
            delay,
            ...animProps
          })));
        }
      }

      if (config.rotation && obj.rotation) {
        if (typeof config.rotation === 'object') {
          const animProps = {};
          ['x', 'y', 'z'].forEach(axis => {
            if (config.rotation[axis] !== undefined) {
              let val = config.rotation[axis];
              if (typeof val === 'string') {
                if (val.endsWith('deg')) val = (parseFloat(val) * Math.PI) / 180;
                else if (val.endsWith('turn')) val = parseFloat(val) * Math.PI * 2;
                else if (val.endsWith('rad')) val = parseFloat(val);
              }
              animProps[axis] = val;
            }
          });
          animations.push(new Animation(Object.assign({}, config, options, {
            targets: obj.rotation,
            delay,
            ...animProps
          })));
        }
      }

      if (config.scale !== undefined && obj.scale) {
        if (typeof config.scale === 'number' || Array.isArray(config.scale)) {
          animations.push(new Animation(Object.assign({}, config, options, {
            targets: obj.scale,
            delay,
            x: config.scale,
            y: config.scale,
            z: config.scale
          })));
        } else if (typeof config.scale === 'object') {
          animations.push(new Animation(Object.assign({}, config, options, {
            targets: obj.scale,
            delay,
            ...config.scale
          })));
        }
      }

      if (config.material && obj.material) {
        if (config.material.opacity !== undefined) {
          animations.push(new Animation(Object.assign({}, config, options, {
            targets: obj.material,
            delay,
            opacity: config.material.opacity
          })));
        }
        if (config.material.color && obj.material.color) {
          const colorArr = parseColor(config.material.color);
          if (colorArr) {
            const fromR = obj.material.color.r !== undefined ? obj.material.color.r : 1;
            const fromG = obj.material.color.g !== undefined ? obj.material.color.g : 1;
            const fromB = obj.material.color.b !== undefined ? obj.material.color.b : 1;
            animations.push(new Animation(Object.assign({}, config, options, {
              targets: { r: fromR, g: fromG, b: fromB },
              r: colorArr[0] / 255,
              g: colorArr[1] / 255,
              b: colorArr[2] / 255,
              delay,
              onUpdate: anim => {
                const cur = anim.targets[0];
                if (obj.material.color.setRGB) {
                  obj.material.color.setRGB(cur.r, cur.g, cur.b);
                } else {
                  obj.material.color.r = cur.r;
                  obj.material.color.g = cur.g;
                  obj.material.color.b = cur.b;
                }
              }
            })));
          }
        }
      }

      if (obj.isCamera || obj.fov !== undefined || obj.zoom !== undefined) {
        const camProps = {};
        if (config.fov !== undefined) camProps.fov = config.fov;
        if (config.zoom !== undefined) camProps.zoom = config.zoom;
        if (Object.keys(camProps).length > 0) {
          animations.push(new Animation(Object.assign({}, config, options, {
            targets: obj,
            delay,
            ...camProps,
            onUpdate: () => {
              if (obj.updateProjectionMatrix) obj.updateProjectionMatrix();
            }
          })));
        }
      }
    });

    return animations.length === 1 ? animations[0] : animations;
  };

  const animatable = (target, props = {}) => {
    const inst = {
      target,
      transforms: {},
      set(key, val) {
        this.transforms[key] = val;
        let str = '';
        for (const k in this.transforms) {
          str += `${k}(${this.transforms[k]}) `;
        }
        if (target.style) target.style.transform = str.trim();
        return this;
      }
    };
    return inst;
  };

  return {
    version: '2.3.3',
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
    ScrollTriggerInstance,
    waapi,
    adapters: { waapi, animateThree },
    animateThree,
    engine: GlobalEngine,
    easings,
    utils: {
      clamp,
      lerp,
      mapRange,
      random,
      randomInt,
      stagger,
      toArray,
      parseColor,
      calcRelativeValue,
      decomposeValue,
      interpolateDecomposed
    },
    stagger,
    recipes,
    presets: recipes,
    spring: (target, opts) => recipes.letterSplit(target, opts),
    shake: (target, opts) => recipes.bellWiggle(target, opts),
    flip: (target, opts) => recipes.flip180(target, opts),
    tilt: (target, opts) => recipes.tilt3D(target, opts),
    modal: (target, opts) => recipes.modalDrop(target, opts),
    draw: (target, opts) => SVG.createDrawable(target, opts),
    scramble: (target, endText, opts) => Text.scramble(target, endText, opts),
    morph: (path1, path2, opts) => SVG.morphTo(path1, path2, opts),
    magnet: (target, container, opts) => recipes.cursorMagnet(target, container, opts),
    gridRipple: (targets, opts) => recipes.gridRipple(targets, opts),
    swarm: (targets, opts) => recipes.fireflySwarm(targets, opts),
    typewriter: (target, endText, opts) => recipes.typewriterHuman(target, endText, opts)
  };
});

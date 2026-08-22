import { toArray, decomposeValue, interpolateDecomposed, calcRelativeValue, clamp } from '../core/utils.js';
import { easings } from '../easings/easings.js';
import { GlobalEngine } from '../engine/engine.js';

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

export class Animation {
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

    // Group tweens by target and prop to evaluate only the active keyframe track segment
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

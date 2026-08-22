
import { toArray, parseColor, clamp, lerp } from '../core/utils.js';
import { easings } from '../easings/easings.js';
import { GlobalEngine } from '../engine/engine.js';

export class Animation {
  constructor(config = {}) {
    this.targets = toArray(config.targets);
    this.duration = config.duration !== undefined ? config.duration : 1000;
    this.delay = config.delay || 0;
    this.endDelay = config.endDelay || 0;
    this.easing = typeof config.easing === 'function' ? config.easing : (easings[config.easing] || easings.spring);
    this.loop = config.loop || false;
    this.direction = config.direction || 'normal';
    this.round = config.round || 0;
    this.keyframes = config.keyframes || null;

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

    this.tweens = this._parseTweens(config);

    if (config.autoplay !== false) {
      this.play();
    }
  }

  _parseTweens(config) {
    const reserved = new Set([
      'targets', 'duration', 'delay', 'endDelay', 'easing', 'loop',
      'direction', 'round', 'autoplay', 'keyframes', 'onBegin',
      'onUpdate', 'onRender', 'onLoop', 'onComplete', 'stagger'
    ]);

    const tweens = [];
    const totalTargets = this.targets.length;

    this.targets.forEach((target, targetIndex) => {
      const targetDelay = typeof config.delay === 'function'
        ? config.delay(targetIndex, totalTargets)
        : (typeof config.stagger === 'function' ? config.stagger(targetIndex, totalTargets) : (config.delay || 0));

      if (this.keyframes && Array.isArray(this.keyframes)) {
        const stepCount = this.keyframes.length;
        const stepDuration = this.duration / stepCount;

        for (let i = 0; i < stepCount; i++) {
          const kf = this.keyframes[i];
          const prevKf = i === 0 ? {} : this.keyframes[i - 1];

          for (const prop in kf) {
            if (reserved.has(prop)) continue;
            const fromVal = prevKf[prop] !== undefined ? prevKf[prop] : this._getCurrentValue(target, prop);
            const toVal = kf[prop];

            tweens.push({
              target,
              prop,
              type: this._getPropertyType(target, prop),
              from: this._decomposeValue(fromVal),
              to: this._decomposeValue(toVal),
              startTime: targetDelay + i * stepDuration,
              duration: stepDuration,
              easing: kf.easing ? (typeof kf.easing === 'function' ? kf.easing : (easings[kf.easing] || this.easing)) : this.easing
            });
          }
        }
        return;
      }

      for (const prop in config) {
        if (reserved.has(prop)) continue;

        let fromVal, toVal;
        const val = config[prop];

        if (Array.isArray(val)) {
          if (val.length === 1) {
            fromVal = this._getCurrentValue(target, prop);
            toVal = val[0];
          } else if (val.length === 2) {
            fromVal = val[0];
            toVal = val[1];
          } else {

            const stepDur = this.duration / (val.length - 1);
            for (let k = 0; k < val.length - 1; k++) {
              tweens.push({
                target,
                prop,
                type: this._getPropertyType(target, prop),
                from: this._decomposeValue(val[k]),
                to: this._decomposeValue(val[k + 1]),
                startTime: targetDelay + k * stepDur,
                duration: stepDur,
                easing: this.easing
              });
            }
            continue;
          }
        } else if (typeof val === 'string' && (val.startsWith('+=') || val.startsWith('-=') || val.startsWith('*='))) {
          fromVal = this._getCurrentValue(target, prop);
          toVal = this._calcRelativeValue(fromVal, val);
        } else if (typeof val === 'function') {
          fromVal = this._getCurrentValue(target, prop);
          toVal = val(targetIndex, totalTargets);
        } else {
          fromVal = this._getCurrentValue(target, prop);
          toVal = val;
        }

        tweens.push({
          target,
          prop,
          type: this._getPropertyType(target, prop),
          from: this._decomposeValue(fromVal),
          to: this._decomposeValue(toVal),
          startTime: targetDelay,
          duration: this.duration,
          easing: this.easing
        });
      }
    });

    return tweens;
  }

  _getPropertyType(target, prop) {
    if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
      if (prop.startsWith('--')) return 'cssVar';
      const transforms = new Set(['translateX', 'translateY', 'translateZ', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'scale', 'scaleX', 'scaleY', 'scaleZ', 'skewX', 'skewY', 'perspective']);
      if (transforms.has(prop)) return 'transform';
      if (prop in target.style) return 'css';
      if (target.hasAttribute && target.hasAttribute(prop)) return 'attribute';
    }
    if (typeof SVGElement !== 'undefined' && target instanceof SVGElement) {
      if (prop.startsWith('--')) return 'cssVar';
      const transforms = new Set(['translateX', 'translateY', 'rotate', 'scale', 'scaleX', 'scaleY']);
      if (transforms.has(prop)) return 'transform';
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

  _calcRelativeValue(current, expr) {
    const currNum = parseFloat(current) || 0;
    const unit = String(current).replace(/[\d.-]/g, '') || String(expr).replace(/[+=*\s\d.-]/g, '');
    const op = expr.slice(0, 2);
    const val = parseFloat(expr.slice(2));

    let result = currNum;
    if (op === '+=') result += val;
    else if (op === '-=') result -= val;
    else if (op === '*=') result *= val;

    return unit ? `${result}${unit}` : result;
  }

  _decomposeValue(val) {
    if (typeof val === 'number') return { num: val, unit: '', isColor: false };
    const color = parseColor(val);
    if (color) return { color, isColor: true };
    const str = String(val).trim();
    const num = parseFloat(str) || 0;
    const unit = str.replace(/[\d.-]/g, '');
    return { num, unit, isColor: false };
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
    this.currentTime = this.progress * (this.duration + this.delay + this.endDelay);
    this._renderFrame(this.progress);
    return this;
  }

  _step() {
    if (!this.isRunning) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = Math.min(64, Math.max(0, now - (this.lastStepTime || now)));
    this.lastStepTime = now;

    if (!this.began) {
      this.began = true;
      if (this.onBegin) this.onBegin(this);
    }

    const totalTime = this.duration + this.delay + this.endDelay;
    this.currentTime += dt;
    this.progress = clamp(this.currentTime / (totalTime || 1), 0, 1);

    const actualProgress = this.isReversed ? 1 - this.progress : this.progress;
    this._renderFrame(actualProgress);

    if (this.onUpdate) this.onUpdate(this);

    if (this.currentTime >= totalTime) {
      if (this.loop) {
        this.currentTime = 0;
        this.lastStepTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (this.direction === 'alternate') {
          this.isReversed = !this.isReversed;
        }
        if (this.onLoop) this.onLoop(this);
      } else {
        this.completed = true;
        this.pause();
        if (this.onComplete) this.onComplete(this);
      }
    }
  }

  _renderFrame(globalProgress) {
    const transformMap = new Map();

    for (let i = 0; i < this.tweens.length; i++) {
      const tw = this.tweens[i];
      const elapsed = this.currentTime - tw.startTime;
      let p = clamp(elapsed / (tw.duration || 1), 0, 1);
      const easedProgress = tw.easing(p);

      if (tw.from.isColor && tw.to.isColor) {
        const c1 = tw.from.color;
        const c2 = tw.to.color;
        const r = Math.round(lerp(c1[0], c2[0], easedProgress));
        const g = Math.round(lerp(c1[1], c2[1], easedProgress));
        const b = Math.round(lerp(c1[2], c2[2], easedProgress));
        const a = lerp(c1[3], c2[3], easedProgress);
        const finalColor = `rgba(${r}, ${g}, ${b}, ${a})`;

        if (tw.type === 'css') tw.target.style[tw.prop] = finalColor;
        else if (tw.type === 'cssVar') tw.target.style.setProperty(tw.prop, finalColor);
        else if (tw.type === 'object') tw.target[tw.prop] = finalColor;
        continue;
      }

      const fromNum = tw.from.num;
      const toNum = tw.to.num;
      let currentVal = lerp(fromNum, toNum, easedProgress);

      if (this.round) {
        currentVal = Math.round(currentVal * this.round) / this.round;
      }

      const unit = tw.to.unit || tw.from.unit || '';

      if (tw.type === 'transform') {
        if (!transformMap.has(tw.target)) transformMap.set(tw.target, {});
        transformMap.get(tw.target)[tw.prop] = unit ? `${currentVal}${unit}` : currentVal;
      } else if (tw.type === 'css') {
        tw.target.style[tw.prop] = unit ? `${currentVal}${unit}` : currentVal;
      } else if (tw.type === 'cssVar') {
        tw.target.style.setProperty(tw.prop, unit ? `${currentVal}${unit}` : currentVal);
      } else if (tw.type === 'attribute' || tw.type === 'svgAttribute') {
        tw.target.setAttribute(tw.prop, unit ? `${currentVal}${unit}` : currentVal);
      } else if (tw.type === 'object') {
        tw.target[tw.prop] = currentVal;
      }
    }

    transformMap.forEach((transforms, target) => {
      target._studioTransforms = Object.assign(target._studioTransforms || {}, transforms);
      const tf = target._studioTransforms;

      let str = '';
      if (tf.perspective) str += `perspective(${tf.perspective}) `;
      if (tf.translateX || tf.translateY || tf.translateZ) {
        str += `translate3d(${tf.translateX || '0px'}, ${tf.translateY || '0px'}, ${tf.translateZ || '0px'}) `;
      }
      if (tf.rotateX) str += `rotateX(${tf.rotateX}${typeof tf.rotateX === 'number' ? 'deg' : ''}) `;
      if (tf.rotateY) str += `rotateY(${tf.rotateY}${typeof tf.rotateY === 'number' ? 'deg' : ''}) `;
      if (tf.rotateZ || tf.rotate) {
        const r = tf.rotateZ || tf.rotate;
        str += `rotate(${r}${typeof r === 'number' ? 'deg' : ''}) `;
      }
      if (tf.scale || tf.scaleX || tf.scaleY) {
        const sx = tf.scaleX !== undefined ? tf.scaleX : (tf.scale !== undefined ? tf.scale : 1);
        const sy = tf.scaleY !== undefined ? tf.scaleY : (tf.scale !== undefined ? tf.scale : 1);
        str += `scale(${sx}, ${sy}) `;
      }
      if (tf.skewX) str += `skewX(${tf.skewX}${typeof tf.skewX === 'number' ? 'deg' : ''}) `;
      if (tf.skewY) str += `skewY(${tf.skewY}${typeof tf.skewY === 'number' ? 'deg' : ''}) `;

      target.style.transform = str.trim();
    });

    if (this.onRender) this.onRender(this);
  }
}


import { toArray } from '../core/utils.js';
import { Animation } from '../animation/animation.js';

export const waapi = (targets, keyframes, options = {}) => {
  const els = toArray(targets);
  return els.map(el => {
    if (el.animate) {
      return el.animate(keyframes, Object.assign({ duration: 800, fill: 'both', easing: 'ease-out' }, options));
    }
    return null;
  });
};

export const adapters = {
  three: (threeObject, props, options = {}) => {
    return new Animation(Object.assign({}, {
      targets: threeObject,
      duration: options.duration || 1000,
      easing: options.easing || 'spring'
    }, props, options));
  },

  cssVar: (element, varName, values, options = {}) => {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return null;
    return new Animation(Object.assign({}, {
      targets: el,
      [varName]: values,
      duration: options.duration || 600,
      easing: options.easing || 'spring'
    }, options));
  }
};

export const animateThree = adapters.three;

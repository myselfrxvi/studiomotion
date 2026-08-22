
import { Animation } from '../animation/animation.js';
import { Timeline } from '../timeline/timeline.js';

export function scope(rootElement, scopeCallback) {
  const root = typeof rootElement === 'string' ? document.querySelector(rootElement) : rootElement;
  const scopedAnimations = [];

  const scopedStudio = {
    animate: cfg => {
      if (typeof cfg.targets === 'string' && root) {
        cfg.targets = Array.from(root.querySelectorAll(cfg.targets));
      }
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

export function animatable(targetObj, defaultOpts = {}) {
  return new Proxy(targetObj, {
    set(target, prop, value) {
      if (typeof value === 'number' && typeof target[prop] === 'number') {
        new Animation(Object.assign({}, {
          targets: target,
          [prop]: [target[prop], value],
          duration: defaultOpts.duration || 600,
          easing: defaultOpts.easing || 'spring'
        }, defaultOpts));
      } else {
        target[prop] = value;
      }
      return true;
    }
  });
}

import { toArray, parseColor } from '../core/utils.js';
import { Animation } from '../animation/animation.js';

export const waapi = (targets, keyframes, options = {}) => {
  const els = toArray(targets);
  return els.map(el => {
    if (el && el.animate) {
      return el.animate(keyframes, Object.assign({ duration: 800, fill: 'both', easing: 'ease-out' }, options));
    }
    return null;
  });
};

export const animateThree = (targets, config = {}, options = {}) => {
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

export const adapters = {
  three: animateThree,
  waapi,
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

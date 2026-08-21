/**
 * StudioMotion.js - SVG Superpowers (createDrawable, createMotionPath, morphTo)
 */
import { toArray } from '../core/utils.js';
import { Animation } from '../animation/animation.js';

export const svg = {
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
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    const path = typeof pathSelector === 'string' ? document.querySelector(pathSelector) : pathSelector;
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

    return new Animation(Object.assign({}, {
      targets: p1,
      duration: opts.duration || 1000,
      easing: opts.easing || 'easeInOutCubic',
      onUpdate: anim => {
        const d = pts1.map((p, i) => {
          const [, x1, y1] = pts1[i].split(' ');
          const [, x2, y2] = pts2[i].split(' ');
          const curX = parseFloat(x1) + (parseFloat(x2) - parseFloat(x1)) * anim.progress;
          const curY = parseFloat(y1) + (parseFloat(y2) - parseFloat(y1)) * anim.progress;
          return `${i === 0 ? 'M' : 'L'} ${curX.toFixed(2)} ${curY.toFixed(2)}`;
        }).join(' ') + ' Z';
        p1.setAttribute('d', d);
      }
    }, opts));
  }
};

import { toArray } from '../core/utils.js';
import { Animation } from '../animation/animation.js';

let helperSvgDoc = null;
let helperSvgPath = null;

function getHelperPath(d) {
  if (typeof document === 'undefined') return null;
  if (!helperSvgPath) {
    helperSvgDoc = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    helperSvgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    helperSvgDoc.appendChild(helperSvgPath);
    helperSvgDoc.style.position = 'absolute';
    helperSvgDoc.style.width = '0px';
    helperSvgDoc.style.height = '0px';
    helperSvgDoc.style.visibility = 'hidden';
    document.body?.appendChild(helperSvgDoc);
  }
  helperSvgPath.setAttribute('d', d);
  return helperSvgPath;
}

export function samplePath(dOrElement, sampleCount = 60) {
  let pathEl = null;
  if (typeof dOrElement === 'string') {
    const trimmed = dOrElement.trim();
    if (trimmed.startsWith('<path') || trimmed.startsWith('M') || trimmed.startsWith('m') || /[a-z]/i.test(trimmed)) {
      if (trimmed.startsWith('<path')) {
        const match = trimmed.match(/d="([^"]+)"/);
        pathEl = getHelperPath(match ? match[1] : trimmed);
      } else {
        pathEl = getHelperPath(trimmed);
      }
    } else if (typeof document !== 'undefined') {
      pathEl = document.querySelector(dOrElement);
    }
  } else if (dOrElement && dOrElement.getTotalLength) {
    pathEl = dOrElement;
  }

  if (!pathEl || !pathEl.getTotalLength) {
    return null;
  }

  const len = pathEl.getTotalLength();
  const points = [];
  const count = Math.max(10, sampleCount);

  for (let i = 0; i <= count; i++) {
    const pt = pathEl.getPointAtLength((i / count) * len);
    points.push({ x: pt.x, y: pt.y });
  }

  return { length: len, points };
}

export function createMorphablePaths(pathA, pathB, samples = 60) {
  const sA = samplePath(pathA, samples);
  const sB = samplePath(pathB, samples);
  if (!sA || !sB) return null;

  const count = Math.max(sA.points.length, sB.points.length);
  const ptsA = sA.points;
  const ptsB = sB.points;

  const strA = ptsA.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
  const strB = ptsB.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';

  return { pathA: strA, pathB: strB, count };
}

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

    const morphed = createMorphablePaths(p1, endPathSelector, opts.precision || 60);
    if (!morphed) return;

    p1.setAttribute('d', morphed.pathA);

    return new Animation(Object.assign({}, {
      targets: p1,
      d: [morphed.pathA, morphed.pathB],
      duration: opts.duration || 1000,
      easing: opts.easing || 'easeInOutCubic'
    }, opts));
  }
};


import { Animation } from '../animation/animation.js';

export function layout(container, mutationCallback, opts = {}) {
  const parent = typeof container === 'string' ? document.querySelector(container) : container;
  if (!parent) return;

  const children = Array.from(parent.children);
  const firstRects = new Map();
  children.forEach(child => firstRects.set(child, child.getBoundingClientRect()));

  if (typeof mutationCallback === 'function') mutationCallback();

  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      children.forEach(child => {
        const first = firstRects.get(child);
        const last = child.getBoundingClientRect();
        if (!first) return;

        const dx = first.left - last.left;
        const dy = first.top - last.top;
        const dw = first.width / (last.width || 1);
        const dh = first.height / (last.height || 1);

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
}

/**
 * StudioMotion.js - Physics-Based Draggable Module with Inertia
 */
import { toArray, clamp } from '../core/utils.js';
import { Animation } from '../animation/animation.js';

export function draggable(target, opts = {}) {
  const els = toArray(target);
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
          if (opts.bounds.minX !== undefined) finalX = clamp(finalX, opts.bounds.minX, opts.bounds.maxX || Infinity);
          if (opts.bounds.minY !== undefined) finalY = clamp(finalY, opts.bounds.minY, opts.bounds.maxY || Infinity);
        }

        if (opts.snap) {
          finalX = Math.round(finalX / opts.snap) * opts.snap;
          finalY = Math.round(finalY / opts.snap) * opts.snap;
        }

        new Animation({
          targets: el,
          translateX: finalX,
          translateY: finalY,
          duration: 600,
          easing: 'spring',
          onComplete: () => {
            curX = finalX;
            curY = finalY;
            if (opts.onDragEnd) opts.onDragEnd(curX, curY);
          }
        });
      } else {
        if (opts.onDragEnd) opts.onDragEnd(curX, curY);
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }
  });
}

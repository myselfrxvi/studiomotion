/**
 * StudioMotion.js - Kinetic Typography (splitChars, splitWords, scramble)
 */
import { toArray } from '../core/utils.js';
import { Animation } from '../animation/animation.js';

export const text = {
  splitChars: (targets, className = 'char') => {
    const els = toArray(targets);
    els.forEach(el => {
      const textContent = el.textContent;
      el.innerHTML = textContent
        .split('')
        .map(c => `<span class="${className}" style="display:inline-block; will-change:transform,opacity;">${c === ' ' ? '&nbsp;' : c}</span>`)
        .join('');
    });
    return els.map(el => Array.from(el.querySelectorAll(`.${className}`))).flat();
  },

  splitWords: (targets, className = 'word') => {
    const els = toArray(targets);
    els.forEach(el => {
      const textContent = el.textContent;
      el.innerHTML = textContent
        .split(' ')
        .map(w => `<span class="${className}" style="display:inline-block; margin-right:0.25em; will-change:transform,opacity;">${w}</span>`)
        .join('');
    });
    return els.map(el => Array.from(el.querySelectorAll(`.${className}`))).flat();
  },

  scramble: (targets, endText, opts = {}) => {
    const els = toArray(targets);
    const chars = opts.chars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}[]:;';
    return els.map(el => {
      const targetStr = endText || el.textContent;
      const len = targetStr.length;
      return new Animation(Object.assign({}, {
        targets: el,
        duration: opts.duration || 1200,
        easing: opts.easing || 'easeOutCubic',
        onUpdate: anim => {
          const revealedCount = Math.floor(anim.progress * len);
          let out = '';
          for (let i = 0; i < len; i++) {
            if (i < revealedCount || targetStr[i] === ' ') {
              out += targetStr[i];
            } else {
              out += chars[Math.floor(Math.random() * chars.length)];
            }
          }
          el.textContent = out;
        }
      }, opts));
    });
  }
};

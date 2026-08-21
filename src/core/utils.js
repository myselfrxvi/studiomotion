/**
 * StudioMotion.js - Core Math & Data Utilities
 */

export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

export const lerp = (a, b, t) => a + (b - a) * t;

export const mapRange = (val, inMin, inMax, outMin, outMax) =>
  outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);

export const random = (min, max) => Math.random() * (max - min) + min;

export const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const stagger = (val, opts = {}) => {
  const from = opts.from || 0;
  const ease = typeof opts.easing === 'function' ? opts.easing : (t => t);
  return (index, total = 1) => {
    let factor = total > 1 ? index / (total - 1) : 0;
    if (from === 'center') factor = Math.abs(index - (total - 1) / 2) / ((total - 1) / 2 || 1);
    else if (from === 'last') factor = 1 - factor;
    return ease(factor) * (typeof val === 'function' ? val(index, total) : val * index);
  };
};

export const toArray = targets => {
  if (!targets) return [];
  if (typeof targets === 'string') return Array.from(document.querySelectorAll(targets));
  if (typeof Element !== 'undefined' && (targets instanceof Element || targets instanceof SVGElement)) return [targets];
  if (typeof NodeList !== 'undefined' && NodeList.prototype.isPrototypeOf(targets)) return Array.from(targets);
  if (typeof HTMLCollection !== 'undefined' && HTMLCollection.prototype.isPrototypeOf(targets)) return Array.from(targets);
  if (Array.isArray(targets)) return Array.from(targets);
  return [targets];
};

export const parseColor = str => {
  if (typeof str !== 'string') return null;
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return [ (num >> 16) & 255, (num >> 8) & 255, num & 255, 1 ];
  }
  const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return [ parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), match[4] !== undefined ? parseFloat(match[4]) : 1 ];
  }
  return null;
};

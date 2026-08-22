export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

export const lerp = (a, b, t) => a + (b - a) * t;

export const mapRange = (val, inMin, inMax, outMin, outMax) =>
  outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);

export const random = (min, max) => Math.random() * (max - min) + min;

export const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const stagger = (val, opts = {}) => {
  const from = opts.from || 0;
  const ease = typeof opts.easing === 'function' ? opts.easing : (t => t);
  const grid = opts.grid;
  const axis = opts.axis;

  return (index, total = 1) => {
    if (grid && Array.isArray(grid)) {
      const [cols, rows] = grid;
      const col = index % cols;
      const row = Math.floor(index / cols);
      let fromX = 0;
      let fromY = 0;

      if (from === 'center') {
        fromX = (cols - 1) / 2;
        fromY = (rows - 1) / 2;
      } else if (from === 'last') {
        fromX = cols - 1;
        fromY = rows - 1;
      } else if (Array.isArray(from)) {
        fromX = from[0];
        fromY = from[1];
      }

      let dist = 0;
      if (axis === 'x') dist = Math.abs(col - fromX);
      else if (axis === 'y') dist = Math.abs(row - fromY);
      else dist = Math.hypot(col - fromX, row - fromY);

      const maxDist = axis === 'x' ? Math.max(fromX, cols - 1 - fromX)
        : axis === 'y' ? Math.max(fromY, rows - 1 - fromY)
        : Math.hypot(Math.max(fromX, cols - 1 - fromX), Math.max(fromY, rows - 1 - fromY));

      const factor = maxDist > 0 ? dist / maxDist : 0;
      const baseVal = typeof val === 'function' ? val(index, total) : val;
      return ease(factor) * baseVal;
    }

    let factor = total > 1 ? index / (total - 1) : 0;
    if (from === 'center') factor = Math.abs(index - (total - 1) / 2) / ((total - 1) / 2 || 1);
    else if (from === 'last') factor = 1 - factor;
    else if (typeof from === 'number' && total > 1) factor = Math.abs(index - from) / Math.max(from, total - 1 - from);

    const baseVal = typeof val === 'function' ? val(index, total) : val * index;
    return ease(factor) * baseVal;
  };
};

export const toArray = targets => {
  if (!targets) return [];
  if (typeof targets === 'string') {
    if (typeof document !== 'undefined') {
      return Array.from(document.querySelectorAll(targets));
    }
    return [];
  }
  if (typeof Element !== 'undefined' && (targets instanceof Element || targets instanceof SVGElement)) return [targets];
  if (typeof NodeList !== 'undefined' && NodeList.prototype.isPrototypeOf(targets)) return Array.from(targets);
  if (typeof HTMLCollection !== 'undefined' && HTMLCollection.prototype.isPrototypeOf(targets)) return Array.from(targets);
  if (Array.isArray(targets)) return Array.from(targets);
  return [targets];
};

const NAMED_COLORS = {
  transparent: [0, 0, 0, 0],
  black: [0, 0, 0, 1],
  white: [255, 255, 255, 1],
  red: [255, 0, 0, 1],
  green: [0, 128, 0, 1],
  blue: [0, 0, 255, 1],
  yellow: [255, 255, 0, 1],
  cyan: [0, 255, 255, 1],
  magenta: [255, 0, 255, 1],
  gray: [128, 128, 128, 1],
  grey: [128, 128, 128, 1],
  orange: [255, 165, 0, 1],
  purple: [128, 0, 128, 1]
};

function hslToRgb(h, s, l, a = 1) {
  h = (h % 360 + 360) % 360 / 360;
  s = clamp(s / 100, 0, 1);
  l = clamp(l / 100, 0, 1);

  if (s === 0) {
    const val = Math.round(l * 255);
    return [val, val, val, a];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const hue2rgb = t => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
    a
  ];
}

export const parseColor = str => {
  if (typeof str !== 'string') return null;
  const lower = str.trim().toLowerCase();
  if (NAMED_COLORS[lower]) return [...NAMED_COLORS[lower]];

  if (lower.startsWith('#')) {
    let hex = lower.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('') + 'ff';
    } else if (hex.length === 4) {
      hex = hex.split('').map(c => c + c).join('');
    } else if (hex.length === 6) {
      hex += 'ff';
    }
    if (hex.length === 8) {
      const num = parseInt(hex, 16);
      return [
        (num >> 24) & 255,
        (num >> 16) & 255,
        (num >> 8) & 255,
        parseFloat(((num & 255) / 255).toFixed(3))
      ];
    }
  }

  const rgbMatch = lower.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (rgbMatch) {
    return [
      parseFloat(rgbMatch[1]),
      parseFloat(rgbMatch[2]),
      parseFloat(rgbMatch[3]),
      rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1
    ];
  }

  const hslMatch = lower.match(/^hsla?\(\s*([\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]);
    const s = parseFloat(hslMatch[2]);
    const l = parseFloat(hslMatch[3]);
    const a = hslMatch[4] !== undefined ? parseFloat(hslMatch[4]) : 1;
    return hslToRgb(h, s, l, a);
  }

  return null;
};

export const calcRelativeValue = (current, expr) => {
  if (typeof expr !== 'string') return expr;
  const match = expr.match(/^([+\-*/]=)\s*(-?[\d.]+)(.*)$/);
  if (!match) return expr;

  const op = match[1];
  const delta = parseFloat(match[2]);
  const exprUnit = match[3] || '';

  const currStr = String(current);
  const currNum = parseFloat(currStr) || 0;
  const currUnit = currStr.replace(/[-+.\d\s]/g, '') || exprUnit;

  let result = currNum;
  if (op === '+=') result += delta;
  else if (op === '-=') result -= delta;
  else if (op === '*=') result *= delta;
  else if (op === '/=') result = delta !== 0 ? result / delta : result;

  return currUnit ? `${result}${currUnit}` : result;
};

const NUMBER_REGEX = /[-+]?(?:\d*\.?\d+(?:[eE][-+]?\d+)?)/g;

export const decomposeValue = val => {
  if (typeof val === 'number') {
    return { type: 'number', num: val, unit: '', isColor: false };
  }
  if (typeof val !== 'string') {
    return { type: 'number', num: parseFloat(val) || 0, unit: '', isColor: false };
  }

  const str = val.trim();
  const color = parseColor(str);
  if (color) {
    return { type: 'color', color, isColor: true };
  }

  const simpleMatch = str.match(/^([-+]?(?:\d*\.?\d+(?:[eE][-+]?\d+)?))\s*([a-zA-Z%]*)$/);
  if (simpleMatch) {
    return {
      type: 'simple',
      num: parseFloat(simpleMatch[1]) || 0,
      unit: simpleMatch[2] || '',
      isColor: false
    };
  }

  const numbers = [];
  const template = [];
  let lastIdx = 0;
  let match;

  NUMBER_REGEX.lastIndex = 0;
  while ((match = NUMBER_REGEX.exec(str)) !== null) {
    template.push(str.slice(lastIdx, match.index));
    numbers.push(parseFloat(match[0]));
    lastIdx = NUMBER_REGEX.lastIndex;
  }
  template.push(str.slice(lastIdx));

  return {
    type: 'complex',
    template,
    numbers,
    isColor: false
  };
};

export const interpolateDecomposed = (from, to, progress, round = 0) => {
  if (to.type === 'color' || from.type === 'color') {
    const c1 = from.color || [0, 0, 0, 1];
    const c2 = to.color || [0, 0, 0, 1];
    const r = Math.round(lerp(c1[0], c2[0], progress));
    const g = Math.round(lerp(c1[1], c2[1], progress));
    const b = Math.round(lerp(c1[2], c2[2], progress));
    const a = parseFloat(lerp(c1[3], c2[3], progress).toFixed(3));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  if (to.type === 'complex' && from.type === 'complex') {
    const tmpl = to.template.length >= from.template.length ? to.template : from.template;
    const count = Math.min(from.numbers.length, to.numbers.length);
    let res = '';
    for (let i = 0; i < tmpl.length; i++) {
      res += tmpl[i] || '';
      if (i < count) {
        let n = lerp(from.numbers[i], to.numbers[i], progress);
        if (round > 0) n = parseFloat(n.toFixed(round));
        res += n;
      } else if (i < to.numbers.length) {
        res += to.numbers[i];
      }
    }
    return res;
  }

  const fromNum = from.num !== undefined ? from.num : (from.numbers ? from.numbers[0] : 0);
  const toNum = to.num !== undefined ? to.num : (to.numbers ? to.numbers[0] : 0);
  const unit = to.unit !== undefined ? to.unit : (from.unit || '');
  let val = lerp(fromNum, toNum, progress);
  if (round > 0) val = parseFloat(val.toFixed(round));
  return unit ? `${val}${unit}` : val;
};

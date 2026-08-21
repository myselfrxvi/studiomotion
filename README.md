# StudioMotion

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/studiomotion?color=ff6b00&label=npm%20package)](https://www.npmjs.com/package/studiomotion)
[![Bundle Size](https://img.shields.io/badge/bundle%20size-~2.8%20kB%20gzip-06b6d4)](https://bundlephobia.com/package/studiomotion)
[![License](https://img.shields.io/npm/l/studiomotion?color=10b981)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/studiomotion)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)](index.d.ts)

**The ultra-lightweight, zero-dependency physics animation & scroll engine for modern web apps.**  
*Harmonic Springs &bull; 2D Matrix Staggers &bull; Scroll Scrubbing &bull; FLIP Layout &bull; SVG &amp; Kinetic Text &bull; Three.js 3D WebGL &bull; 58+ UI Recipes*

[Documentation](https://studiomotion.vercel.app/docs) &bull; [Live Demos](https://studiomotion.vercel.app/demo) &bull; [50+ UI Recipes](https://studiomotion.vercel.app/catalog) &bull; [15-in-1 Studio](https://studiomotion.vercel.app/studio)

</div>

---

## ⚡ Why StudioMotion?

StudioMotion is engineered from the ground up for front-end developers who demand **fluid 120 FPS motion** with a **tiny footprint (~2.8 kB)**:

- 🪶 **Ultra Lightweight**: Under ~2.8 kB min+gzip with **zero dependencies**.
- 🧲 **Analytical Harmonic Springs**: Physically accurate mass, stiffness, and damping calculations with natural overshoot.
- 📜 **Zero-Jitter Scroll Engine (`onScroll`)**: Scroll-driven viewport scrubbing and trigger callbacks without extra plugins.
- 📐 **2D Matrix Grid Staggers**: Wave ripple delays radiating outward from center, edges, or custom grid coordinates.
- 🔤 **Kinetic Text & Scrambler**: Letter-by-letter splitting and matrix hacker scramble deciphering built-in.
- 🖊️ **SVG Drawing & Motion Paths**: Animate stroke dash offsets and guide elements along complex Bezier paths.
- 🧊 **Three.js 3D WebGL & WAAPI**: Directly interpolate Three.js Vector3, Euler rotations, and offload to browser compositors.
- 📦 **100% Tree-Shakeable ESM & TypeScript**: Complete autocomplete definitions included.

---

## 📦 Installation

```bash
# npm
npm install studiomotion

# pnpm
pnpm add studiomotion

# yarn
yarn add studiomotion
```

### CDN Import
```html
<script src="https://cdn.jsdelivr.net/npm/studiomotion@latest/motion-engine.js"></script>
<!-- or via unpkg -->
<script src="https://unpkg.com/studiomotion@latest/motion-engine.js"></script>
```

---

## 🚀 Quickstart

### 1. Named ESM Imports
```javascript
import { animate, onScroll, stagger, text, svg, recipes } from 'studiomotion';

// Spring animation with 2D transform & opacity
animate({
  targets: '.card',
  translateY: [50, 0],
  rotateX: [25, 0],
  scale: [0.9, 1],
  opacity: [0, 1],
  duration: 800,
  easing: 'spring'
});
```

### 2. Default Import
```javascript
import StudioMotion from 'studiomotion';

StudioMotion.animate({
  targets: '#hero-button',
  scale: [0.8, 1.1, 1],
  duration: 600,
  easing: 'spring'
});
```

---

## 📖 Core Modules

### 1. Spring Physics & Keyframes
```javascript
import { animate } from 'studiomotion';

animate({
  targets: '#box',
  translateX: 250,
  rotate: '1turn',
  duration: 1000,
  // Custom spring parameters: mass, stiffness, damping
  easing: 'spring(1, 120, 8)'
});
```

### 2. 2D Matrix Grid Stagger Ripple
```javascript
import { animate, stagger } from 'studiomotion';

animate({
  targets: '.grid-cell',
  scale: [0, 1],
  rotate: [-15, 0],
  duration: 600,
  // Radiates from center across a 10x10 matrix grid
  delay: stagger(40, { grid: [10, 10], from: 'center' }),
  easing: 'spring'
});
```

### 3. ScrollTrigger Viewport Scrubbing (`onScroll`)
```javascript
import { onScroll } from 'studiomotion';

onScroll({
  target: '#featureSection',
  start: 'top 80%',
  end: 'bottom 20%',
  sync: true, // Progressively scrub with scrollbar
  animation: {
    translateY: [60, 0],
    scale: [0.88, 1],
    opacity: [0, 1],
    easing: 'spring'
  },
  onEnter: () => console.log('Section entered viewport'),
  onLeave: () => console.log('Section left viewport')
});
```

### 4. Chained Choreography Timeline
```javascript
import { timeline } from 'studiomotion';

const tl = timeline({ loop: false });

tl.add({ targets: '#badge', scale: [0, 1], duration: 400, easing: 'spring' })
  .addLabel('badgeReady')
  .add({ targets: '#headline', translateY: [30, 0], opacity: [0, 1], duration: 500 }, '+=100')
  .add({ targets: '.cta-button', scale: [0.8, 1], easing: 'spring', duration: 600 }, 'badgeReady');

tl.play();
```

### 5. Kinetic Typography & Scramble
```javascript
import { text, animate, stagger } from 'studiomotion';

// Letter-by-letter kinetic pop
const chars = text.splitChars('#headline');
animate({
  targets: chars,
  translateY: [40, 0],
  rotateZ: [-20, 0],
  stagger: 35,
  easing: 'spring'
});

// Cyberpunk text decipher scramble
text.scramble('#cyberText', {
  finalText: 'STUDIOMOTION ENGINE ONLINE',
  duration: 1200,
  charset: '0123456789!@#$%^&*<>[]{}'
});
```

### 6. SVG Path Draw & Motion Path
```javascript
import { svg } from 'studiomotion';

// Draw SVG path outline
svg.createDrawable('#checkmark', { duration: 900, easing: 'easeOutQuart' });

// Guide 3D icon along SVG curve
svg.createMotionPath('#rocket', '#curvePath', {
  autoRotate: true,
  duration: 2500,
  easing: 'easeInOutCubic'
});
```

### 7. Physics Draggable with Inertia
```javascript
import { draggable } from 'studiomotion';

draggable('.card', {
  inertia: true,
  bounds: '#container',
  snap: 20,
  onDragEnd: (x, y) => console.log('Dropped at coordinates:', x, y)
});
```

### 8. Three.js 3D WebGL Adapter
```javascript
import * as THREE from 'three';
import { animate } from 'studiomotion';

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Directly animate 3D rotation & scale vectors
animate({
  targets: mesh.rotation,
  y: Math.PI * 2,
  duration: 8000,
  loop: true,
  easing: 'linear'
});

animate({
  targets: mesh.scale,
  x: [0.5, 1.2, 1],
  y: [0.5, 1.2, 1],
  duration: 900,
  easing: 'spring'
});
```

### 9. Framework Integration & Auto-Cleanup (`scope`)
```javascript
// React Hook Example
import { useEffect, useRef } from 'react';
import { animate, scope } from 'studiomotion';

export function Card() {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = scope(ref.current);
    ctx.add(animate({
      targets: ref.current,
      translateY: [40, 0],
      scale: [0.95, 1],
      easing: 'spring'
    }));

    return () => ctx.revert(); // Auto cleanup on unmount
  }, []);

  return <div ref={ref} className="card">Smooth Motion</div>;
}
```

---

## 🛠️ Comparison Matrix

| Feature | StudioMotion.js | Anime.js v4.5 | GSAP 3 |
| :--- | :--- | :--- | :--- |
| **Gzip Bundle Size** | **~2.8 kB** | ~14 kB | ~60 kB+ |
| **Zero Dependencies** | ✅ Yes | ✅ Yes | ⚠️ Multiple packages |
| **Harmonic Spring Physics** | ✅ Built-in | ✅ Built-in | ⚠️ Paid plugin |
| **ScrollTrigger Scrubbing** | ✅ Built-in | ✅ Built-in | ⚠️ Paid/Separate |
| **Kinetic Text Splitting** | ✅ Built-in | ✅ Built-in | ⚠️ Paid plugin |
| **SVG Morph & Motion Paths**| ✅ Built-in | ✅ Built-in | ⚠️ Paid plugin |
| **FLIP Layout Engine** | ✅ Built-in | ✅ Built-in | ⚠️ Paid plugin |
| **58+ Instant UI Recipes** | ✅ Built-in (`recipes.*`) | ❌ None | ❌ None |
| **TypeScript Included** | ✅ `index.d.ts` | ✅ Included | ✅ Included |

## 👤 Author & Contact

- **GitHub**: [@myselfrxvi](https://github.com/myselfrxvi)
- **Telegram**: [@x1337R](https://t.me/x1337R)
- **Website**: [https://studiomotion.vercel.app](https://studiomotion.vercel.app)

---

## 📄 License
MIT &copy; 2026 myselfrxvi. Free for personal and commercial use.

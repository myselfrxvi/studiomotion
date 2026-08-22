
import { toArray, stagger } from '../core/utils.js';
import { Animation } from '../animation/animation.js';
import { svg } from '../svg/svg.js';

export const recipes = {

  letterSplit: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [40, 0], opacity: [0, 1], stagger: 30, duration: 600, easing: 'spring' }, opts)),
  wordFloat: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [25, 0], scale: [0.92, 1], opacity: [0, 1], stagger: 80, duration: 700, easing: 'spring' }, opts)),
  blurUnmask: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.85, 1], opacity: [0, 1], filter: ['blur(12px)', 'blur(0px)'], duration: 650, easing: 'easeOutCubic' }, opts)),
  gradientWave: (targets, opts = {}) => new Animation(Object.assign({ targets, rotate: [-6, 0], scale: [0.95, 1], duration: 800, easing: 'spring' }, opts)),
  typewriterBlink: (targets, opts = {}) => new Animation(Object.assign({ targets, scaleX: [0, 1], duration: 900, easing: 'steps(20)' }, opts)),
  counterRoll: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [60, 0], opacity: [0, 1], duration: 550, easing: 'spring' }, opts)),
  perspectiveFold: (targets, opts = {}) => new Animation(Object.assign({ targets, rotateX: [70, 0], opacity: [0, 1], duration: 850, easing: 'spring' }, opts)),
  neonFlicker: (targets, opts = {}) => new Animation(Object.assign({ targets, opacity: [0.2, 1, 0.4, 1, 0.8, 1], duration: 400, easing: 'linear' }, opts)),
  skewGlitch: (targets, opts = {}) => new Animation(Object.assign({ targets, skewX: [-25, 20, -10, 0], translateX: [-10, 10, 0], duration: 350, easing: 'easeInOutQuad' }, opts)),
  waveStagger: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [-20, 0], stagger: 50, duration: 500, easing: 'spring' }, opts)),

  tilt3D: (targets, opts = {}) => new Animation(Object.assign({ targets, rotateX: [25, 0], rotateY: [-25, 0], scale: [0.9, 1], duration: 800, easing: 'spring' }, opts)),
  bentoGlow: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.96, 1], duration: 500, easing: 'spring' }, opts)),
  depthParallax: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [-30, 0], scale: [1.08, 1], duration: 750, easing: 'spring' }, opts)),
  glassmorphismFlip: (targets, opts = {}) => new Animation(Object.assign({ targets, rotateY: [180, 0], scale: [0.8, 1], duration: 900, easing: 'spring' }, opts)),
  cardElevate: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [-18, 0], scale: [0.95, 1], duration: 600, easing: 'spring' }, opts)),
  perspectiveFan: (targets, opts = {}) => new Animation(Object.assign({ targets, rotate: [-18, 0], translateX: [-30, 0], opacity: [0, 1], stagger: 70, duration: 650, easing: 'spring' }, opts)),
  flip180: (targets, opts = {}) => new Animation(Object.assign({ targets, rotateY: [0, 180, 0], duration: 1000, easing: 'spring' }, opts)),
  isometricPop: (targets, opts = {}) => new Animation(Object.assign({ targets, rotateX: [45, 0], rotateZ: [-25, 0], scale: [0.75, 1], duration: 800, easing: 'spring' }, opts)),
  magneticSpring: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [-35, 35, 0], translateY: [-15, 15, 0], duration: 750, easing: 'spring' }, opts)),
  cardUnfold: (targets, opts = {}) => new Animation(Object.assign({ targets, scaleY: [0, 1], opacity: [0, 1], duration: 600, easing: 'spring' }, opts)),

  buttonPop: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.82, 1.15, 1], duration: 400, easing: 'spring' }, opts)),
  magnetic: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [-25, 25, 0], translateY: [-12, 12, 0], duration: 600, easing: 'spring' }, opts)),
  bellWiggle: (targets, opts = {}) => new Animation(Object.assign({ targets, rotate: [-22, 22, -14, 14, -6, 6, 0], duration: 750, easing: 'easeInOutQuad' }, opts)),
  radarRings: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.4, 2.2], opacity: [1, 0], stagger: 200, duration: 1100, loop: true, easing: 'easeOutCubic' }, opts)),
  heartPop: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.6, 1.35, 1], duration: 450, easing: 'spring' }, opts)),
  checkDraw: (targets, opts = {}) => new Animation(Object.assign({ targets, strokeDashoffset: [40, 0], duration: 450, easing: 'easeOutCubic' }, opts)),
  toggleSwitch: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [0, 24, 0], duration: 600, easing: 'spring' }, opts)),
  fluidRipple: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0, 4], opacity: [0.6, 0], duration: 550, easing: 'easeOutQuad' }, opts)),
  accordionDrawer: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [-15, 0], opacity: [0, 1], duration: 450, easing: 'spring' }, opts)),
  statusDot: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.75, 1.3], opacity: [0.5, 1], direction: 'alternate', loop: true, duration: 900, easing: 'easeInOutQuad' }, opts)),

  countUp: (targets, endVal = 100, opts = {}) => {
    const obj = { val: 0 };
    const els = toArray(targets);
    return new Animation(Object.assign({
      targets: obj,
      val: endVal,
      round: opts.round || 1,
      duration: opts.duration || 1100,
      easing: opts.easing || 'easeOutCubic',
      onUpdate: () => {
        els.forEach(el => { el.textContent = `${obj.val.toFixed(opts.decimals || 0)}${opts.suffix || '%'}`; });
      }
    }, opts));
  },
  progressFill: (targets, opts = {}) => new Animation(Object.assign({ targets, scaleX: [0, 1], duration: 900, easing: 'easeOutCubic' }, opts)),
  circularGauge: (targets, opts = {}) => new Animation(Object.assign({ targets, strokeDashoffset: [126, 25], duration: 900, easing: 'easeOutCubic' }, opts)),
  audioEqualizer: (targets, opts = {}) => new Animation(Object.assign({ targets, scaleY: [0.2, 2.2, 0.7], stagger: 40, duration: 550, easing: 'spring' }, opts)),
  tickerMarquee: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [0, -200], duration: 3500, loop: true, easing: 'linear' }, opts)),
  stepperFlow: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.5, 1.25, 1], stagger: 120, duration: 450, easing: 'spring' }, opts)),
  sparkline: (targets, opts = {}) => new Animation(Object.assign({ targets, strokeDashoffset: [120, 0], duration: 700, easing: 'easeOutQuad' }, opts)),
  donutChart: (targets, opts = {}) => new Animation(Object.assign({ targets, strokeDashoffset: [113, 28], duration: 750, easing: 'easeInOutCubic' }, opts)),
  telemetryPing: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.5, 1.8], opacity: [1, 0], duration: 800, loop: true, easing: 'easeOutQuad' }, opts)),
  skeletonShimmer: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [-100, 100], duration: 1200, loop: true, easing: 'easeInOutQuad' }, opts)),

  modalDrop: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [-80, 0], duration: 850, easing: 'easeOutBounce' }, opts)),
  sidebarFly: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [80, 0], duration: 550, easing: 'spring' }, opts)),
  morphBlob: (targets, opts = {}) => new Animation(Object.assign({ targets, rotate: [0, 180, 360], scale: [0.85, 1.1, 1], duration: 1100, easing: 'easeInOutCubic' }, opts)),
  svgLogoDraw: (targets, opts = {}) => new Animation(Object.assign({ targets, strokeDashoffset: [120, 0], duration: 750, easing: 'easeInOutQuad' }, opts)),
  planetaryOrbit: (targets, opts = {}) => new Animation(Object.assign({ targets, rotate: [0, 360], duration: 2500, loop: true, easing: 'linear' }, opts)),
  techParticles: (targets, opts = {}) => new Animation(Object.assign({ targets, translateY: [-16, 16], stagger: 50, direction: 'alternate', loop: true, duration: 1200, easing: 'easeInOutQuad' }, opts)),
  tabSlider: (targets, opts = {}) => new Animation(Object.assign({ targets, translateX: [0, 75, 0], duration: 650, easing: 'spring' }, opts)),
  backdropUnmask: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [0.85, 1], opacity: [0.2, 1], duration: 400, easing: 'spring' }, opts)),
  cardStackRoll: (targets, opts = {}) => new Animation(Object.assign({ targets, scale: [1, 0.9, 1], opacity: [1, 0.5, 1], duration: 600, easing: 'easeInOutQuad' }, opts)),
  curtainWipe: (targets, opts = {}) => new Animation(Object.assign({ targets, scaleY: [1, 0, 1], duration: 700, easing: 'easeInOutQuad' }, opts)),

  gridRipple: (targets, opts = {}) => new Animation(Object.assign({
    targets,
    scale: [0.3, 1.35, 1],
    rotate: [-90, 0],
    stagger: stagger(opts.stagger || 45, { from: opts.from || 'center' }),
    duration: opts.duration || 650,
    easing: 'spring'
  }, opts)),
  fireflySwarm: (targets, opts = {}) => new Animation(Object.assign({
    targets,
    translateX: () => (Math.random() - 0.5) * (opts.rangeX || 160),
    translateY: () => (Math.random() - 0.5) * (opts.rangeY || 120),
    scale: [0.5, 1.4, 1],
    duration: opts.duration || 850,
    easing: 'spring'
  }, opts)),
  typewriterHuman: (targets, text, opts = {}) => {
    const els = toArray(targets);
    const str = text || (els[0] ? els[0].textContent : '');
    return els.map(el => {
      el.textContent = '';
      let i = 0;
      const tick = () => {
        if (i < str.length) {
          el.textContent += str[i++];
          const delay = Math.random() * (opts.variance || 60) + (opts.speed || 40);
          setTimeout(tick, delay);
        } else if (opts.onComplete) {
          opts.onComplete(el);
        }
      };
      tick();
    });
  },
  cursorMagnet: (target, container, opts = {}) => {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    const stage = typeof container === 'string' ? document.querySelector(container) : (container || el.parentElement);
    if (!el || !stage) return;
    const strength = opts.strength || 0.35;
    const onMove = e => {
      const rect = stage.getBoundingClientRect();
      const dx = (e.clientX - rect.left - rect.width / 2) * strength;
      const dy = (e.clientY - rect.top - rect.height / 2) * strength;
      new Animation({
        targets: el,
        translateX: dx,
        translateY: dy,
        rotateX: -dy * 0.4,
        rotateY: dx * 0.4,
        duration: 350,
        easing: 'spring'
      });
    };
    const onLeave = () => {
      new Animation({
        targets: el,
        translateX: 0,
        translateY: 0,
        rotateX: 0,
        rotateY: 0,
        duration: 600,
        easing: 'spring'
      });
    };
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
    return { destroy: () => { stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave); } };
  },
  chartDraw: (targets, opts = {}) => svg.createDrawable(targets, Object.assign({ duration: opts.duration || 900, easing: 'easeInOutCubic' }, opts)),
  morphIcon: (targetPath, endPathSelector, opts = {}) => svg.morphTo(targetPath, endPathSelector, opts),
  layeredSpin: (targets, opts = {}) => new Animation(Object.assign({
    targets,
    rotateX: [35, 0],
    rotateY: [-35, 0],
    rotateZ: [15, 0],
    scale: [0.8, 1],
    duration: opts.duration || 800,
    easing: 'spring'
  }, opts)),
  infiniteCarousel: (targets, opts = {}) => new Animation(Object.assign({
    targets,
    translateX: [0, -(opts.distance || 300)],
    duration: opts.duration || 4000,
    loop: true,
    easing: 'linear'
  }, opts)),
  skeletalIK: (targets, opts = {}) => new Animation(Object.assign({
    targets,
    rotate: [-18, 18, -12, 12, 0],
    stagger: opts.stagger || 60,
    duration: opts.duration || 900,
    easing: 'spring'
  }, opts)),
  starlightSwarm: (targets, opts = {}) => new Animation(Object.assign({
    targets,
    scale: [0.2, 1.2, 0.4],
    opacity: [0.2, 1, 0.2],
    stagger: stagger(opts.stagger || 25, { from: 'center' }),
    loop: true,
    duration: opts.duration || 1400,
    easing: 'easeInOutQuad'
  }, opts)),
  clockScrub: (targets, opts = {}) => new Animation(Object.assign({
    targets,
    rotate: [0, 360],
    duration: opts.duration || 12000,
    loop: true,
    easing: 'linear'
  }, opts))
};

export const presets = recipes;

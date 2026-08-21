
import * as Utils from './core/utils.js';
import { easings } from './easings/easings.js';
import { GlobalEngine, Engine } from './engine/engine.js';
import { Timer } from './animation/timer.js';
import { Animation } from './animation/animation.js';
import { Timeline } from './timeline/timeline.js';
import { onScroll, scrollTrigger, ScrollTriggerInstance } from './events/scroll.js';
import { draggable } from './draggable/draggable.js';
import { layout } from './layout/flip.js';
import { scope, animatable } from './scope/scope.js';
import { svg } from './svg/svg.js';
import { text } from './text/text.js';
import { waapi, adapters, animateThree } from './adapters/adapters.js';
import { recipes, presets } from './recipes/recipes.js';

export const animate = config => new Animation(config);
export const timeline = config => new Timeline(config);
export const timer = config => new Timer(config);

export {
  Utils,
  Utils as utils,
  easings,
  GlobalEngine,
  GlobalEngine as engine,
  Engine,
  Timer,
  Animation,
  Timeline,
  onScroll,
  scrollTrigger,
  ScrollTriggerInstance,
  draggable,
  layout,
  scope,
  animatable,
  svg,
  text,
  waapi,
  adapters,
  animateThree,
  recipes,
  presets
};

export const clamp = Utils.clamp;
export const lerp = Utils.lerp;
export const mapRange = Utils.mapRange;
export const random = Utils.random;
export const randomInt = Utils.randomInt;
export const stagger = Utils.stagger;
export const toArray = Utils.toArray;
export const parseColor = Utils.parseColor;

export const spring = (target, opts) => recipes.letterSplit(target, opts);
export const shake = (target, opts) => recipes.bellWiggle(target, opts);
export const flip = (target, opts) => recipes.flip180(target, opts);
export const tilt = (target, opts) => recipes.tilt3D(target, opts);
export const modal = (target, opts) => recipes.modalDrop(target, opts);
export const draw = (target, opts) => svg.createDrawable(target, opts);
export const scramble = (target, endText, opts) => text.scramble(target, endText, opts);
export const morph = (path1, path2, opts) => svg.morphTo(path1, path2, opts);
export const magnet = (target, container, opts) => recipes.cursorMagnet(target, container, opts);
export const gridRipple = (targets, opts) => recipes.gridRipple(targets, opts);
export const swarm = (targets, opts) => recipes.fireflySwarm(targets, opts);
export const typewriter = (target, endText, opts) => recipes.typewriterHuman(target, endText, opts);

const StudioMotion = {
  version: '2.3.2',
  animate,
  timeline,
  timer,
  animatable,
  draggable,
  layout,
  scope,
  svg,
  text,
  onScroll,
  scrollTrigger,
  waapi,
  adapters,
  animateThree,
  engine: GlobalEngine,
  easings,
  utils: Utils,
  stagger: Utils.stagger,
  recipes,
  presets,
  spring,
  shake,
  flip,
  tilt,
  modal,
  draw,
  scramble,
  morph,
  magnet,
  gridRipple,
  swarm,
  typewriter
};

export default StudioMotion;

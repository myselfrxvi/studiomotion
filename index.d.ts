export type EasingType =
  | 'spring'
  | 'easeOutBack'
  | 'easeOutBounce'
  | 'easeInOutCubic'
  | 'easeOutExpo'
  | 'easeInExpo'
  | 'easeInOutExpo'
  | 'easeOutQuad'
  | 'easeInQuad'
  | 'easeInOutQuad'
  | 'linear';

export interface AnimationOptions {
  targets: string | HTMLElement | HTMLElement[] | NodeListOf<HTMLElement> | object;
  duration?: number;
  delay?: number;
  easing?: EasingType | ((t: number) => number);
  stagger?: number | ((index: number, total: number) => number);
  loop?: boolean | number;
  direction?: 'normal' | 'reverse' | 'alternate';
  autoplay?: boolean;
  
  // Transform & Style Properties
  translateX?: number | string | [number | string, number | string];
  translateY?: number | string | [number | string, number | string];
  translateZ?: number | string | [number | string, number | string];
  scale?: number | [number, number];
  scaleX?: number | [number, number];
  scaleY?: number | [number, number];
  rotate?: number | string | [number | string, number | string];
  rotateX?: number | string | [number | string, number | string];
  rotateY?: number | string | [number | string, number | string];
  rotateZ?: number | string | [number | string, number | string];
  skewX?: number | string | [number | string, number | string];
  skewY?: number | string | [number | string, number | string];
  opacity?: number | [number, number];
  borderRadius?: number | string | [number | string, number | string];
  strokeDashoffset?: number | [number, number];
  blur?: number | [number, number];
  
  // Event Lifecycle Callbacks
  onBegin?: (instance: AnimationInstance) => void;
  onUpdate?: (instance: AnimationInstance) => void;
  onRender?: (instance: AnimationInstance) => void;
  onLoop?: (instance: AnimationInstance) => void;
  onComplete?: (instance: AnimationInstance) => void;
  [key: string]: any;
}

export interface AnimationInstance {
  play(): AnimationInstance;
  pause(): AnimationInstance;
  restart(): AnimationInstance;
  seek(progressRatio: number): AnimationInstance;
  progress: number;
  currentTime: number;
  duration: number;
  isRunning: boolean;
}

export interface TimelineInstance {
  add(options: AnimationOptions, offset?: string | number): TimelineInstance;
  addLabel(name: string, offset?: string | number): TimelineInstance;
  play(): TimelineInstance;
  pause(): TimelineInstance;
  restart(): TimelineInstance;
  seek(progressRatio: number): TimelineInstance;
}

export interface ScrollTriggerConfig {
  target: string | HTMLElement;
  container?: string | HTMLElement | Window;
  axis?: 'y' | 'x';
  debug?: boolean;
  repeat?: boolean;
  sync?: boolean;
  scrub?: boolean;
  start?: string | number;
  end?: string | number;
  animation?: Partial<AnimationOptions>;
  onEnter?: (self: ScrollTriggerInstance) => void;
  onLeave?: (self: ScrollTriggerInstance) => void;
  onEnterBack?: (self: ScrollTriggerInstance) => void;
  onLeaveBack?: (self: ScrollTriggerInstance) => void;
  onUpdate?: (self: ScrollTriggerInstance) => void;
}

export interface ScrollTriggerInstance {
  progress: number;
  scrollPosition: number;
  isInView: boolean;
  direction: number;
  refresh(): void;
  enable(): void;
  disable(): void;
  kill(): void;
}

export interface StudioMotionStatic {
  version: string;
  animate(options: AnimationOptions): AnimationInstance;
  timeline(config?: { loop?: boolean | number; autoplay?: boolean }): TimelineInstance;
  timer(config?: { duration?: number; onTick?: (elapsed: number) => void; onComplete?: () => void }): { start(): void; pause(): void };
  onScroll(config: ScrollTriggerConfig): ScrollTriggerInstance;
  scrollTrigger(config: ScrollTriggerConfig): ScrollTriggerInstance;
  
  // Reactive & Interactive Modules
  animatable<T extends object>(target: T, defaultOptions?: Partial<AnimationOptions>): T;
  draggable(target: string | HTMLElement | HTMLElement[], options?: { bounds?: any; inertia?: boolean; snap?: number; onDrag?: (x: number, y: number) => void; onDragEnd?: (x: number, y: number) => void }): void;
  layout(container: string | HTMLElement, mutationCallback: () => void, options?: Partial<AnimationOptions>): void;
  scope(root: string | HTMLElement, callback: (scoped: { animate: Function; timeline: Function; revert: Function }) => void): { revert: () => void };
  
  // SVG Modules
  svg: {
    createDrawable(targets: string | SVGPathElement | SVGPathElement[], options?: Partial<AnimationOptions>): AnimationInstance[];
    createMotionPath(target: string | HTMLElement, pathSelector: string | SVGPathElement, options?: Partial<AnimationOptions> & { autoRotate?: boolean }): AnimationInstance;
    morphTo(targetPath: string | SVGPathElement, endPathSelector: string | SVGPathElement, options?: Partial<AnimationOptions> & { precision?: number }): AnimationInstance;
  };

  // Text Splitter & Scrambler Modules
  text: {
    splitChars(targets: string | HTMLElement | HTMLElement[], className?: string): HTMLElement[];
    splitWords(targets: string | HTMLElement | HTMLElement[], className?: string): HTMLElement[];
    scramble(targets: string | HTMLElement | HTMLElement[], endText?: string, options?: Partial<AnimationOptions> & { chars?: string }): AnimationInstance[];
  };

  // WAAPI & Adapters
  waapi(targets: string | HTMLElement | HTMLElement[], keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: KeyframeAnimationOptions): Animation[];
  adapters: {
    three(threeObject: any, props: any, options?: Partial<AnimationOptions>): AnimationInstance;
    cssVar(element: string | HTMLElement, varName: string, values: [number | string, number | string], options?: Partial<AnimationOptions> & { unit?: string }): AnimationInstance;
  };
  animateThree(threeObject: any, props: any, options?: Partial<AnimationOptions>): AnimationInstance;

  // Engine, Math & Easings
  engine: { pause(): void; resume(): void; speed: number; fps: number };
  easings: Record<string, (t: number) => number>;
  utils: {
    clamp(val: number, min: number, max: number): number;
    lerp(a: number, b: number, t: number): number;
    mapRange(val: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
    random(min: number, max: number): number;
    randomInt(min: number, max: number): number;
    stagger(val: number | Function, options?: { from?: 'first' | 'last' | 'center'; easing?: (t: number) => number }): (index: number, total: number) => number;
  };
  stagger(delayMs: number | Function, options?: any): (index: number, total: number) => number;
  recipes: Record<string, (targets: any, ...args: any[]) => AnimationInstance>;
  presets: Record<string, (targets: any, ...args: any[]) => AnimationInstance>;

  spring(targets: any, opts?: any): AnimationInstance;
  shake(targets: any, opts?: any): AnimationInstance;
  flip(targets: any, opts?: any): AnimationInstance;
  tilt(targets: any, opts?: any): AnimationInstance;
  modal(targets: any, opts?: any): AnimationInstance;
  draw(targets: any, opts?: any): AnimationInstance[];
  scramble(targets: any, endText?: string, opts?: any): AnimationInstance[];
  morph(targetPath: any, endPath: any, opts?: any): AnimationInstance;
  magnet(targets: any, container?: any, opts?: any): { destroy: () => void };
  gridRipple(targets: any, opts?: any): AnimationInstance;
  swarm(targets: any, opts?: any): AnimationInstance;
  typewriter(targets: any, text?: string, opts?: any): any;
}

declare const StudioMotion: StudioMotionStatic;

export const animate: (options: AnimationOptions) => AnimationInstance;
export const timeline: (config?: { loop?: boolean | number; autoplay?: boolean }) => TimelineInstance;
export const timer: (config?: { duration?: number; onTick?: (elapsed: number) => void; onComplete?: () => void }) => { start(): void; pause(): void };
export const onScroll: (config: ScrollTriggerConfig) => ScrollTriggerInstance;
export const scrollTrigger: (config: ScrollTriggerConfig) => ScrollTriggerInstance;
export const animatable: <T extends object>(target: T, defaultOptions?: Partial<AnimationOptions>) => T;
export const draggable: (target: string | HTMLElement | HTMLElement[], options?: { bounds?: any; inertia?: boolean; snap?: number; onDrag?: (x: number, y: number) => void; onDragEnd?: (x: number, y: number) => void }) => void;
export const layout: (container: string | HTMLElement, mutationCallback: () => void, options?: Partial<AnimationOptions>) => void;
export const scope: (root: string | HTMLElement, callback: (scoped: { animate: Function; timeline: Function; revert: Function }) => void) => { revert: () => void };
export const svg: {
  createDrawable(targets: string | SVGPathElement | SVGPathElement[], options?: Partial<AnimationOptions>): AnimationInstance[];
  createMotionPath(target: string | HTMLElement, pathSelector: string | SVGPathElement, options?: Partial<AnimationOptions> & { autoRotate?: boolean }): AnimationInstance;
};
export const text: {
  splitChars(targets: string | HTMLElement | HTMLElement[], className?: string): HTMLElement[];
  splitWords(targets: string | HTMLElement | HTMLElement[], className?: string): HTMLElement[];
};
export const waapi: (targets: string | HTMLElement | HTMLElement[], keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: KeyframeAnimationOptions) => Animation[];
export const adapters: {
  three(threeObject: any, props: any, options?: Partial<AnimationOptions>): AnimationInstance;
  cssVar(element: string | HTMLElement, varName: string, values: [number | string, number | string], options?: Partial<AnimationOptions> & { unit?: string }): AnimationInstance;
};
export const animateThree: (threeObject: any, props: any, options?: Partial<AnimationOptions>) => AnimationInstance;
export const engine: { pause(): void; resume(): void; speed: number; fps: number };
export const easings: Record<string, (t: number) => number>;
export const utils: {
  clamp(val: number, min: number, max: number): number;
  lerp(a: number, b: number, t: number): number;
  mapRange(val: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
  random(min: number, max: number): number;
  randomInt(min: number, max: number): number;
  stagger(val: number | Function, options?: { from?: 'first' | 'last' | 'center'; easing?: (t: number) => number }): (index: number, total: number) => number;
};
export const stagger: (delayMs: number | Function, options?: any) => (index: number, total: number) => number;
export const recipes: Record<string, (targets: any, ...args: any[]) => AnimationInstance>;
export const presets: Record<string, (targets: any, ...args: any[]) => AnimationInstance>;

// Quick Action & Selective Helpers
export const spring: (target: any, options?: any) => AnimationInstance;
export const shake: (target: any, options?: any) => AnimationInstance;
export const flip: (target: any, options?: any) => AnimationInstance;
export const tilt: (target: any, options?: any) => AnimationInstance;
export const modal: (target: any, options?: any) => AnimationInstance;
export const draw: (target: any, options?: any) => AnimationInstance[];
export const scramble: (target: any, endText?: string, options?: any) => AnimationInstance[];
export const morph: (targetPath: any, endPath: any, options?: any) => AnimationInstance;
export const magnet: (target: any, container?: any, options?: any) => { destroy: () => void };
export const gridRipple: (targets: any, options?: any) => AnimationInstance;
export const swarm: (targets: any, options?: any) => AnimationInstance;
export const typewriter: (targets: any, text?: string, options?: any) => any;

export default StudioMotion;

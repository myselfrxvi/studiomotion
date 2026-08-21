/**
 * StudioMotion.js - Scroll-Driven Animations & ScrollTrigger Engine
 */
import { clamp } from '../core/utils.js';
import { Animation } from '../animation/animation.js';

export class ScrollTriggerInstance {
  constructor(config = {}) {
    this.target = typeof config.target === 'string' ? document.querySelector(config.target) : config.target;
    this.container = config.container ? (typeof config.container === 'string' ? document.querySelector(config.container) : config.container) : (typeof window !== 'undefined' ? window : null);
    this.axis = config.axis || 'y';
    this.debug = !!config.debug;
    this.repeat = config.repeat !== false;
    this.sync = config.sync || config.scrub || false;
    
    this.start = config.start || 'top 85%';
    this.end = config.end || 'bottom 15%';

    this.onEnter = config.onEnter || null;
    this.onLeave = config.onLeave || null;
    this.onEnterBack = config.onEnterBack || null;
    this.onLeaveBack = config.onLeaveBack || null;
    this.onUpdate = config.onUpdate || null;

    this.animation = null;
    if (config.animation) {
      const animCfg = Object.assign({}, config.animation, { targets: config.animation.targets || this.target, autoplay: false });
      this.animation = new Animation(animCfg);
    }

    this.isInView = false;
    this.progress = 0;
    this.direction = 1; // 1 down, -1 up
    this.lastScrollPos = 0;
    this.ticking = false;

    this._onScroll = this._onScroll.bind(this);
    this.init();
  }

  init() {
    if (!this.target || typeof window === 'undefined') return;
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onScroll, { passive: true });
    this._update();
  }

  _onScroll() {
    if (!this.ticking) {
      requestAnimationFrame(() => {
        this._update();
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  _update() {
    if (!this.target) return;
    const rect = this.target.getBoundingClientRect();
    const vh = window.innerHeight;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    this.direction = scrollY >= this.lastScrollPos ? 1 : -1;
    this.lastScrollPos = scrollY;

    const startPx = this._parseThreshold(this.start, vh, rect.height);
    const endPx = this._parseThreshold(this.end, vh, rect.height);

    const totalDistance = (vh - startPx) + (rect.height - endPx);
    const currentDistance = vh - startPx - rect.top;

    const progress = clamp(currentDistance / (totalDistance || 1), 0, 1);
    this.progress = progress;

    const wasInView = this.isInView;
    const currentlyInView = progress > 0 && progress < 1;

    if (currentlyInView && !wasInView) {
      this.isInView = true;
      if (this.direction === 1 && this.onEnter) this.onEnter(this);
      if (this.direction === -1 && this.onEnterBack) this.onEnterBack(this);
      if (this.animation && !this.sync) this.animation.play();
    } else if (!currentlyInView && wasInView) {
      this.isInView = false;
      if (progress >= 1 && this.onLeave) this.onLeave(this);
      if (progress <= 0 && this.onLeaveBack) this.onLeaveBack(this);
      if (this.animation && !this.sync && this.repeat) this.animation.seek(0);
    }

    if (this.sync && this.animation) {
      this.animation.seek(progress);
    }

    if (this.onUpdate) {
      this.onUpdate(this);
    }
  }

  _parseThreshold(thresholdStr, viewportHeight, targetHeight) {
    if (typeof thresholdStr === 'number') return thresholdStr;
    const parts = String(thresholdStr).split(' ');
    const targetEdge = parts[0] || 'top';
    const viewportEdge = parts[1] || '80%';

    let vpPx = viewportHeight * 0.8;
    if (viewportEdge.endsWith('%')) {
      vpPx = (parseFloat(viewportEdge) / 100) * viewportHeight;
    } else if (viewportEdge.endsWith('px')) {
      vpPx = parseFloat(viewportEdge);
    } else if (viewportEdge === 'top') vpPx = 0;
    else if (viewportEdge === 'center') vpPx = viewportHeight / 2;
    else if (viewportEdge === 'bottom') vpPx = viewportHeight;

    return vpPx;
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this._onScroll);
      window.removeEventListener('resize', this._onScroll);
    }
    if (this.animation) this.animation.pause();
  }
}

export const onScroll = config => new ScrollTriggerInstance(config);
export const scrollTrigger = onScroll;

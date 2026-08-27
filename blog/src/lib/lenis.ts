import Lenis from "lenis";
import { gsap } from "gsap";

let lenis: Lenis | null = null;
let rafId: number | null = null;

export function initLenis() {
  // If already running, destroy the previous instance first (prevents Astro navigation leaks)
  if (lenis) {
    destroyLenis();
  }

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential out (Very smooth)
    smoothWheel: true,
    touchMultiplier: 1.5,
    infinite: false,
  });

  // Sync with GSAP ticker if GSAP is loaded, or fallback to native requestAnimationFrame
  if (typeof window !== "undefined") {
    // Synchronize Lenis with GSAP's ticker for ultra-smooth GSAP animations
    gsap.ticker.add((time) => {
      lenis?.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  return lenis;
}

export function getLenis() {
  return lenis;
}

export function stopLenis() {
  lenis?.stop();
}

export function startLenis() {
  lenis?.start();
}

export function destroyLenis() {
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
}
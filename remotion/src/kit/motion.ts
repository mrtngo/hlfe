/**
 * Shared motion language.
 *
 * Every entrance in these videos uses the same spring so ten separate films
 * feel like one brand. Helpers take an absolute frame and the frame the
 * element should start on, which keeps callers free of Sequence gymnastics
 * for simple staggered reveals.
 */
import { interpolate, spring } from 'remotion';
import { CANVAS } from '../brand/tokens';

const fps = CANVAS.fps;

/** The house spring: settles quickly, a whisper of overshoot. */
export const SPRING = { damping: 200, stiffness: 120, mass: 0.6 } as const;

/** 0 → 1 entrance progress, clamped, starting at `delay` frames. */
export const enter = (frame: number, delay = 0) =>
    spring({ frame: frame - delay, fps, config: SPRING, durationInFrames: 22 });

/**
 * Standard "rise and fade in" transform. `y` is the distance travelled in
 * phone points (or canvas px — whatever the caller's coordinate space is).
 */
export const riseIn = (frame: number, delay = 0, y = 18) => {
    const p = enter(frame, delay);
    return { opacity: p, transform: `translateY(${(1 - p) * y}px)` };
};

/** Scale-up entrance for badges, tiles and the logo. */
export const popIn = (frame: number, delay = 0, from = 0.82) => {
    const p = enter(frame, delay);
    return { opacity: p, transform: `scale(${from + (1 - from) * p})` };
};

/** Fades in over `len`, holds, then fades out before `outAt`. */
export const fadeInOut = (frame: number, inAt: number, outAt: number, len = 12) =>
    interpolate(frame, [inAt, inAt + len, outAt - len, outAt], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

/**
 * Eases a number from `from` to `to` — for counting balances up. Money should
 * never linearly tick; the ease-out makes the final value feel arrived-at.
 */
export const countTo = (frame: number, delay: number, from: number, to: number, len = 30) =>
    interpolate(frame, [delay, delay + len], [from, to], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: (t) => 1 - Math.pow(1 - t, 3),
    });

/** Slow continuous drift, for background gradients. Returns -1 → 1. */
export const drift = (frame: number, period = 240) => Math.sin((frame / period) * Math.PI * 2);

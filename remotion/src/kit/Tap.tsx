/**
 * Tap — the finger indicator that makes a flow legible.
 *
 * Coordinates are in PHONE points, so a tap is placed at the same numbers
 * used to lay out the control it lands on. It travels in, presses, ripples,
 * and leaves; `pressAt` is the frame the press peaks, which scenes also feed
 * into a Cta's `press` prop so the button reacts to the same beat.
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { V2 } from '../brand/tokens';
import { enter } from './motion';

/** Press depth 0 → 1 → 0 around `pressAt`, for syncing a control's own state. */
export const pressCurve = (frame: number, pressAt: number) =>
    interpolate(frame, [pressAt - 6, pressAt, pressAt + 7], [0, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

export const Tap: React.FC<{
    /** Target, in phone points. */
    x: number;
    y: number;
    /** Frame the finger starts moving in. */
    from: number;
    /** Frame the press peaks. */
    pressAt: number;
    /** Where it drifts in from, relative to the target. */
    offset?: { x: number; y: number };
}> = ({ x, y, from, pressAt, offset = { x: 28, y: 64 } }) => {
    const frame = useCurrentFrame();
    if (frame < from) return null;

    const travel = enter(frame, from);
    const press = pressCurve(frame, pressAt);
    // Fade the finger out once the press is done and the UI has reacted.
    const out = interpolate(frame, [pressAt + 10, pressAt + 22], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    const cx = x + (1 - travel) * offset.x;
    const cy = y + (1 - travel) * offset.y;
    const ripple = interpolate(press, [0, 1], [0, 1]);

    return (
        <div style={{ position: 'absolute', left: cx, top: cy, opacity: travel * out, pointerEvents: 'none' }}>
            {/* Expanding ripple on contact */}
            <div
                style={{
                    position: 'absolute',
                    left: -34,
                    top: -34,
                    width: 68,
                    height: 68,
                    borderRadius: 99,
                    border: `2px solid rgba(227,179,76,${0.5 * (1 - ripple)})`,
                    transform: `scale(${0.3 + ripple * 1.1})`,
                }}
            />
            {/* Finger pad */}
            <div
                style={{
                    position: 'absolute',
                    left: -15,
                    top: -15,
                    width: 30,
                    height: 30,
                    borderRadius: 99,
                    background: 'rgba(227,179,76,0.28)',
                    border: `2px solid ${V2.accent}`,
                    boxShadow: '0 4px 18px -2px rgba(227,179,76,0.7)',
                    transform: `scale(${1 - press * 0.22})`,
                }}
            />
        </div>
    );
};

/**
 * Highlight ring — draws attention to a region without implying a tap.
 * Used for "look at this number" beats.
 */
export const Spotlight: React.FC<{
    x: number;
    y: number;
    w: number;
    h: number;
    from: number;
    radius?: number;
}> = ({ x, y, w, h, from, radius = 14 }) => {
    const frame = useCurrentFrame();
    if (frame < from) return null;
    const p = enter(frame, from);
    const pulse = 1 + Math.sin((frame - from) / 9) * 0.02;
    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: w,
                height: h,
                borderRadius: radius,
                border: `1.5px solid rgba(227,179,76,${0.85 * p})`,
                boxShadow: `0 0 0 4px rgba(227,179,76,${0.12 * p}), 0 0 26px rgba(227,179,76,${0.35 * p})`,
                transform: `scale(${pulse})`,
                pointerEvents: 'none',
            }}
        />
    );
};

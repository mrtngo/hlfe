/**
 * Stage — the shared canvas every film sits on: branded background, wordmark
 * at the top, phone in the middle, caption beneath.
 *
 * Centralising it means all ten videos share identical framing, so they cut
 * together as a set.
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { CANVAS, V2 } from '../brand/tokens';
import { FONT_MONO, FONT_SERIF, FONT_UI } from '../brand/fonts';
import { DelosWordmark } from '../brand/DelosSun';
import { PhoneFrame } from './PhoneFrame';
import { drift, enter, riseIn } from './motion';

export const Backdrop: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const frame = useCurrentFrame();
    // Two counter-drifting gold pools keep the background alive without
    // pulling attention off the phone.
    const a = drift(frame, 300);
    const b = drift(frame + 90, 420);
    return (
        <div style={{ width: CANVAS.width, height: CANVAS.height, background: V2.bg, overflow: 'hidden' }}>
            <div
                style={{
                    position: 'absolute',
                    inset: -200,
                    background: `radial-gradient(48% 34% at ${50 + a * 12}% ${18 + b * 6}%, rgba(227,179,76,0.20) 0%, transparent 62%)`,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: -200,
                    background: `radial-gradient(42% 30% at ${38 - b * 14}% ${86 + a * 5}%, rgba(227,179,76,0.10) 0%, transparent 60%)`,
                }}
            />
            {/* Vignette, so the phone edge always reads against the ground. */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(75% 55% at 50% 45%, transparent 40%, rgba(0,0,0,0.55) 100%)',
                }}
            />
            {children}
        </div>
    );
};

/**
 * The phone, framed and entering. `delay` lets a film show a title card first
 * and bring the device in after.
 */
export const StagePhone: React.FC<{ children: React.ReactNode; delay?: number }> = ({
    children,
    delay = 0,
}) => {
    const frame = useCurrentFrame();
    const p = enter(frame, delay);
    return (
        <div
            style={{
                position: 'absolute',
                top: 236,
                left: '50%',
                transform: `translateX(-50%) translateY(${(1 - p) * 60}px) scale(${0.94 + p * 0.06})`,
                opacity: p,
            }}
        >
            <PhoneFrame>{children}</PhoneFrame>
        </div>
    );
};

/** Wordmark lockup, top of frame. */
export const StageHeader: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
    const frame = useCurrentFrame();
    return (
        <div
            style={{
                position: 'absolute',
                top: 120,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                ...riseIn(frame, delay, 20),
            }}
        >
            <DelosWordmark size={52} />
        </div>
    );
};

/**
 * Caption band under the phone. `eyebrow` names the step ("Paso 2 · Depósito")
 * and `text` is the one line the viewer reads.
 */
export const Caption: React.FC<{
    eyebrow?: string;
    text: string;
    delay?: number;
}> = ({ eyebrow, text, delay = 0 }) => {
    const frame = useCurrentFrame();
    return (
        <div
            style={{
                position: 'absolute',
                bottom: 96,
                left: 90,
                right: 90,
                textAlign: 'center',
                ...riseIn(frame, delay, 24),
            }}
        >
            {eyebrow && (
                <div
                    style={{
                        fontFamily: FONT_MONO,
                        fontSize: 22,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: V2.accent,
                        fontWeight: 700,
                        marginBottom: 14,
                    }}
                >
                    {eyebrow}
                </div>
            )}
            <div
                style={{
                    fontFamily: FONT_UI,
                    fontSize: 46,
                    lineHeight: 1.22,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: V2.t1,
                    textShadow: '0 4px 30px rgba(0,0,0,0.8)',
                }}
            >
                {text}
            </div>
        </div>
    );
};

/** Full-frame title card: serif headline over the gold ground. */
export const TitleCard: React.FC<{
    kicker?: string;
    title: string;
    sub?: string;
}> = ({ kicker, title, sub }) => {
    const frame = useCurrentFrame();
    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 110px',
                textAlign: 'center',
            }}
        >
            <div style={{ ...riseIn(frame, 0, 26), marginBottom: 40 }}>
                <DelosWordmark size={56} />
            </div>
            {kicker && (
                <div
                    style={{
                        fontFamily: FONT_MONO,
                        fontSize: 24,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: V2.accent,
                        fontWeight: 700,
                        marginBottom: 22,
                        ...riseIn(frame, 6, 20),
                    }}
                >
                    {kicker}
                </div>
            )}
            <div
                style={{
                    fontFamily: FONT_SERIF,
                    fontSize: 118,
                    lineHeight: 1.02,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    color: V2.t1,
                    whiteSpace: 'pre-line',
                    ...riseIn(frame, 10, 30),
                }}
            >
                {title}
            </div>
            {sub && (
                <div
                    style={{
                        fontFamily: FONT_UI,
                        fontSize: 40,
                        lineHeight: 1.3,
                        color: V2.t2,
                        marginTop: 30,
                        fontWeight: 500,
                        ...riseIn(frame, 16, 24),
                    }}
                >
                    {sub}
                </div>
            )}
        </div>
    );
};

/**
 * Closing card — wordmark, tagline, domain.
 *
 * Paints its own ground, fading in over the first few frames. The outgoing
 * scene's phone is still mounted underneath (scenes linger past their end so
 * they can be dissolved over), and without an opaque cover it shows through
 * the end card for a third of a second.
 */
export const EndCard: React.FC<{ line?: string }> = ({ line = 'Operá de todo. Un toque.' }) => {
    const frame = useCurrentFrame();
    const p = enter(frame, 2);
    const cover = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 34,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: V2.bg,
                    opacity: cover,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: cover,
                    background:
                        'radial-gradient(52% 34% at 50% 44%, rgba(227,179,76,0.20) 0%, transparent 64%)',
                }}
            />
            <div style={{ position: 'relative', transform: `scale(${0.9 + p * 0.1})`, opacity: p }}>
                <DelosWordmark size={78} rayScale={1 + (1 - p) * 0.4} />
            </div>
            <div
                style={{
                    fontFamily: FONT_SERIF,
                    fontSize: 52,
                    color: V2.t1,
                    fontWeight: 600,
                    position: 'relative',
                    ...riseIn(frame, 10, 20),
                }}
            >
                {line}
            </div>
            <div
                style={{
                    fontFamily: FONT_MONO,
                    fontSize: 26,
                    letterSpacing: '0.14em',
                    color: V2.accent,
                    fontWeight: 700,
                    position: 'relative',
                    ...riseIn(frame, 16, 16),
                }}
            >
                DELOS.TRADE
            </div>
        </div>
    );
};

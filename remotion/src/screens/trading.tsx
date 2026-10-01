/**
 * Buy (beginner, 1x) and Trade (leveraged perps) screens.
 *
 * The distinction matters to the product: "Comprar" places a 1x perp buy and
 * never mentions leverage, while "Operar" is the explicit long/short surface.
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { V2 } from '../brand/tokens';
import { FONT_MONO } from '../brand/fonts';
import { Card, Cta, FootNote, Label, Mono, Pill, SectionHead } from '../kit/ui';
import { enter, riseIn } from '../kit/motion';
import { Screen } from './common';

/** Deterministic candle series — stable across frames, no random(). */
const candles = (n: number, seed = 7) =>
    Array.from({ length: n }, (_, i) => {
        const w = Math.sin((i + seed) * 0.7) + Math.sin((i + seed) * 0.23) * 1.6 + Math.sin(i * 0.11) * 0.8;
        const mid = 50 + w * 9;
        const body = 5 + Math.abs(Math.sin((i + seed) * 1.7)) * 9;
        return { mid, body, up: Math.sin((i + seed) * 0.9) > -0.15 };
    });

/** Candlestick chart, drawn left-to-right as `reveal` goes 0 → 1. */
export const Chart: React.FC<{ height?: number; reveal?: number; seed?: number }> = ({
    height = 130,
    reveal = 1,
    seed = 7,
}) => {
    const n = 30;
    const data = candles(n, seed);
    return (
        <div style={{ position: 'relative', height, width: '100%' }}>
            {data.map((c, i) => {
                const shown = i / n <= reveal;
                if (!shown) return null;
                const color = c.up ? V2.pos : V2.neg;
                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            left: `${(i / n) * 100}%`,
                            bottom: `${c.mid - c.body / 2}%`,
                            width: `${(1 / n) * 100 - 1.2}%`,
                            height: `${c.body}%`,
                            background: color,
                            borderRadius: 1.5,
                            opacity: 0.92,
                        }}
                    />
                );
            })}
        </div>
    );
};

/** Beginner buy sheet: asset, amount keypad-style display, slide to confirm. */
export const BuyScreen: React.FC<{
    amount?: string;
    slide?: number;
}> = ({ amount = '100', slide = 0 }) => {
    const frame = useCurrentFrame();
    return (
        <Screen>
            <div style={{ padding: '56px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 20 }}>
                    <div
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 99,
                            background: '#F7931A',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 800,
                            color: '#0A0C0E',
                        }}
                    >
                        BTC
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>
                            Comprar Bitcoin
                        </div>
                        <div style={{ fontSize: 12, color: V2.t3, fontFamily: FONT_MONO }}>
                            $76.714 · +0,5%
                        </div>
                    </div>
                </div>

                <Card style={{ padding: 22, textAlign: 'center', ...riseIn(frame, 2, 14) }}>
                    <Label style={{ fontSize: 11.5, color: V2.t3, marginBottom: 8 }}>¿Cuánto quieres poner?</Label>
                    <div
                        style={{
                            fontSize: 52,
                            fontWeight: 700,
                            fontFamily: FONT_MONO,
                            letterSpacing: '-0.04em',
                            lineHeight: 1,
                        }}
                    >
                        ${amount}
                    </div>
                    <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 8, fontFamily: FONT_MONO }}>
                        ≈ 0,0013 BTC
                    </div>
                </Card>

                <div style={{ display: 'flex', gap: 8, marginTop: 12, ...riseIn(frame, 5, 12) }}>
                    {['$50', '$100', '$250', 'Máx'].map((q, i) => (
                        <div
                            key={q}
                            style={{
                                flex: 1,
                                textAlign: 'center',
                                padding: '10px 0',
                                borderRadius: 11,
                                fontSize: 12.5,
                                fontWeight: 700,
                                background: i === 1 ? V2.accentSoft : V2.card,
                                border: `1px solid ${i === 1 ? 'rgba(227,179,76,0.4)' : V2.hair}`,
                                color: i === 1 ? V2.accent : V2.t2,
                            }}
                        >
                            {q}
                        </div>
                    ))}
                </div>

                <Card style={{ marginTop: 16, ...riseIn(frame, 8, 14) }}>
                    {[
                        ['Precio', '$76.714'],
                        ['Comisión', '$0,05'],
                        ['Total', `$${amount}`],
                    ].map(([k, v], i) => (
                        <div
                            key={k}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '8px 0',
                                borderBottom: i < 2 ? `1px solid ${V2.hair}` : 'none',
                            }}
                        >
                            <span style={{ fontSize: 12.5, color: V2.t3 }}>{k}</span>
                            <Mono size={13}>{v}</Mono>
                        </div>
                    ))}
                </Card>

                <SlideToConfirm label="Desliza para comprar" p={slide} style={{ marginTop: 18 }} />
            </div>
            <FootNote>
                Tu orden se firma en tu propio dispositivo. Delos nunca toca tus fondos.
            </FootNote>
        </Screen>
    );
};

/** The app's slide-to-confirm control; `p` is 0 → 1 travel. */
export const SlideToConfirm: React.FC<{
    label: string;
    p: number;
    style?: React.CSSProperties;
}> = ({ label, p, style }) => (
    <div
        style={{
            position: 'relative',
            height: 54,
            borderRadius: 16,
            background: V2.card,
            border: `1px solid ${V2.hair2}`,
            overflow: 'hidden',
            ...style,
        }}
    >
        <div
            style={{
                position: 'absolute',
                inset: 0,
                background: V2.accentSoft,
                width: `${p * 100}%`,
            }}
        />
        <div
            style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: p > 0.6 ? V2.accent : V2.t2,
                opacity: 1 - p * 0.35,
            }}
        >
            {label}
        </div>
        <div
            style={{
                position: 'absolute',
                top: 5,
                left: 5,
                width: 44,
                height: 44,
                borderRadius: 13,
                background: V2.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `translateX(${p * 296}px)`,
                boxShadow: '0 4px 16px -2px rgba(227,179,76,0.7)',
            }}
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={V2.accentInk} strokeWidth={2.6} strokeLinecap="round">
                <path d="M5 12h13M12 5l7 7-7 7" />
            </svg>
        </div>
    </div>
);

/** Leveraged perp ticket: long/short, leverage slider, liq price. */
export const TradeScreen: React.FC<{
    side?: 'long' | 'short';
    leverage?: number;
    chartReveal?: number;
}> = ({ side = 'long', leverage = 5, chartReveal = 1 }) => {
    const frame = useCurrentFrame();
    const lev = Math.round(leverage);
    return (
        <Screen>
            <div style={{ padding: '56px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 4 }}>
                    <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em' }}>BTC-PERP</span>
                    <Pill label={`${lev}x`} tone="accent" />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 14 }}>
                    <Mono size={27}>$76.714</Mono>
                    <span style={{ fontSize: 13, color: V2.pos, fontFamily: FONT_MONO, fontWeight: 700 }}>
                        +0,52%
                    </span>
                </div>

                <Card style={{ padding: '14px 12px', marginBottom: 14 }}>
                    <Chart height={124} reveal={chartReveal} />
                </Card>

                <div style={{ display: 'flex', gap: 9, marginBottom: 14, ...riseIn(frame, 3, 12) }}>
                    {(['long', 'short'] as const).map((s) => {
                        const on = s === side;
                        const c = s === 'long' ? V2.pos : V2.neg;
                        const soft = s === 'long' ? V2.posSoft : V2.negSoft;
                        return (
                            <div
                                key={s}
                                style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    padding: '13px 0',
                                    borderRadius: 13,
                                    background: on ? soft : V2.card,
                                    border: `1px solid ${on ? c : V2.hair}`,
                                    color: on ? c : V2.t3,
                                    fontSize: 14.5,
                                    fontWeight: 800,
                                }}
                            >
                                {s === 'long' ? 'Subir ↑' : 'Bajar ↓'}
                            </div>
                        );
                    })}
                </div>

                <Card style={{ ...riseIn(frame, 6, 12) }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <Label style={{ fontSize: 12, color: V2.t3 }}>Apalancamiento</Label>
                        <Mono size={13} color={V2.accent}>{lev}x</Mono>
                    </div>
                    <div style={{ position: 'relative', height: 5, borderRadius: 99, background: V2.hair2 }}>
                        <div
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: `${(lev / 40) * 100}%`,
                                borderRadius: 99,
                                background: V2.accent,
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                left: `${(lev / 40) * 100}%`,
                                top: -7,
                                width: 19,
                                height: 19,
                                marginLeft: -9.5,
                                borderRadius: 99,
                                background: V2.accent,
                                boxShadow: '0 2px 10px rgba(227,179,76,0.7)',
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                        <div>
                            <Label style={{ fontSize: 11, color: V2.t3 }}>Tu margen</Label>
                            <Mono size={14}>$200</Mono>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <Label style={{ fontSize: 11, color: V2.t3 }}>Posición</Label>
                            <Mono size={14}>${200 * lev}</Mono>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <Label style={{ fontSize: 11, color: V2.t3 }}>Liquidación</Label>
                            <Mono size={14} color={V2.neg}>
                                ${(76714 * (1 - 1 / lev)).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                            </Mono>
                        </div>
                    </div>
                </Card>

                <Cta
                    label={`${side === 'long' ? 'Abrir subida' : 'Abrir bajada'} · ${lev}x`}
                    style={{ marginTop: 18, ...riseIn(frame, 10, 14) }}
                />
            </div>
            <FootNote icon="⚠️">
                Con apalancamiento puedes perder tu margen. Nunca pongas más de lo que
                puedas perder.
            </FootNote>
        </Screen>
    );
};

/** An open position card with live-ish PnL, for the trade and portfolio films. */
export const PositionCard: React.FC<{
    symbol?: string;
    side?: 'long' | 'short';
    lev?: number;
    pnl: number;
    pnlPct: number;
    delay?: number;
}> = ({ symbol = 'BTC', side = 'long', lev = 5, pnl, pnlPct, delay = 0 }) => {
    const frame = useCurrentFrame();
    const up = pnl >= 0;
    return (
        <Card style={{ ...riseIn(frame, delay, 14) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                <span style={{ fontSize: 14.5, fontWeight: 800 }}>{symbol}</span>
                <Pill label={side === 'long' ? 'Subida' : 'Bajada'} tone={side === 'long' ? 'pos' : 'neg'} />
                <Pill label={`${lev}x`} />
                <div style={{ flex: 1 }} />
                <Mono size={16} color={up ? V2.pos : V2.neg}>
                    {up ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                </Mono>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {[
                    ['Entrada', '$76.190'],
                    ['Actual', '$76.714'],
                    ['Retorno', `${up ? '+' : ''}${pnlPct.toFixed(1)}%`],
                ].map(([k, v], i) => (
                    <div key={k} style={{ textAlign: i === 2 ? 'right' : i === 1 ? 'center' : 'left' }}>
                        <Label style={{ fontSize: 10.5, color: V2.t3 }}>{k}</Label>
                        <Mono size={12.5} color={i === 2 ? (up ? V2.pos : V2.neg) : V2.t1}>
                            {v}
                        </Mono>
                    </div>
                ))}
            </div>
        </Card>
    );
};

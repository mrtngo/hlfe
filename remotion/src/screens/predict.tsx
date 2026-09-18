/**
 * HIP-4 prediction-market screens.
 *
 * Mirrors what the app actually renders after the template-rendering fix:
 * human titles filled from deployer templates, a venue badge naming the
 * deployer (Outcome / Trade.xyz / Skew), grouped events, and price ladders
 * merged into one event whose cards show just their threshold.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { V2 } from '../brand/tokens';
import { FONT_MONO } from '../brand/fonts';
import { Card, Cta, FootNote, Label, Mono, Pill } from '../kit/ui';
import { riseIn } from '../kit/motion';
import { odds } from '../kit/format';
import { Screen } from './common';

const VenueBadge: React.FC<{ name: string }> = ({ name }) => (
    <span
        style={{
            padding: '2px 7px',
            borderRadius: 99,
            border: `1px solid ${V2.hair}`,
            background: V2.card,
            color: V2.t3,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
        }}
    >
        {name}
    </span>
);

const SidePill: React.FC<{ label: string; mid: number; tone: 'pos' | 'neg' }> = ({
    label,
    mid,
    tone,
}) => {
    const c = tone === 'pos' ? V2.pos : V2.neg;
    const bg = tone === 'pos' ? V2.posSoft : V2.negSoft;
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 99,
                background: bg,
                border: `1px solid ${c}44`,
                color: c,
                fontSize: 11,
                fontWeight: 700,
            }}
        >
            {label}
            <span style={{ fontFamily: FONT_MONO, opacity: 0.85 }}>{odds(mid)}</span>
        </span>
    );
};

/** Event header with the gold tick, venue badge and rung count. */
const EventHead: React.FC<{ name: string; venue?: string; count: number }> = ({
    name,
    venue,
    count,
}) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7, marginTop: 2 }}>
        <span style={{ width: 3, height: 15, borderRadius: 99, background: V2.accent, flexShrink: 0 }} />
        <div
            style={{
                fontSize: 14.5,
                fontWeight: 800,
                letterSpacing: '-0.01em',
                flex: 1,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}
        >
            {name}
        </div>
        {venue && <VenueBadge name={venue} />}
        <span style={{ fontSize: 11, fontWeight: 700, color: V2.t3 }}>{count}</span>
    </div>
);

const MarketCard: React.FC<{
    title: string;
    yes: number;
    yesLabel?: string;
    noLabel?: string;
    venue?: string;
    highlight?: boolean;
}> = ({ title, yes, yesLabel = 'Sí', noLabel = 'No', venue, highlight }) => (
    <div
        style={{
            padding: '12px 14px',
            background: highlight ? V2.accentSoft : V2.card,
            border: `1px solid ${highlight ? 'rgba(227,179,76,0.4)' : V2.hair}`,
            borderRadius: 13,
            marginBottom: 7,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
        }}
    >
        <div style={{ flex: 1, minWidth: 0 }}>
            <div
                style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                {title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
                <SidePill label={yesLabel} mid={yes} tone="pos" />
                <SidePill label={noLabel} mid={1 - yes} tone="neg" />
                {venue && <VenueBadge name={venue} />}
            </div>
        </div>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={V2.t3} strokeWidth={2}>
            <path d="M9 6l6 6-6 6" />
        </svg>
    </div>
);

/** The prediction-markets browser: filters, a ladder, a grouped match. */
export const PredictBrowse: React.FC<{ venueFilter?: string }> = ({ venueFilter }) => {
    const frame = useCurrentFrame();
    return (
        <Screen nav="predict">
            <div style={{ padding: '52px 20px 0' }}>
                <Label style={{ fontSize: 10.5, color: V2.t3, fontWeight: 600 }}>
                    HIP-4 · sin comisión de apertura
                </Label>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>
                    Predecí
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {['Todos', 'Deportes', 'Economía', 'Cripto'].map((c, i) => (
                        <div
                            key={c}
                            style={{
                                padding: '6px 11px',
                                borderRadius: 99,
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: i === 0 ? V2.accent : V2.card,
                                border: `1px solid ${i === 0 ? V2.accent : V2.hair}`,
                                color: i === 0 ? V2.accentInk : V2.t2,
                            }}
                        >
                            {c}
                        </div>
                    ))}
                </div>

                {/* Deployer filter — the venue row */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 14 }}>
                    <span
                        style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            color: V2.t3,
                            letterSpacing: '0.08em',
                        }}
                    >
                        CASA
                    </span>
                    {['Todos', 'Outcome', 'Trade.xyz', 'Skew'].map((v) => {
                        const on = venueFilter ? v === venueFilter : v === 'Todos';
                        return (
                            <div
                                key={v}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: 99,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: on ? V2.accent : V2.card,
                                    border: `1px solid ${on ? V2.accent : V2.hair}`,
                                    color: on ? V2.accentInk : V2.t2,
                                }}
                            >
                                {v}
                            </div>
                        );
                    })}
                </div>

                {/* The board respects the venue filter: picking a deployer
                    really does drop everyone else's markets. */}
                {venueFilter === 'Trade.xyz' ? (
                    <>
                        <div style={{ ...riseIn(frame, 3, 14) }}>
                            <EventHead name="Barcelona vs Sevilla" venue="Trade.xyz" count={3} />
                            <MarketCard title="Barcelona" yes={0.82} />
                            <MarketCard title="Empate" yes={0.12} />
                            <MarketCard title="Sevilla" yes={0.18} />
                        </div>
                        <div style={{ marginTop: 12, ...riseIn(frame, 9, 14) }}>
                            <EventHead name="Oro arriba de… · 30 sept, 20:00 UTC" venue="Trade.xyz" count={2} />
                            <MarketCard title="$3.858,7" yes={0.99} />
                            <MarketCard title="$4.716,1" yes={0.11} />
                        </div>
                    </>
                ) : (
                    <>
                        {/* A merged price ladder: one event, rungs by threshold */}
                        <div style={{ ...riseIn(frame, 3, 14) }}>
                            <EventHead name="BTC arriba de… · 18 sept, 06:00 UTC" venue="Skew" count={4} />
                            <MarketCard title="$74.950" yes={0.94} />
                            <MarketCard title="$76.650" yes={0.57} />
                            <MarketCard title="$77.850" yes={0.45} />
                            <MarketCard title="$79.550" yes={0.06} />
                        </div>

                        {/* A question-grouped football match */}
                        <div style={{ marginTop: 12, ...riseIn(frame, 9, 14) }}>
                            <EventHead name="Barcelona vs Sevilla" venue="Trade.xyz" count={3} />
                            <MarketCard title="Barcelona" yes={0.82} />
                            <MarketCard title="Empate" yes={0.12} />
                        </div>
                    </>
                )}
            </div>
        </Screen>
    );
};

/** The bet ticket for one outcome side. */
export const PredictTicket: React.FC<{ stake?: string; slide?: number }> = ({
    stake = '50',
    slide = 0,
}) => {
    const frame = useCurrentFrame();
    return (
        <Screen>
            <div style={{ padding: '56px 20px 0' }}>
                <Label style={{ fontSize: 11, color: V2.t3, fontWeight: 600 }}>
                    Trade.xyz · USDC
                </Label>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                    Barcelona vs Sevilla
                </div>
                <div style={{ fontSize: 11.5, color: V2.t3, marginBottom: 18, lineHeight: 1.5 }}>
                    LALIGA · Regular Season · Cierra 20 sept 2026 · Fuente: ESPN
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    <div
                        style={{
                            padding: '14px 10px',
                            borderRadius: 13,
                            background: V2.posSoft,
                            border: `1px solid ${V2.pos}`,
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: V2.pos }}>Barcelona</div>
                        <Mono size={12.5} color={V2.pos}>1.23x</Mono>
                    </div>
                    <div
                        style={{
                            padding: '14px 10px',
                            borderRadius: 13,
                            background: V2.card,
                            border: `1px solid ${V2.hair}`,
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: V2.t3 }}>Sevilla</div>
                        <Mono size={12.5} color={V2.t3}>5.43x</Mono>
                    </div>
                </div>

                <Card style={{ padding: 20, textAlign: 'center', ...riseIn(frame, 3, 14) }}>
                    <Label style={{ fontSize: 11.5, color: V2.t3, marginBottom: 8 }}>Tu apuesta</Label>
                    <div
                        style={{
                            fontSize: 46,
                            fontWeight: 700,
                            fontFamily: FONT_MONO,
                            letterSpacing: '-0.04em',
                            lineHeight: 1,
                        }}
                    >
                        ${stake}
                    </div>
                </Card>

                <Card accent style={{ marginTop: 14, ...riseIn(frame, 7, 14) }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: V2.t2 }}>Cobrás si acertás</span>
                        <Mono size={19} color={V2.accent}>
                            ${(parseFloat(stake) * 1.23).toFixed(2)}
                        </Mono>
                    </div>
                </Card>

                <div style={{ display: 'flex', gap: 7, marginTop: 14, ...riseIn(frame, 9, 12) }}>
                    <Pill label="0% comisión de apertura" tone="pos" />
                </div>

                <div style={{ marginTop: 18 }}>
                    <SlideBet p={slide} />
                </div>
            </div>
            <FootNote icon="↩️">
                Podés vender tu posición en cualquier momento antes del cierre.
            </FootNote>
        </Screen>
    );
};

const SlideBet: React.FC<{ p: number }> = ({ p }) => (
    <div
        style={{
            position: 'relative',
            height: 54,
            borderRadius: 16,
            background: V2.card,
            border: `1px solid ${V2.hair2}`,
            overflow: 'hidden',
        }}
    >
        <div style={{ position: 'absolute', inset: 0, background: V2.accentSoft, width: `${p * 100}%` }} />
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
            }}
        >
            Deslizá para apostar
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

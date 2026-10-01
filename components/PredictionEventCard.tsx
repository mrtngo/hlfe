'use client';

/**
 * PredictionEventCard — one event on the predictions board.
 *
 * The old board rendered one flat row per outcome, so a six-team Premier
 * League question ate six rows and a BTC price ladder ate ten, all labelled
 * with bare odds multipliers. Outcome.xyz and Polymarket both solve this the
 * same way and it's the right shape: ONE card per event, with the competing
 * outcomes listed inside it and ranked by probability.
 *
 * Two variants:
 *  - binary  (one market, two sides) → two big side buttons, each carrying the
 *            probability and what a winning bet pays.
 *  - list    (a question's contenders, or a price ladder's rungs) → a ranked
 *            row per outcome with a probability bar; long lists collapse to
 *            the top four behind a "show all".
 *
 * Every card carries the three facts a beginner needs before betting and the
 * old one never showed: when it closes, how much it trades, and — when we can
 * match the question exactly — what Polymarket's much deeper book says the
 * odds are. See lib/predictions/polymatch.ts for why that match is strict.
 */

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { localizeSideName, oddsMultiplier, type OutcomeMarketView } from '@/lib/hyperliquid/outcome';
import type { OutcomeStat } from '@/hooks/usePredictionInsights';
import type { PolyMatch } from '@/lib/predictions/polymatch';
import { V2 } from '@/components/V2Kit';
import { haptic } from '@/lib/haptics';

/** Rows shown before the list collapses behind "ver todos". */
const COLLAPSED_ROWS = 4;

export interface PredictionGroup {
    key: string;
    name: string;
    markets: OutcomeMarketView[];
    /** Set only when every market in the group came from the same deployer. */
    venueName?: string;
}

export interface HeldSide {
    outcomeId: number;
    sideIdx: number;
    amount: number;
}

interface Props {
    group: PredictionGroup;
    stats: Record<number, OutcomeStat>;
    poly: Record<number, PolyMatch>;
    /** Contracts held, keyed `${outcomeId}:${sideIdx}`. */
    held: Record<string, HeldSide>;
    onBet: (outcomeId: number, sideIdx: number) => void;
}

/* ── formatting helpers ─────────────────────────────────────────── */

/**
 * Compact USD volume — "$1,4M", "$840k", "$120".
 *
 * Deliberately NOT run through the app's currency conversion: this is exchange
 * turnover, not the user's money, and "$5.880.000.000 COP" of volume on a card
 * reads as a balance and alarms people. Kept in USD like every venue shows it.
 */
export function formatVolume(v: number, language: string): string {
    const dec = language === 'es' ? ',' : '.';
    const fmt = (n: number, d: number) => n.toFixed(d).replace('.', dec);
    if (!Number.isFinite(v) || v <= 0) return '—';
    if (v >= 1_000_000) return `$${fmt(v / 1_000_000, 1)}M`;
    if (v >= 1_000) return `$${fmt(v / 1_000, v >= 10_000 ? 0 : 1)}k`;
    return `$${Math.round(v)}`;
}

/** "2d 4h" / "3h 12m" / "8 min" / "cerrando" — how long is left to bet. */
export function formatCountdown(close: Date | null, now: number, language: string): string | null {
    if (!close) return null;
    const ms = close.getTime() - now;
    if (ms <= 0) return language === 'es' ? 'cerrando' : 'closing';
    const mins = Math.floor(ms / 60_000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days >= 1) return `${days}d ${hours % 24}h`;
    if (hours >= 1) return `${hours}h ${mins % 60}m`;
    return `${mins} min`;
}

/**
 * The one-line activity read for a card: real 24h turnover when we have it,
 * resting liquidity otherwise, and an honest "nothing here" when neither is
 * meaningful. Only the deepest markets get candle data (see the stats route),
 * so most cards land on the depth branch.
 */
function activityText(
    stat: OutcomeStat | undefined,
    t: ReturnType<typeof useLanguage>['t'],
    language: string,
): { text: string; quiet: boolean } {
    const vol = stat?.v ?? 0;
    if (vol > 0) {
        return { text: t.outcomeMarkets.volume24h.replace('{amount}', formatVolume(vol, language)), quiet: false };
    }
    const depth = stat?.d ?? 0;
    if (depth < 200) return { text: t.outcomeMarkets.quietMarket, quiet: true };
    return {
        text: t.outcomeMarkets.liquidityLabel.replace('{amount}', formatVolume(depth, language)),
        quiet: false,
    };
}

/** Probability as a whole percent, or null when the side has no price. */
function pct(mid: number): number | null {
    if (!mid || mid <= 0 || mid >= 1) return null;
    return Math.round(mid * 100);
}

/* ── shared bits ────────────────────────────────────────────────── */

/** Thin probability track. Neutral gold for contenders, tinted for Yes/No. */
function ProbBar({ mid, color }: { mid: number; color: string }) {
    const width = Math.max(2, Math.min(100, (mid || 0) * 100));
    return (
        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ width: `${width}%`, height: '100%', background: color, borderRadius: 99 }} />
        </div>
    );
}

/** Last 24h of implied probability, drawn from the stats route's hourly closes. */
function OddsSpark({ points, color }: { points: number[]; color: string }) {
    if (!points || points.length < 4) return null;
    const w = 52;
    const h = 18;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;
    const d = points
        .map((p, i) => {
            const x = (i / (points.length - 1)) * w;
            const y = h - ((p - min) / span) * h;
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ');
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}>
            <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/**
 * Polymarket's price on the same question.
 *
 * Framed as a second opinion, never as a target: our book can legitimately
 * differ. The gap is spelled out because that's the whole point of showing it.
 */
function PolyReference({ match, ourMid }: { match: PolyMatch; ourMid: number }) {
    const { t } = useLanguage();
    const theirs = Math.round(match.yes * 100);
    const ours = pct(ourMid);
    const gap = ours === null ? null : theirs - ours;
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                marginTop: 10,
                paddingTop: 10,
                borderTop: `1px solid ${V2.hair}`,
                fontSize: 11,
                color: V2.t3,
            }}
        >
            <span
                style={{
                    padding: '2px 6px',
                    borderRadius: 5,
                    background: 'rgba(255,255,255,0.05)',
                    fontWeight: 700,
                    color: V2.t2,
                    flexShrink: 0,
                }}
            >
                Polymarket
            </span>
            <span className="font-mono" style={{ fontWeight: 700, color: V2.t2 }}>
                {theirs}%
            </span>
            {gap !== null && Math.abs(gap) >= 2 && (
                <span className="font-mono" style={{ color: gap > 0 ? V2.pos : V2.neg, fontWeight: 700 }}>
                    {gap > 0 ? '+' : ''}
                    {gap} pts
                </span>
            )}
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.outcomeMarkets.polyNote}
            </span>
        </div>
    );
}

/** Subject · closes-in · 24h volume. The context strip on every card (venue
 *  names like "Skew" / "Trade.xyz" meant nothing to beginners — dropped). */
function MetaRow({
    market,
    stat,
    now,
}: {
    market: OutcomeMarketView;
    stat: OutcomeStat | undefined;
    venueName?: string;
    now: number;
}) {
    const { t, language } = useLanguage();
    const countdown = formatCountdown(market.closeTime, now, language);
    const activity = activityText(stat, t, language);
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                fontSize: 11.5,
                color: V2.t3,
                fontWeight: 600,
            }}
        >
            {market.subject && (
                <span
                    style={{
                        padding: '2px 7px',
                        borderRadius: 99,
                        background: V2.accentSoft,
                        color: V2.accent,
                        fontWeight: 700,
                    }}
                >
                    {market.subject}
                </span>
            )}
            {countdown && (
                <span>
                    {/* Past the deadline it's settling — "Cierra en cerrando" read as a bug */}
                    {market.closeTime && market.closeTime.getTime() <= now
                        ? (language === 'es' ? 'Cerrando' : 'Closing')
                        : t.outcomeMarkets.closesIn.replace('{time}', countdown)}
                </span>
            )}
            <span style={{ color: activity.quiet ? V2.t3 : V2.t2 }}>
                {activity.text}
            </span>
        </div>
    );
}

/* ── variants ───────────────────────────────────────────────────── */

/** One market, two sides: the "¿Sí o no?" shape. */
function BinaryBody({
    market,
    stat,
    poly,
    held,
    onBet,
    now,
}: {
    market: OutcomeMarketView;
    stat: OutcomeStat | undefined;
    poly: PolyMatch | undefined;
    held: Record<string, HeldSide>;
    onBet: (outcomeId: number, sideIdx: number) => void;
    now: number;
}) {
    const { t, language } = useLanguage();
    return (
        <>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: V2.t1, marginBottom: 8 }}>
                {market.name}
            </div>
            <MetaRow market={market} stat={stat} venueName={market.venueName} now={now} />

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {market.sides.slice(0, 2).map((side, idx) => {
                    const color = idx === 0 ? V2.pos : V2.neg;
                    const soft = idx === 0 ? V2.posSoft : V2.negSoft;
                    const p = pct(side.mid);
                    const mine = held[`${market.outcomeId}:${idx}`];
                    return (
                        <button
                            key={idx}
                            onClick={() => {
                                haptic.light();
                                onBet(market.outcomeId, idx);
                            }}
                            style={{
                                flex: 1,
                                padding: '11px 12px',
                                borderRadius: 12,
                                border: `1px solid ${idx === 0 ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.28)'}`,
                                background: soft,
                                cursor: 'pointer',
                                fontFamily: V2.ui,
                                textAlign: 'left',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 3,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color }}>
                                    {localizeSideName(side.name, language)}
                                </span>
                                <span className="font-mono" style={{ fontSize: 17, fontWeight: 800, color }}>
                                    {p === null ? '—' : `${p}%`}
                                </span>
                            </div>
                            <span className="font-mono" style={{ fontSize: 10.5, color: V2.t3, fontWeight: 600 }}>
                                {t.outcomeMarkets.paysMultiplier.replace('{x}', oddsMultiplier(side.mid))}
                            </span>
                            {mine && (
                                <span className="font-mono" style={{ fontSize: 10, color, fontWeight: 700 }}>
                                    {t.outcomeMarkets.youHaveN.replace('{n}', mine.amount.toFixed(0))}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {poly && <PolyReference match={poly} ourMid={market.sides[0]?.mid ?? 0} />}
        </>
    );
}

/** A row inside a contender list — one team, or one rung of a price ladder. */
function ContenderRow({
    label,
    mid,
    spark,
    poly,
    mine,
    onClick,
}: {
    label: string;
    mid: number;
    spark: number[] | undefined;
    poly: PolyMatch | undefined;
    mine: HeldSide | undefined;
    onClick: () => void;
}) {
    const { t } = useLanguage();
    const p = pct(mid);
    return (
        <button
            onClick={() => {
                haptic.light();
                onClick();
            }}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 0',
                background: 'transparent',
                border: 'none',
                borderTop: `1px solid ${V2.hair}`,
                cursor: 'pointer',
                fontFamily: V2.ui,
                textAlign: 'left',
            }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: V2.t1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 5,
                    }}
                >
                    {label}
                </div>
                <ProbBar mid={mid} color={V2.accent} />
                {(poly || mine) && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 5, fontSize: 10, fontWeight: 700 }}>
                        {poly && (
                            <span className="font-mono" style={{ color: V2.t3 }}>
                                Polymarket {Math.round(poly.yes * 100)}%
                            </span>
                        )}
                        {mine && (
                            <span className="font-mono" style={{ color: V2.pos }}>
                                {t.outcomeMarkets.youHaveN.replace('{n}', mine.amount.toFixed(0))}
                            </span>
                        )}
                    </div>
                )}
            </div>
            {spark && <OddsSpark points={spark} color={V2.t3} />}
            <span
                className="font-mono"
                style={{ fontSize: 16, fontWeight: 800, color: V2.t1, minWidth: 44, textAlign: 'right' }}
            >
                {p === null ? '—' : `${p}%`}
            </span>
        </button>
    );
}

/**
 * A row's identity, whichever shape the event has: one contender market of a
 * question / ladder, or one side of a single multi-way market (a football
 * match's Home / Draw / Away all live on one outcome).
 */
interface Row {
    key: string;
    label: string;
    outcomeId: number;
    sideIdx: number;
    mid: number;
}

function buildRows(group: PredictionGroup, language: string): Row[] {
    if (group.markets.length > 1) {
        return group.markets.map((m) => ({
            key: String(m.outcomeId),
            label: m.groupLabel,
            outcomeId: m.outcomeId,
            sideIdx: 0,
            mid: m.sides[0]?.mid ?? 0,
        }));
    }
    const m = group.markets[0];
    return m.sides.map((side, idx) => ({
        key: `${m.outcomeId}:${idx}`,
        label: localizeSideName(side.name, language),
        outcomeId: m.outcomeId,
        sideIdx: idx,
        mid: side.mid,
    }));
}

/** A question's contenders, a ladder's rungs, or a three-way market's sides. */
function ListBody({ group, stats, poly, held, onBet, now }: Props & { now: number }) {
    const { t, language } = useLanguage();
    const [expanded, setExpanded] = useState(false);
    const lead = group.markets[0];
    // Roll the members up: an event is as active as its contenders combined.
    const totalVol = group.markets.reduce((s, m) => s + (stats[m.outcomeId]?.v || 0), 0);
    const totalDepth = group.markets.reduce((s, m) => s + (stats[m.outcomeId]?.d || 0), 0);
    const all = buildRows(group, language);
    const rows = expanded ? all : all.slice(0, COLLAPSED_ROWS);
    const hidden = all.length - rows.length;

    return (
        <>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: V2.t1, marginBottom: 8 }}>
                {group.name}
            </div>
            <MetaRow
                market={lead}
                stat={{ d: totalDepth, v: totalVol > 0 ? totalVol : undefined }}
                venueName={group.venueName}
                now={now}
            />

            <div style={{ marginTop: 10 }}>
                {rows.map((r) => (
                    <ContenderRow
                        key={r.key}
                        label={r.label}
                        mid={r.mid}
                        spark={r.sideIdx === 0 ? stats[r.outcomeId]?.s : undefined}
                        poly={r.sideIdx === 0 ? poly[r.outcomeId] : undefined}
                        mine={held[`${r.outcomeId}:${r.sideIdx}`]}
                        onClick={() => onBet(r.outcomeId, r.sideIdx)}
                    />
                ))}
            </div>

            {hidden > 0 && (
                <button
                    onClick={() => {
                        haptic.light();
                        setExpanded(true);
                    }}
                    style={{
                        marginTop: 8,
                        padding: '7px 0',
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: V2.accent,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: V2.ui,
                    }}
                >
                    {t.outcomeMarkets.showAll.replace('{n}', String(all.length))}
                </button>
            )}
        </>
    );
}

/* ── card ───────────────────────────────────────────────────────── */

export default function PredictionEventCard(props: Props & { now: number }) {
    const { group, stats, poly, held, onBet, now } = props;
    const single = group.markets.length === 1;
    const lead = group.markets[0];
    if (!lead) return null;

    return (
        <div
            style={{
                padding: '14px 15px',
                background: V2.card,
                border: `1px solid ${V2.hair}`,
                borderRadius: 16,
                fontFamily: V2.ui,
            }}
        >
            {single && lead.sides.length === 2 ? (
                <BinaryBody
                    market={lead}
                    stat={stats[lead.outcomeId]}
                    poly={poly[lead.outcomeId]}
                    held={held}
                    onBet={onBet}
                    now={now}
                />
            ) : (
                <ListBody group={group} stats={stats} poly={poly} held={held} onBet={onBet} now={now} />
            )}
        </div>
    );
}

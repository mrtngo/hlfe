'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { History } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useOutcomeMarkets } from '@/hooks/useOutcomeMarkets';
import { parseCoinRef } from '@/lib/hyperliquid/outcome';
import { useCurrency } from '@/context/CurrencyContext';
import EmptyState from '@/components/EmptyState';
import SkeletonRow from '@/components/SkeletonRow';
import { ScreenV2, V2Header, IconBtn, MarketLogo, Icon, V2 } from '@/components/V2Kit';

interface OrderHistoryEntry {
    id: string;
    type: 'closed' | 'open' | 'deposit';
    side?: 'long' | 'short';
    symbol?: string;
    entryPrice?: number;
    exitPrice?: number;
    pnl?: number;
    size?: number;
    time: number;
    leverage?: number;
    amount?: number;
    /** Prediction-market fill: human-readable bet name (vs. raw "#2440"). */
    outcomeLabel?: string;
    /** Prediction-market side label (e.g. "Sí" / "No"). */
    outcomeSide?: string;
}

type Tab = 'all' | 'closed' | 'open' | 'deposits';

const LEVERAGE_STORAGE_KEY = 'rayo_leverage_by_symbol';
const MS_DAY = 24 * 60 * 60 * 1000;

export default function OrderHistory() {
    const { t, language } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { address, fills, userDataLoading, positions } = useHyperliquid();
    const { markets: outcomeMarkets } = useOutcomeMarkets();
    const [tab, setTab] = useState<Tab>('all');

    const outcomeById = useMemo(() => {
        const m = new Map<number, (typeof outcomeMarkets)[number]>();
        for (const om of outcomeMarkets) m.set(om.outcomeId, om);
        return m;
    }, [outcomeMarkets]);

    const leverageBySymbol = useRef<Record<string, number>>({});
    const initialized = useRef(false);
    if (!initialized.current && typeof window !== 'undefined') {
        try {
            leverageBySymbol.current = JSON.parse(localStorage.getItem(LEVERAGE_STORAGE_KEY) || '{}');
        } catch { /* ignore */ }
        initialized.current = true;
    }

    useEffect(() => {
        if (positions.length === 0) return;
        let updated = false;
        for (const pos of positions) {
            if (pos.leverage && leverageBySymbol.current[pos.symbol] !== pos.leverage) {
                leverageBySymbol.current[pos.symbol] = pos.leverage;
                updated = true;
            }
        }
        if (updated && typeof window !== 'undefined') {
            localStorage.setItem(LEVERAGE_STORAGE_KEY, JSON.stringify(leverageBySymbol.current));
        }
    }, [positions]);

    const entries = useMemo<OrderHistoryEntry[]>(() => {
        const fromFills = (fills || []).map((fill: any, idx: number) => {
            const rawCoin = fill.coin || '';
            const coin = rawCoin.replace('-PERP', '').replace('xyz:', '') || 'UNKNOWN';
            const symbol = `${coin}-USD`;
            const px = parseFloat(fill.px || '0');
            const size = parseFloat(fill.sz || '0');
            const isBuy = fill.side === 'B' || fill.dir === 'Open Long' || fill.dir === 'Close Short';
            const side: 'long' | 'short' = isBuy ? 'long' : 'short';
            const closedPnl = parseFloat(fill.closedPnl || '0');
            const isClose = closedPnl !== 0;

            // Prediction-market fills carry a "#{outcome}{side}" coin instead of
            // a ticker. Resolve it to the bet's event + side name.
            let outcomeLabel: string | undefined;
            let outcomeSide: string | undefined;
            const ref = parseCoinRef(rawCoin);
            if (ref) {
                const om = outcomeById.get(ref.outcomeId);
                if (om) {
                    outcomeLabel =
                        om.questionId != null && om.name !== om.eventName
                            ? `${om.eventName}: ${om.name}`
                            : om.eventName || om.name;
                    outcomeSide = om.sides[ref.sideIdx]?.name;
                } else {
                    outcomeLabel = `#${ref.outcomeId}`;
                }
            }

            return {
                id: `${fill.oid || fill.tid || idx}-${fill.time}`,
                type: isClose ? ('closed' as const) : ('open' as const),
                side,
                symbol,
                entryPrice: px,
                exitPrice: px,
                pnl: closedPnl,
                size,
                time: fill.time || Date.now(),
                leverage: leverageBySymbol.current[symbol],
                outcomeLabel,
                outcomeSide,
            };
        });
        return fromFills.sort((a, b) => b.time - a.time);
    }, [fills, outcomeById]);

    const summary = useMemo(() => {
        const cutoff = Date.now() - 30 * MS_DAY;
        const recent = entries.filter((e) => e.time >= cutoff && e.type === 'closed');
        const totalPnl = recent.reduce((s, e) => s + (e.pnl || 0), 0);
        const wins = recent.filter((e) => (e.pnl || 0) > 0).length;
        const total = recent.length;
        const winRate = total ? (wins / total) * 100 : 0;
        const fees = 0; // no fee field on fills here
        return { totalPnl, wins, total, winRate, fees };
    }, [entries]);

    const filtered = useMemo(() => {
        if (tab === 'all') return entries;
        return entries.filter((e) => {
            if (tab === 'deposits') return e.type === 'deposit';
            return e.type === tab;
        });
    }, [entries, tab]);

    const grouped = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today.getTime() - MS_DAY);
        const groups: { label: string; items: OrderHistoryEntry[] }[] = [];
        const monthLabel = (d: Date) => {
            const months = language === 'es'
                ? ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
                : ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            return `${d.getDate()} ${months[d.getMonth()]}`;
        };
        filtered.forEach((e) => {
            const d = new Date(e.time);
            d.setHours(0, 0, 0, 0);
            let label: string;
            if (d.getTime() === today.getTime()) label = t.screens.historial.groups.today;
            else if (d.getTime() === yesterday.getTime()) label = t.screens.historial.groups.yesterday.replace('{date}', monthLabel(new Date(e.time)));
            else label = monthLabel(new Date(e.time));
            const last = groups[groups.length - 1];
            if (last && last.label === label) last.items.push(e);
            else groups.push({ label, items: [e] });
        });
        return groups;
    }, [filtered, language, t]);

    if (!address) {
        return (
            <ScreenV2 pad={0}>
                <V2Header title={t.screens.historial.title.replace(/\.$/, '')} />
                <div style={{ padding: '24px 20px' }}>
                    <EmptyState icon={History} title={t.history.connectWalletToView} />
                </div>
            </ScreenV2>
        );
    }

    return (
        <ScreenV2 pad={0}>
            <V2Header title={t.screens.historial.title.replace(/\.$/, '')} right={<IconBtn name="arrowDownLeft" />} />

            {/* Summary */}
            <div style={{ padding: '8px 20px 0' }}>
                <div className="v2-card" style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 12.5, color: V2.t3, fontWeight: 600 }}>{t.screens.historial.summary} · 30d</div>
                            <div style={{ fontSize: 30, fontWeight: 800, marginTop: 6, color: summary.totalPnl >= 0 ? V2.pos : V2.neg, letterSpacing: '-0.02em', fontFamily: V2.ui }}>
                                {summary.totalPnl >= 0 ? '+' : '-'}{formatCurrency(Math.abs(summary.totalPnl))}
                            </div>
                        </div>
                        <span style={{ padding: '5px 10px', borderRadius: 99, background: V2.posSoft, color: V2.pos, fontFamily: V2.mono, fontWeight: 700, fontSize: 12.5 }}>
                            {t.screens.historial.wins.replace('{wins}', summary.wins.toString()).replace('{total}', summary.total.toString())}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
                        {[
                            { l: t.screens.historial.stats.trades, v: summary.total.toString() },
                            { l: t.screens.historial.stats.winRate, v: `${summary.winRate.toFixed(0)}%` },
                            { l: t.screens.historial.stats.fees, v: formatCurrency(summary.fees, 2) },
                        ].map((s) => (
                            <div key={s.l} style={{ flex: 1 }}>
                                <div style={{ fontSize: 11.5, color: V2.t3, fontWeight: 600 }}>{s.l}</div>
                                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 3, fontFamily: V2.mono }}>{s.v}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="v2-noscroll" style={{ display: 'flex', gap: 8, padding: '16px 20px 0', overflowX: 'auto' }}>
                {(['all', 'closed', 'open', 'deposits'] as Tab[]).map((k) => {
                    const on = tab === k;
                    return (
                        <button
                            key={k}
                            onClick={() => setTab(k)}
                            style={{ padding: '8px 14px', borderRadius: 99, cursor: 'pointer', fontFamily: V2.ui, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', border: on ? `1px solid ${V2.accent}` : `1px solid ${V2.hair}`, background: on ? V2.accentSoft : 'transparent', color: on ? V2.accent : V2.t3 }}
                        >
                            {t.screens.historial.tabs[k]}
                        </button>
                    );
                })}
            </div>

            {/* Groups */}
            <div style={{ padding: '20px 20px 0' }}>
                {userDataLoading ? (
                    <SkeletonRow count={6} height={64} />
                ) : grouped.length === 0 ? (
                    <EmptyState icon={History} title={t.screens.historial.empty.title} body={t.screens.historial.empty.body} cta={t.screens.historial.empty.cta} />
                ) : (
                    grouped.map((g, gi) => (
                        <div key={`${g.label}-${gi}`} style={{ marginBottom: 18 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: V2.t3, marginBottom: 10 }}>{g.label}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {g.items.map((e, i) => (
                                    <HistoryRowV2 key={`${e.id}-${i}`} entry={e} formatCurrency={formatCurrency} t={t} />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </ScreenV2>
    );
}

function HistoryRowV2({
    entry,
    formatCurrency,
    t,
}: {
    entry: OrderHistoryEntry;
    formatCurrency: (v: number, dp?: number) => string;
    t: any;
}) {
    const timeStr = new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isOutcome = !!entry.outcomeLabel;
    const ticker = isOutcome
        ? entry.outcomeLabel!
        : entry.symbol?.replace(/-USD$/, '').replace(/-PERP$/, '') || '';
    const isLong = entry.side === 'long';
    const positive = (entry.pnl || 0) >= 0;
    const isClose = entry.type === 'closed';
    const isOpen = entry.type === 'open';

    if (entry.type === 'deposit') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 14, background: 'rgba(250,204,21,0.05)', border: '1px solid rgba(250,204,21,0.14)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: V2.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="plus" size={17} color={V2.accent} strokeWidth={2.6} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{t.screens.historial.row.deposit}</div>
                    <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 1 }}>{timeStr}</div>
                </div>
                <div style={{ fontFamily: V2.mono, fontWeight: 700, color: V2.accent }}>+{formatCurrency(entry.amount || 0)}</div>
            </div>
        );
    }

    return (
        <div className="v2-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 14 }}>
            <MarketLogo sym={entry.symbol || 'USDC'} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        {isClose ? t.screens.historial.row.closed.replace('{symbol}', ticker) : t.screens.historial.row.opened.replace('{symbol}', ticker)}
                    </span>
                    {isOutcome && entry.outcomeSide ? (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: V2.accentSoft, color: V2.accent }}>
                            {entry.outcomeSide.toUpperCase()}
                        </span>
                    ) : entry.side && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: isLong ? V2.posSoft : V2.negSoft, color: isLong ? V2.pos : V2.neg }}>
                            {isLong ? 'LONG' : 'SHORT'}{entry.leverage ? ` ${entry.leverage}x` : ''}
                        </span>
                    )}
                </div>
                <div style={{ fontSize: 12, color: V2.t3, marginTop: 2, fontFamily: V2.mono, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {(entry.size || 0).toFixed(4)} @ {formatCurrency(entry.entryPrice || 0)} · {timeStr}
                </div>
            </div>
            {isOpen ? (
                <span style={{ fontSize: 11, color: V2.accent, fontWeight: 800, letterSpacing: '0.04em' }}>{t.screens.historial.row.open}</span>
            ) : (
                <span style={{ fontFamily: V2.mono, fontWeight: 800, fontSize: 15, color: positive ? V2.pos : V2.neg }}>
                    {positive ? '+' : '-'}{formatCurrency(Math.abs(entry.pnl || 0))}
                </span>
            )}
        </div>
    );
}

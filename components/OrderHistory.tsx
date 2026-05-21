'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Download, History } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useCurrency } from '@/context/CurrencyContext';
import TokenLogo from '@/components/TokenLogo';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/EmptyState';
import SkeletonRow from '@/components/SkeletonRow';

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
}

type Tab = 'all' | 'closed' | 'open' | 'deposits';

const LEVERAGE_STORAGE_KEY = 'rayo_leverage_by_symbol';
const MS_DAY = 24 * 60 * 60 * 1000;

export default function OrderHistory() {
    const { t, language } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { address, fills, userDataLoading, positions } = useHyperliquid();
    const [tab, setTab] = useState<Tab>('all');

    const leverageBySymbol = useRef<Record<string, number>>({});
    const initialized = useRef(false);
    if (!initialized.current && typeof window !== 'undefined') {
        try {
            leverageBySymbol.current = JSON.parse(
                localStorage.getItem(LEVERAGE_STORAGE_KEY) || '{}',
            );
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
            localStorage.setItem(
                LEVERAGE_STORAGE_KEY,
                JSON.stringify(leverageBySymbol.current),
            );
        }
    }, [positions]);

    const entries = useMemo<OrderHistoryEntry[]>(() => {
        const fromFills = (fills || []).map((fill: any, idx: number) => {
            const coin = fill.coin?.replace('-PERP', '').replace('xyz:', '') || 'UNKNOWN';
            const symbol = `${coin}-USD`;
            const price = parseFloat(fill.px || '0');
            const size = parseFloat(fill.sz || '0');
            const isBuy =
                fill.side === 'B' || fill.dir === 'Open Long' || fill.dir === 'Close Short';
            const side: 'long' | 'short' = isBuy ? 'long' : 'short';
            const closedPnl = parseFloat(fill.closedPnl || '0');
            const isClose = closedPnl !== 0;
            return {
                id: `${fill.oid || fill.tid || idx}-${fill.time}`,
                type: isClose ? ('closed' as const) : ('open' as const),
                side,
                symbol,
                entryPrice: price,
                exitPrice: price,
                pnl: closedPnl,
                size,
                time: fill.time || Date.now(),
                leverage: leverageBySymbol.current[symbol],
            };
        });
        return fromFills.sort((a, b) => b.time - a.time);
    }, [fills]);

    const summary = useMemo(() => {
        const cutoff = Date.now() - 30 * MS_DAY;
        const recent = entries.filter((e) => e.time >= cutoff && e.type === 'closed');
        const totalPnl = recent.reduce((s, e) => s + (e.pnl || 0), 0);
        const wins = recent.filter((e) => (e.pnl || 0) > 0).length;
        const total = recent.length;
        const winRate = total ? (wins / total) * 100 : 0;
        const fees = recent.reduce((s) => s + 0, 0); // no fee field on fills here
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
            else if (d.getTime() === yesterday.getTime())
                label = t.screens.historial.groups.yesterday.replace('{date}', monthLabel(new Date(e.time)));
            else label = monthLabel(new Date(e.time));
            const last = groups[groups.length - 1];
            if (last && last.label === label) last.items.push(e);
            else groups.push({ label, items: [e] });
        });
        return groups;
    }, [filtered, language, t]);

    if (!address) {
        return (
            <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
                <ScreenHeader title={t.screens.historial.title} large italic />
                <EmptyState
                    icon={History}
                    title={t.history.connectWalletToView}
                />
            </div>
        );
    }

    return (
        <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
            <ScreenHeader
                title={t.screens.historial.title}
                large
                italic
                right={
                    <button
                        type="button"
                        aria-label="Download CSV"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.02)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <Download size={14} color="rgba(255,255,255,0.7)" />
                    </button>
                }
            />

            {/* Summary */}
            <div style={{ padding: '12px 6px 0' }}>
                <div
                    style={{
                        padding: 20,
                        borderRadius: 22,
                        background: 'linear-gradient(165deg, #16120D 0%, #0B0907 100%)',
                        border: '1px solid rgba(255,255,255,0.07)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 12,
                        }}
                    >
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: 10,
                                    color: 'rgba(255,255,255,0.5)',
                                    letterSpacing: '0.22em',
                                    textTransform: 'uppercase',
                                    fontWeight: 700,
                                    marginBottom: 8,
                                }}
                            >
                                {t.screens.historial.summary}
                            </div>
                            <div
                                className="font-display tabular-mono"
                                style={{
                                    fontSize: 38,
                                    lineHeight: 1,
                                    fontWeight: 500,
                                    fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 500',
                                    letterSpacing: '-0.04em',
                                    color: summary.totalPnl >= 0
                                        ? 'var(--color-positive)'
                                        : 'var(--color-negative)',
                                }}
                            >
                                {summary.totalPnl >= 0 ? '+' : '-'}
                                {formatCurrency(Math.abs(summary.totalPnl))}
                            </div>
                        </div>
                        <span
                            className="tabular-mono"
                            style={{
                                fontSize: 11,
                                padding: '4px 8px',
                                borderRadius: 99,
                                background: 'rgba(250,204,21,0.08)',
                                border: '1px solid rgba(250,204,21,0.18)',
                                color: 'var(--color-brand-primary)',
                                fontWeight: 700,
                            }}
                        >
                            {t.screens.historial.wins
                                .replace('{wins}', summary.wins.toString())
                                .replace('{total}', summary.total.toString())}
                        </span>
                    </div>

                    <div
                        style={{
                            marginTop: 18,
                            paddingTop: 14,
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 8,
                        }}
                    >
                        <Stat
                            label={t.screens.historial.stats.trades}
                            value={summary.total.toString()}
                        />
                        <Stat
                            label={t.screens.historial.stats.winRate}
                            value={`${summary.winRate.toFixed(0)}%`}
                        />
                        <Stat
                            label={t.screens.historial.stats.fees}
                            value={formatCurrency(summary.fees, 2)}
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div
                className="snap-rail"
                style={{ marginTop: 18, padding: '4px 6px' }}
            >
                {(['all', 'closed', 'open', 'deposits'] as Tab[]).map((k) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setTab(k)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 99,
                            border: tab === k
                                ? '1px solid var(--color-brand-primary)'
                                : '1px solid rgba(255,255,255,0.08)',
                            background: tab === k
                                ? 'rgba(250,204,21,0.12)'
                                : 'rgba(255,255,255,0.02)',
                            color: tab === k ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            letterSpacing: '0.04em',
                        }}
                    >
                        {t.screens.historial.tabs[k]}
                    </button>
                ))}
            </div>

            {/* Body */}
            <div style={{ padding: '20px 6px 0' }}>
                {userDataLoading ? (
                    <SkeletonRow count={6} height={64} />
                ) : grouped.length === 0 ? (
                    <EmptyState
                        icon={History}
                        title={t.screens.historial.empty.title}
                        body={t.screens.historial.empty.body}
                        cta={t.screens.historial.empty.cta}
                    />
                ) : (
                    grouped.map((g, gi) => (
                        <div key={`${g.label}-${gi}`} style={{ marginBottom: 18 }}>
                            <div
                                className="font-display"
                                style={{
                                    fontStyle: 'italic',
                                    fontSize: 14,
                                    color: 'var(--color-text-secondary)',
                                    fontVariationSettings: '"opsz" 36, "SOFT" 100, "wght" 500',
                                    marginBottom: 6,
                                }}
                            >
                                {g.label}
                            </div>
                            {g.items.map((e, i) => (
                                <HistoryRow
                                    key={e.id}
                                    entry={e}
                                    last={i === g.items.length - 1}
                                    formatCurrency={formatCurrency}
                                    t={t}
                                />
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div
                style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.45)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                }}
            >
                {label}
            </div>
            <div
                className="tabular-mono"
                style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#fff',
                    marginTop: 4,
                }}
            >
                {value}
            </div>
        </div>
    );
}

function HistoryRow({
    entry,
    last,
    formatCurrency,
    t,
}: {
    entry: OrderHistoryEntry;
    last: boolean;
    formatCurrency: (v: number, dp?: number) => string;
    t: any;
}) {
    const time = new Date(entry.time);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ticker = entry.symbol?.replace(/-USD$/, '').replace(/-PERP$/, '') || '';
    const isLong = entry.side === 'long';
    const positive = (entry.pnl || 0) >= 0;
    const isClose = entry.type === 'closed';
    const isOpen = entry.type === 'open';

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)',
            }}
        >
            <TokenLogo symbol={entry.symbol || 'USDC'} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        flexWrap: 'wrap',
                    }}
                >
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#fff',
                        }}
                    >
                        {isClose
                            ? t.screens.historial.row.closed.replace('{symbol}', ticker)
                            : isOpen
                            ? t.screens.historial.row.opened.replace('{symbol}', ticker)
                            : t.screens.historial.row.deposit}
                    </div>
                    {(isClose || isOpen) && entry.side && (
                        <span
                            style={{
                                fontSize: 9,
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontWeight: 800,
                                letterSpacing: '0.08em',
                                background: isLong
                                    ? 'rgba(34,197,94,0.16)'
                                    : 'rgba(239,68,68,0.16)',
                                color: isLong
                                    ? 'var(--color-positive)'
                                    : 'var(--color-negative)',
                            }}
                        >
                            {isLong ? 'LONG' : 'SHORT'}
                            {entry.leverage ? ` ${entry.leverage}×` : ''}
                        </span>
                    )}
                </div>
                <div
                    className="tabular-mono"
                    style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.5)',
                        marginTop: 2,
                    }}
                >
                    {(entry.size || 0).toFixed(4)} @ {formatCurrency(entry.entryPrice || 0)} · {timeStr}
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                {isClose && entry.pnl !== undefined ? (
                    <div
                        className="tabular-mono"
                        style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: positive
                                ? 'var(--color-positive)'
                                : 'var(--color-negative)',
                        }}
                    >
                        {positive ? '+' : '-'}
                        {formatCurrency(Math.abs(entry.pnl))}
                    </div>
                ) : isOpen ? (
                    <div
                        style={{
                            fontSize: 9,
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: 'rgba(250,204,21,0.12)',
                            color: 'var(--color-brand-primary)',
                            fontWeight: 800,
                            letterSpacing: '0.1em',
                        }}
                    >
                        {t.screens.historial.row.open}
                    </div>
                ) : (
                    <div
                        className="tabular-mono"
                        style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: 'var(--color-brand-primary)',
                        }}
                    >
                        +{formatCurrency(entry.amount || 0)}
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

import { useMemo } from 'react';
import { Filter, ShoppingBag } from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { getTokenFullName } from '@/lib/constants';
import TokenLogo from '@/components/TokenLogo';
import ScreenHeader from '@/components/ScreenHeader';
import HairlineSection from '@/components/HairlineSection';
import EmptyState from '@/components/EmptyState';
import SkeletonRow from '@/components/SkeletonRow';

interface PortfolioScreenProps {
    onBack?: () => void;
    onBuyClick?: () => void;
    onTokenClick?: (symbol: string) => void;
}

// Donut color cycle
const DONUT_COLORS = ['#FACC15', '#22C55E', '#60A5FA', '#A78BFA', '#FB7185', '#F97316', '#10B981'];

export default function PortfolioScreen({ onBack, onBuyClick, onTokenClick }: PortfolioScreenProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { account, positions, userDataLoading } = useHyperliquid();

    const allocation = useMemo(() => {
        const total = (positions || []).reduce(
            (sum, p) => sum + Math.abs(p.size * p.markPrice),
            0,
        );
        if (total === 0) return { total: 0, slices: [] as { name: string; symbol: string; value: number; pct: number; color: string }[] };
        const slices = (positions || []).map((p, i) => {
            const value = Math.abs(p.size * p.markPrice);
            return {
                name: getTokenFullName(p.name || p.symbol.replace(/-USD$/, '').replace(/-PERP$/, '')),
                symbol: p.symbol,
                value,
                pct: (value / total) * 100,
                color: DONUT_COLORS[i % DONUT_COLORS.length],
            };
        }).sort((a, b) => b.value - a.value);
        return { total, slices };
    }, [positions]);

    const isLoading = userDataLoading;
    const isEmpty = !isLoading && (positions || []).length === 0;

    return (
        <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
            <ScreenHeader
                title={t.screens.portafolio.title}
                onBack={onBack}
                large
                italic
                right={
                    <button
                        type="button"
                        aria-label="Filter"
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
                        <Filter size={14} color="rgba(255,255,255,0.7)" />
                    </button>
                }
            />

            {/* Equity card */}
            <div style={{ padding: '12px 6px 0' }}>
                <div
                    style={{
                        position: 'relative',
                        padding: 22,
                        borderRadius: 24,
                        background: 'linear-gradient(165deg, #16120D 0%, #0B0907 100%)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        boxShadow: '0 24px 60px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
                    }}
                >
                    <div
                        style={{
                            fontSize: 10,
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.5)',
                            fontWeight: 700,
                            marginBottom: 8,
                        }}
                    >
                        {t.screens.portafolio.totalEquity}
                    </div>
                    <div
                        className="font-display tabular-mono"
                        style={{
                            fontSize: 50,
                            lineHeight: 0.95,
                            fontWeight: 500,
                            fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 500',
                            letterSpacing: '-0.04em',
                        }}
                    >
                        ${Math.floor(Math.abs(account.equity || 0)).toLocaleString('en-US')}
                        <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.4)' }}>
                            .{(Math.abs(account.equity || 0).toFixed(2).split('.')[1])}
                        </span>
                    </div>

                    <div
                        style={{
                            marginTop: 22,
                            paddingTop: 16,
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 10,
                        }}
                    >
                        <SubStat
                            label={t.screens.portafolio.stats.unrealizedPnl}
                            value={account.unrealizedPnl || 0}
                            colored
                            formatCurrency={formatCurrency}
                        />
                        <SubStat
                            label={t.screens.portafolio.stats.marginUsed}
                            value={account.usedMargin || 0}
                            formatCurrency={formatCurrency}
                        />
                        <SubStat
                            label={t.screens.portafolio.stats.available}
                            value={account.availableMargin || 0}
                            formatCurrency={formatCurrency}
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: '28px 6px 0' }}>
                    <SkeletonRow count={3} height={120} radius={18} />
                </div>
            ) : isEmpty ? (
                <EmptyState
                    icon={ShoppingBag}
                    title={t.screens.portafolio.empty.title}
                    body={t.screens.portafolio.empty.body}
                    cta={t.screens.portafolio.empty.cta}
                    onCtaClick={onBuyClick}
                />
            ) : (
                <>
                    {/* Distribution donut */}
                    {allocation.slices.length > 0 && (
                        <div style={{ padding: '36px 6px 0' }}>
                            <HairlineSection label={t.screens.portafolio.distribution} />
                            <div
                                style={{
                                    marginTop: 20,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 24,
                                }}
                            >
                                <Donut
                                    slices={allocation.slices.map((s) => ({
                                        value: s.value,
                                        color: s.color,
                                    }))}
                                    centerText={t.screens.portafolio.assets.replace(
                                        '{count}',
                                        allocation.slices.length.toString(),
                                    )}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {allocation.slices.slice(0, 6).map((s) => (
                                        <div
                                            key={s.symbol}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                paddingBottom: 8,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: 2,
                                                    background: s.color,
                                                }}
                                            />
                                            <div
                                                style={{
                                                    flex: 1,
                                                    minWidth: 0,
                                                    fontSize: 12,
                                                    color: '#fff',
                                                }}
                                            >
                                                {s.name}
                                            </div>
                                            <div
                                                className="tabular-mono"
                                                style={{
                                                    fontSize: 11,
                                                    color: 'var(--color-text-secondary)',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {s.pct.toFixed(1)}%
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Open positions */}
                    <div style={{ padding: '36px 6px 0' }}>
                        <HairlineSection
                            label={t.screens.portafolio.open}
                            right={
                                <span
                                    className="tabular-mono"
                                    style={{
                                        fontSize: 10,
                                        color: 'var(--color-text-tertiary)',
                                    }}
                                >
                                    {positions.length}
                                </span>
                            }
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                            {positions.map((p) => {
                                const up = p.unrealizedPnl >= 0;
                                const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';
                                const isLong = p.side === 'long';
                                const baseTicker = (p.name || p.symbol)
                                    .replace(/-USD$/, '')
                                    .replace(/-PERP$/, '');
                                const notional = Math.abs(p.size * p.markPrice);
                                return (
                                    <button
                                        type="button"
                                        key={p.symbol}
                                        onClick={() => onTokenClick?.(p.symbol)}
                                        style={{
                                            padding: 14,
                                            borderRadius: 18,
                                            background: isLong
                                                ? 'linear-gradient(140deg, rgba(34,197,94,0.07) 0%, rgba(255,255,255,0.015) 60%)'
                                                : 'linear-gradient(140deg, rgba(239,68,68,0.07) 0%, rgba(255,255,255,0.015) 60%)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            cursor: 'pointer',
                                            color: '#fff',
                                            textAlign: 'left',
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                            }}
                                        >
                                            <TokenLogo symbol={p.symbol} size={40} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'baseline',
                                                        gap: 8,
                                                    }}
                                                >
                                                    <div
                                                        className="font-display"
                                                        style={{
                                                            fontSize: 18,
                                                            fontWeight: 500,
                                                            fontVariationSettings:
                                                                '"opsz" 36, "SOFT" 40, "wght" 500',
                                                        }}
                                                    >
                                                        {getTokenFullName(baseTicker)}
                                                    </div>
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
                                                        {isLong ? 'LONG' : 'SHORT'} {p.leverage}×
                                                    </span>
                                                </div>
                                                <div
                                                    className="tabular-mono"
                                                    style={{
                                                        fontSize: 10.5,
                                                        color: 'rgba(255,255,255,0.5)',
                                                        marginTop: 3,
                                                    }}
                                                >
                                                    {p.size.toLocaleString('en-US', {
                                                        maximumFractionDigits: 4,
                                                    })}{' '}
                                                    {baseTicker}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div
                                                    className="tabular-mono"
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: 800,
                                                        color: cl,
                                                    }}
                                                >
                                                    {up ? '+' : '-'}
                                                    {formatCurrency(Math.abs(p.unrealizedPnl))}
                                                </div>
                                                <div
                                                    className="tabular-mono"
                                                    style={{
                                                        fontSize: 10.5,
                                                        color: cl,
                                                        opacity: 0.85,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {up ? '+' : ''}
                                                    {p.unrealizedPnlPercent.toFixed(2)}%
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                marginTop: 12,
                                                paddingTop: 12,
                                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(4, 1fr)',
                                                gap: 8,
                                            }}
                                        >
                                            <InlineStat
                                                label={t.screens.portafolio.positionStats.entry}
                                                value={formatCurrency(p.entryPrice)}
                                            />
                                            <InlineStat
                                                label={t.screens.portafolio.positionStats.mark}
                                                value={formatCurrency(p.markPrice)}
                                            />
                                            <InlineStat
                                                label={t.screens.portafolio.positionStats.liq}
                                                value={
                                                    p.liquidationPrice > 0
                                                        ? formatCurrency(p.liquidationPrice)
                                                        : '—'
                                                }
                                            />
                                            <InlineStat
                                                label={t.screens.portafolio.positionStats.notional}
                                                value={formatCurrency(notional, 0)}
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function SubStat({
    label,
    value,
    colored,
    formatCurrency,
}: {
    label: string;
    value: number;
    colored?: boolean;
    formatCurrency: (v: number, dp?: number) => string;
}) {
    const cl = colored
        ? value >= 0
            ? 'var(--color-positive)'
            : 'var(--color-negative)'
        : '#fff';
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
                    color: cl,
                    marginTop: 4,
                }}
            >
                {colored && value >= 0 ? '+' : ''}
                {colored && value < 0 ? '-' : ''}
                {formatCurrency(Math.abs(value || 0), 0)}
            </div>
        </div>
    );
}

function InlineStat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div
                style={{
                    fontSize: 8.5,
                    color: 'rgba(255,255,255,0.45)',
                    letterSpacing: '0.18em',
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
                    fontSize: 11,
                    color: '#E5E5E5',
                    marginTop: 3,
                }}
            >
                {value}
            </div>
        </div>
    );
}

function Donut({
    slices,
    centerText,
    size = 120,
    thickness = 18,
}: {
    slices: { value: number; color: string }[];
    centerText: string;
    size?: number;
    thickness?: number;
}) {
    const total = slices.reduce((s, x) => s + x.value, 0) || 1;
    const r = (size - thickness) / 2;
    const c = 2 * Math.PI * r;
    let acc = 0;
    return (
        <div
            style={{
                position: 'relative',
                width: size,
                height: size,
                flexShrink: 0,
            }}
        >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth={thickness}
                    fill="none"
                />
                {slices.map((s, i) => {
                    const len = (s.value / total) * c;
                    const offset = c - acc;
                    acc += len;
                    return (
                        <circle
                            key={i}
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            stroke={s.color}
                            strokeWidth={thickness}
                            fill="none"
                            strokeDasharray={`${len} ${c - len}`}
                            strokeDashoffset={offset}
                            transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        />
                    );
                })}
            </svg>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: 'var(--color-text-tertiary)',
                    letterSpacing: '0.16em',
                    fontWeight: 700,
                    textAlign: 'center',
                }}
            >
                {centerText}
            </div>
        </div>
    );
}

'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, Share2, Star } from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { getTokenFullName, STORAGE_KEYS } from '@/lib/constants';
import TokenLogo from '@/components/TokenLogo';
import TokenCandleChart from '@/components/TokenCandleChart';
import ScreenHeader from '@/components/ScreenHeader';
import HairlineSection from '@/components/HairlineSection';

interface TokenDetailProps {
    symbol: string;
    onBack: () => void;
    onBuy?: () => void;
    onTrade?: () => void;
}

export default function TokenDetail({ symbol, onBack, onBuy, onTrade }: TokenDetailProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { getMarket, markets, positions, setSelectedMarket } = useHyperliquid();

    const market = useMemo(() => getMarket(symbol) || (markets || []).find((m) => m.symbol === symbol || m.name === symbol), [symbol, getMarket, markets]);
    const ticker = (market?.name || symbol).replace(/-USD$/, '').replace(/-PERP$/, '');
    const fullName = getTokenFullName(ticker);
    const up = (market?.change24h || 0) >= 0;
    const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';

    const position = useMemo(
        () => (positions || []).find((p) => p.symbol === market?.symbol || p.symbol === symbol),
        [positions, market?.symbol, symbol],
    );

    const [isFav, setIsFav] = useState(false);

    if (!market) {
        return (
            <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
                <ScreenHeader title={symbol} onBack={onBack} italic={false} />
                <div style={{ padding: '60px 22px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                    No market data
                </div>
            </div>
        );
    }

    const stats = [
        { label: 'Vol 24h', value: `$${((market.volume24h || 0) / 1_000_000).toFixed(1)}M` },
        {
            label: 'Open Interest',
            value: `$${((market.openInterest || 0) / 1_000_000).toFixed(1)}M`,
        },
        {
            label: 'Funding',
            value: `${((market.fundingRate || 0) * 100).toFixed(3)}%`,
            color: (market.fundingRate || 0) >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
        },
        {
            label: t.markets.lev,
            value: `${market.maxLeverage || 20}×`,
        },
    ];

    return (
        <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
            <ScreenHeader
                title={`${fullName}.`}
                sub={ticker}
                onBack={onBack}
                large
                italic
                right={
                    <>
                        <button
                            type="button"
                            onClick={() => setIsFav((v) => !v)}
                            aria-label="Favorite"
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
                            <Star
                                size={14}
                                fill={isFav ? 'var(--color-brand-primary)' : 'none'}
                                color={isFav ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.7)'}
                            />
                        </button>
                        <button
                            type="button"
                            aria-label="Share"
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
                            <Share2 size={14} color="rgba(255,255,255,0.7)" />
                        </button>
                    </>
                }
            />

            {/* Hero */}
            <div style={{ padding: '12px 6px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
                <TokenLogo symbol={market.symbol} size={56} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        className="font-display tabular-mono"
                        style={{
                            fontSize: 40,
                            lineHeight: 1,
                            fontWeight: 500,
                            fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 500',
                            letterSpacing: '-0.03em',
                        }}
                    >
                        ${(market.price || 0).toLocaleString('en-US', {
                            maximumFractionDigits: (market.price || 0) < 1 ? 4 : 2,
                        })}
                    </div>
                    <div
                        className="tabular-mono"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 8,
                            padding: '4px 8px',
                            borderRadius: 99,
                            background: up ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)',
                            color: cl,
                            fontWeight: 700,
                            fontSize: 12,
                        }}
                    >
                        {up ? '+' : ''}
                        {(market.change24h || 0).toFixed(2)}% · 24h
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ padding: '20px 6px 0' }}>
                <TokenCandleChart
                    symbol={market.symbol}
                    isStock={market.isStock === true}
                    height={240}
                />
            </div>

            {/* Position */}
            {position && (
                <div style={{ padding: '24px 6px 0' }}>
                    <HairlineSection label={t.screens.tokenDetail.yourPosition} />
                    <div
                        style={{
                            marginTop: 14,
                            padding: 16,
                            borderRadius: 18,
                            background: position.side === 'long'
                                ? 'linear-gradient(140deg, rgba(34,197,94,0.08), rgba(255,255,255,0.015) 60%)'
                                : 'linear-gradient(140deg, rgba(239,68,68,0.08), rgba(255,255,255,0.015) 60%)',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'baseline',
                                gap: 8,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span
                                    style={{
                                        fontSize: 9,
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        fontWeight: 800,
                                        letterSpacing: '0.08em',
                                        background:
                                            position.side === 'long'
                                                ? 'rgba(34,197,94,0.18)'
                                                : 'rgba(239,68,68,0.18)',
                                        color:
                                            position.side === 'long'
                                                ? 'var(--color-positive)'
                                                : 'var(--color-negative)',
                                    }}
                                >
                                    {position.side === 'long' ? 'LONG' : 'SHORT'} {position.leverage}×
                                </span>
                                <span
                                    className="tabular-mono"
                                    style={{
                                        fontSize: 11,
                                        color: 'rgba(255,255,255,0.55)',
                                    }}
                                >
                                    {position.size.toLocaleString('en-US', {
                                        maximumFractionDigits: 4,
                                    })}{' '}
                                    {ticker} · {formatCurrency(position.entryPrice)}
                                </span>
                            </div>
                            <div
                                className="tabular-mono"
                                style={{
                                    fontSize: 18,
                                    fontWeight: 800,
                                    color:
                                        position.unrealizedPnl >= 0
                                            ? 'var(--color-positive)'
                                            : 'var(--color-negative)',
                                }}
                            >
                                {position.unrealizedPnl >= 0 ? '+' : '-'}
                                {formatCurrency(Math.abs(position.unrealizedPnl))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                            <ActionButton
                                label={t.screens.tokenDetail.actions.add}
                                onClick={() => {
                                    setSelectedMarket(market.symbol);
                                    onTrade?.();
                                }}
                            />
                            <ActionButton
                                label={t.screens.tokenDetail.actions.tp}
                                onClick={() => {
                                    setSelectedMarket(market.symbol);
                                    onTrade?.();
                                }}
                            />
                            <ActionButton
                                label={t.screens.tokenDetail.actions.close}
                                onClick={() => {
                                    setSelectedMarket(market.symbol);
                                    onTrade?.();
                                }}
                                variant="danger"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div style={{ padding: '28px 6px 0' }}>
                <HairlineSection label={t.screens.tokenDetail.stats} />
                <div
                    style={{
                        marginTop: 14,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 10,
                    }}
                >
                    {stats.map((s) => (
                        <div
                            key={s.label}
                            style={{
                                padding: 14,
                                borderRadius: 14,
                                background: 'rgba(255,255,255,0.025)',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 9,
                                    color: 'rgba(255,255,255,0.5)',
                                    letterSpacing: '0.18em',
                                    textTransform: 'uppercase',
                                    fontWeight: 700,
                                    marginBottom: 6,
                                }}
                            >
                                {s.label}
                            </div>
                            <div
                                className="tabular-mono"
                                style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: s.color || '#fff',
                                }}
                            >
                                {s.value}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sticky bottom action bar */}
            <div style={{ height: 100 }} />
            <div
                style={{
                    position: 'sticky',
                    bottom: 110,
                    left: 0,
                    right: 0,
                    padding: '12px 6px',
                    display: 'flex',
                    gap: 10,
                    background:
                        'linear-gradient(180deg, transparent, rgba(10,9,7,0.85) 60%)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 10,
                }}
            >
                <button
                    type="button"
                    onClick={() => {
                        setSelectedMarket(market.symbol);
                        onTrade?.();
                    }}
                    style={{
                        flex: '0 0 35%',
                        padding: '14px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    {t.screens.tokenDetail.cta.sell}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setSelectedMarket(market.symbol);
                        onBuy?.();
                    }}
                    style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: 14,
                        background:
                            'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                        border: 'none',
                        color: '#1A1304',
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow:
                            '0 1px 0 rgba(255,255,255,0.4) inset, 0 12px 28px -8px rgba(250,204,21,0.5)',
                        fontFamily: 'inherit',
                    }}
                >
                    <span>{t.screens.tokenDetail.cta.buy.replace('{symbol}', ticker)}</span>
                    <ArrowUpRight size={16} strokeWidth={2.6} />
                </button>
            </div>
        </div>
    );
}

function ActionButton({
    label,
    onClick,
    variant = 'default',
}: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger';
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: 10,
                background:
                    variant === 'danger'
                        ? 'rgba(239,68,68,0.12)'
                        : 'rgba(255,255,255,0.04)',
                border: variant === 'danger'
                    ? '1px solid rgba(239,68,68,0.25)'
                    : '1px solid rgba(255,255,255,0.08)',
                color: variant === 'danger' ? 'var(--color-negative)' : '#fff',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
            }}
        >
            {label}
        </button>
    );
}

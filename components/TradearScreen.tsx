'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown, Search } from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { usePreferences } from '@/hooks/usePreferences';
import { getTokenFullName } from '@/lib/constants';
import TokenLogo from '@/components/TokenLogo';
import TradingChart from '@/components/TradingChart';
import OrderPanel from '@/components/OrderPanel';
import AdvancedOrderPanel from '@/components/AdvancedOrderPanel';
import OrderBook from '@/components/OrderBook';
import MarketStats from '@/components/MarketStats';
import MarketSelectModal from '@/components/MarketSelectModal';
import ScreenHeader from '@/components/ScreenHeader';
import HairlineSection from '@/components/HairlineSection';
import ProToggle from '@/components/ProToggle';
import EmptyState from '@/components/EmptyState';

interface TradearScreenProps {
    onBack?: () => void;
}

export default function TradearScreen({ onBack }: TradearScreenProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { proMode, toggleProMode } = usePreferences();
    const { markets, selectedMarket, setSelectedMarket, getMarket } = useHyperliquid();
    const [showPicker, setShowPicker] = useState(false);

    const market = useMemo(() => {
        if (selectedMarket) return getMarket(selectedMarket);
        return (markets || [])[0];
    }, [selectedMarket, getMarket, markets]);

    if (!market) {
        return (
            <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
                <ScreenHeader title="Tradear." onBack={onBack} large italic />
                <EmptyState
                    title={t.screens.tradear.empty.title}
                    body={t.screens.tradear.empty.body}
                />
            </div>
        );
    }

    const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
    const up = (market.change24h || 0) >= 0;
    const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';

    if (proMode) {
        // PRO MODE — chart + orderbook + advanced order panel
        return (
            <div
                className="atmosphere-grid"
                style={{
                    minHeight: '100%',
                    color: '#fff',
                    fontFamily: 'var(--font-jetbrains), ui-monospace, monospace',
                    marginLeft: -16,
                    marginRight: -16,
                }}
            >
                {/* Compact market bar */}
                <div
                    style={{
                        padding: '12px 16px 10px',
                        borderBottom: '1px solid #1A1A1A',
                        background: 'linear-gradient(180deg, rgba(250,204,21,0.04), transparent)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back"
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #27272A',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.7)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowPicker(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid #27272A',
                            background: 'rgba(255,255,255,0.015)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            flex: 1,
                            minWidth: 0,
                        }}
                    >
                        <TokenLogo symbol={market.symbol} size={20} />
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{ticker}</span>
                        <span
                            style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}
                        >
                            -USD · Perp
                        </span>
                        <ChevronDown size={12} color="var(--color-text-tertiary)" />
                    </button>
                    <ProToggle pro={true} onClick={toggleProMode} />
                </div>

                {/* Price strip */}
                <div
                    style={{
                        padding: '8px 16px',
                        display: 'flex',
                        gap: 16,
                        alignItems: 'baseline',
                        borderBottom: '1px solid #1A1A1A',
                        background: '#000',
                        flexWrap: 'wrap',
                    }}
                >
                    <div
                        className="tabular-mono"
                        style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: '#fff',
                            textShadow: '0 0 24px rgba(250,204,21,0.18)',
                        }}
                    >
                        {formatCurrency(market.price || 0)}
                    </div>
                    <div
                        className="tabular-mono"
                        style={{ fontSize: 12, color: cl, fontWeight: 700 }}
                    >
                        {up ? '+' : ''}
                        {(market.change24h || 0).toFixed(2)}%
                    </div>
                    <div
                        className="tabular-mono"
                        style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}
                    >
                        VOL ${((market.volume24h || 0) / 1_000_000).toFixed(1)}M · OI $
                        {((market.openInterest || 0) / 1_000_000).toFixed(1)}M · FUND{' '}
                        {((market.fundingRate || 0) * 100).toFixed(3)}%
                    </div>
                </div>

                {/* Chart + Orderbook grid */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1.6fr 1fr',
                        gap: 1,
                        background: '#1A1A1A',
                    }}
                >
                    <div style={{ background: '#050505', minHeight: 280, padding: 8 }}>
                        <TradingChart symbol={market.symbol} />
                    </div>
                    <div style={{ background: '#050505', padding: 8 }}>
                        <OrderBook />
                    </div>
                </div>

                {/* Order panel */}
                <div style={{ padding: '12px 16px 16px' }}>
                    <AdvancedOrderPanel symbol={market.symbol} />
                </div>

                <MarketSelectModal
                    isOpen={showPicker}
                    onClose={() => setShowPicker(false)}
                    onSelect={(m) => {
                        setSelectedMarket(m.symbol);
                        setShowPicker(false);
                    }}
                    markets={markets}
                    title={t.markets.title}
                    subtitle={t.markets.tapToChange}
                />
            </div>
        );
    }

    // NORMAL MODE — editorial buy/sell
    return (
        <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
            <div
                style={{
                    padding: '8px 6px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            aria-label="Back"
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
                                color: 'rgba(255,255,255,0.7)',
                                flexShrink: 0,
                            }}
                        >
                            ‹
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowPicker(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 14px 8px 8px',
                            borderRadius: 99,
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.025)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            flex: 1,
                            minWidth: 0,
                        }}
                    >
                        <TokenLogo symbol={market.symbol} size={28} />
                        <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>
                                {getTokenFullName(ticker)}
                            </div>
                            <div
                                style={{
                                    fontSize: 9,
                                    color: 'var(--color-text-tertiary)',
                                    letterSpacing: '0.16em',
                                    textTransform: 'uppercase',
                                    fontWeight: 700,
                                }}
                            >
                                {ticker}-USD · Perp
                            </div>
                        </div>
                        <ChevronDown size={14} color="var(--color-text-tertiary)" />
                    </button>
                </div>
                <ProToggle pro={false} onClick={toggleProMode} />
            </div>

            {/* Big Fraunces price */}
            <div style={{ padding: '24px 6px 0', display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <div
                    className="font-display tabular-mono"
                    style={{
                        fontSize: 44,
                        lineHeight: 1,
                        fontWeight: 500,
                        fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 500',
                        letterSpacing: '-0.03em',
                    }}
                >
                    {formatCurrency(market.price || 0)}
                </div>
                <span
                    className="tabular-mono"
                    style={{
                        padding: '4px 10px',
                        borderRadius: 99,
                        background: up ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)',
                        color: cl,
                        fontWeight: 700,
                        fontSize: 12,
                    }}
                >
                    {up ? '+' : ''}
                    {(market.change24h || 0).toFixed(2)}%
                </span>
            </div>

            {/* Chart */}
            <div style={{ padding: '20px 6px 0' }}>
                <div
                    style={{
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 18,
                        overflow: 'hidden',
                        background: 'linear-gradient(165deg, #16120D 0%, #0B0907 100%)',
                        padding: 4,
                    }}
                >
                    <div style={{ height: 280 }}>
                        <TradingChart symbol={market.symbol} />
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div
                style={{
                    padding: '20px 6px 0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                }}
            >
                <StatCard
                    label={t.screens.tradear.stats.vol24h}
                    value={`$${((market.volume24h || 0) / 1_000_000).toFixed(1)}M`}
                />
                <StatCard
                    label={t.screens.tradear.stats.high24h}
                    value={`$${(market.high24h || market.price || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                />
                <StatCard
                    label={t.screens.tradear.stats.low24h}
                    value={`$${(market.low24h || market.price || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                />
            </div>

            {/* Order panel (existing) */}
            <div style={{ padding: '28px 6px 0' }}>
                <HairlineSection label={t.screens.tradear.section} />
                <div style={{ marginTop: 14 }}>
                    <OrderPanel />
                </div>
            </div>

            <MarketSelectModal
                isOpen={showPicker}
                onClose={() => setShowPicker(false)}
                onSelect={(m) => {
                    setSelectedMarket(m.symbol);
                    setShowPicker(false);
                }}
                markets={markets}
                title={t.markets.title}
                subtitle={t.markets.tapToChange}
            />
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                padding: '12px 10px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            <div
                style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.16em',
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

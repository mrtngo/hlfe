'use client';

import { memo, useMemo, useState } from 'react';
import { Search, ChevronDown, Flame } from 'lucide-react';
import { useHyperliquid, type Market } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { usePreferences } from '@/hooks/usePreferences';
import { getTokenFullName, STORAGE_KEYS, DEFAULT_WATCHLIST } from '@/lib/constants';
import { CATEGORIES, isInCategory, type TokenCategory } from '@/lib/token-categories';
import TokenLogo from '@/components/TokenLogo';
import MiniChart from '@/components/MiniChart';
import ScreenHeader from '@/components/ScreenHeader';
import HairlineSection from '@/components/HairlineSection';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import SkeletonRow from '@/components/SkeletonRow';
import ProToggle from '@/components/ProToggle';
import TickerTape from '@/components/TickerTape';

interface MarketsScreenProps {
    onTokenClick?: (symbol: string) => void;
    onBack?: () => void;
}

function MarketsScreen({ onTokenClick, onBack }: MarketsScreenProps) {
    const { t } = useLanguage();
    const { proMode, toggleProMode } = usePreferences();
    const { markets, setSelectedMarket } = useHyperliquid();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<'all' | 'fav' | TokenCategory>('all');

    const [watchlist] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
        try {
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const isLoading = !markets || markets.length === 0;

    const allMarkets = useMemo(() => markets || [], [markets]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const watchset = (watchlist || []).length > 0 ? watchlist : DEFAULT_WATCHLIST;
        return allMarkets
            .filter((m) => {
                if (q) {
                    const baseTicker = m.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                    if (
                        !baseTicker.toLowerCase().includes(q) &&
                        !m.name.toLowerCase().includes(q) &&
                        !getTokenFullName(baseTicker).toLowerCase().includes(q)
                    ) return false;
                }
                if (category === 'fav') {
                    return watchset.includes(m.name) || watchset.includes(m.symbol);
                }
                if (category !== 'all') {
                    const baseSymbol = m.name.replace('-USD', '').replace('-PERP', '');
                    return isInCategory(baseSymbol, category);
                }
                return true;
            })
            .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
    }, [allMarkets, query, category, watchlist]);

    const hotMarkets = useMemo(() => {
        return allMarkets
            .filter((m) => !m.isStock && (m.change24h || 0) > 0)
            .sort((a, b) => (b.change24h || 0) - (a.change24h || 0))
            .slice(0, 6);
    }, [allMarkets]);

    const handlePick = (symbol: string) => {
        setSelectedMarket(symbol);
        onTokenClick?.(symbol);
    };

    if (proMode) {
        return (
            <div
                className="atmosphere-grid"
                style={{
                    minHeight: '100%',
                    color: '#fff',
                    fontFamily: 'var(--font-jetbrains), ui-monospace, monospace',
                    marginLeft: -16,
                    marginRight: -16,
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        padding: '12px 16px 10px',
                        borderBottom: '1px solid rgba(250,204,21,0.25)',
                        background: 'linear-gradient(180deg, rgba(250,204,21,0.04), transparent)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 9,
                                color: 'var(--color-brand-primary)',
                                letterSpacing: '0.3em',
                                fontWeight: 800,
                                marginBottom: 4,
                            }}
                        >
                            {t.screens.mercados.pro.title} // {allMarkets.length} SYMBOLS
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: 'var(--color-text-secondary)',
                                fontWeight: 600,
                            }}
                        >
                            {allMarkets.filter((m) => (m.change24h || 0) >= 0).length} ▲ ·{' '}
                            {allMarkets.filter((m) => (m.change24h || 0) < 0).length} ▼
                        </div>
                    </div>
                    <ProToggle pro={true} onClick={toggleProMode} />
                </div>

                <TickerTape onSymbolClick={handlePick} />

                <div style={{ padding: '12px 16px' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            border: '1px solid #1F1F1F',
                            background: 'rgba(255,255,255,0.015)',
                            borderRadius: 6,
                            padding: '8px 10px',
                            marginBottom: 10,
                        }}
                    >
                        <Search size={14} color="var(--color-text-tertiary)" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t.screens.mercados.searchPlaceholder}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#fff',
                                fontFamily: 'inherit',
                                fontSize: 12,
                            }}
                        />
                    </div>

                    <div
                        style={{
                            border: '1px solid #1A1A1A',
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: 'rgba(255,255,255,0.012)',
                        }}
                    >
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1.4fr 0.85fr 0.7fr 0.7fr 0.7fr',
                                padding: '6px 12px',
                                fontSize: 9,
                                color: 'var(--color-text-muted)',
                                letterSpacing: '0.18em',
                                fontWeight: 700,
                                borderBottom: '1px solid #1A1A1A',
                                background: 'rgba(255,255,255,0.01)',
                            }}
                        >
                            <div>{t.screens.mercados.pro.table.symbol}</div>
                            <div style={{ textAlign: 'right' }}>
                                {t.screens.mercados.pro.table.price}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {t.screens.mercados.pro.table.change}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {t.screens.mercados.pro.table.vol}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {t.screens.mercados.pro.table.fund}
                            </div>
                        </div>
                        {isLoading ? (
                            <div style={{ padding: 12 }}>
                                <SkeletonRow count={8} height={32} radius={4} />
                            </div>
                        ) : filtered.length === 0 ? (
                            <EmptyState
                                title={t.screens.mercados.empty.title}
                                body={t.screens.mercados.empty.body}
                                cta={t.screens.mercados.empty.cta}
                                onCtaClick={() => setQuery('')}
                            />
                        ) : (
                            filtered.slice(0, 80).map((m, i) => {
                                const up = (m.change24h || 0) >= 0;
                                const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';
                                const baseTicker = m.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                                const vol = (m.volume24h || 0) / 1_000_000;
                                return (
                                    <button
                                        key={m.symbol}
                                        type="button"
                                        onClick={() => handlePick(m.symbol)}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1.4fr 0.85fr 0.7fr 0.7fr 0.7fr',
                                            padding: '10px 12px',
                                            fontSize: 11,
                                            alignItems: 'center',
                                            borderBottom:
                                                i < filtered.length - 1
                                                    ? '1px solid #1A1A1A'
                                                    : 'none',
                                            background: i % 2 === 0 ? 'rgba(255,255,255,0.008)' : 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#fff',
                                            fontFamily: 'inherit',
                                            textAlign: 'left',
                                            width: '100%',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <TokenLogo symbol={m.symbol} size={20} />
                                            <div style={{ minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        color: '#fff',
                                                        fontSize: 11,
                                                    }}
                                                >
                                                    {baseTicker}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 9,
                                                        color: 'var(--color-text-tertiary)',
                                                    }}
                                                >
                                                    OI ${((m.openInterest || 0) / 1_000_000).toFixed(1)}M
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                textAlign: 'right',
                                                fontWeight: 600,
                                                color: '#E5E5E5',
                                            }}
                                        >
                                            ${(m.price || 0).toLocaleString('en-US', {
                                                maximumFractionDigits: m.price && m.price < 1 ? 4 : 2,
                                            })}
                                        </div>
                                        <div
                                            style={{
                                                textAlign: 'right',
                                                color: cl,
                                                fontWeight: 700,
                                            }}
                                        >
                                            {up ? '+' : ''}
                                            {(m.change24h || 0).toFixed(2)}%
                                        </div>
                                        <div
                                            style={{
                                                textAlign: 'right',
                                                color: 'var(--color-text-secondary)',
                                            }}
                                        >
                                            ${vol >= 1 ? `${vol.toFixed(1)}M` : `${(vol * 1000).toFixed(0)}K`}
                                        </div>
                                        <div
                                            style={{
                                                textAlign: 'right',
                                                color: (m.fundingRate || 0) >= 0
                                                    ? 'var(--color-positive)'
                                                    : 'var(--color-negative)',
                                            }}
                                        >
                                            {((m.fundingRate || 0) * 100).toFixed(3)}%
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Normal mode
    return (
        <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
            <ScreenHeader
                title={t.screens.mercados.title}
                sub={t.screens.mercados.eyebrow}
                onBack={onBack}
                right={<ProToggle pro={false} onClick={toggleProMode} />}
                large
                italic
            />

            <div style={{ padding: '8px 6px 0' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 14,
                        padding: '12px 14px',
                    }}
                >
                    <Search size={16} color="var(--color-text-secondary)" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t.screens.mercados.searchPlaceholder}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#fff',
                            fontSize: 14,
                            fontFamily: 'inherit',
                        }}
                    />
                    <span
                        style={{
                            fontSize: 10,
                            color: 'var(--color-text-tertiary)',
                            letterSpacing: '0.12em',
                            fontWeight: 700,
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 6,
                            padding: '2px 6px',
                        }}
                    >
                        {t.screens.mercados.kbdHint}
                    </span>
                </div>
            </div>

            {/* Category chips */}
            <div
                className="snap-rail"
                style={{ marginTop: 14, padding: '4px 6px' }}
            >
                <CategoryChip
                    label={t.screens.mercados.all}
                    active={category === 'all'}
                    onClick={() => setCategory('all')}
                />
                <CategoryChip
                    label={t.screens.mercados.favorites}
                    active={category === 'fav'}
                    onClick={() => setCategory('fav')}
                />
                {CATEGORIES.filter((c) => c.id !== 'watchlist').map((c) => (
                    <CategoryChip
                        key={c.id}
                        label={c.label}
                        active={category === c.id}
                        onClick={() => setCategory(c.id)}
                    />
                ))}
            </div>

            {/* Hot today */}
            {hotMarkets.length > 0 && (
                <div style={{ padding: '20px 6px 0' }}>
                    <HairlineSection
                        label={t.screens.mercados.hot}
                        right={<Flame size={14} color="var(--color-brand-primary)" />}
                    />
                    <div className="snap-rail" style={{ marginTop: 12, padding: '4px 0' }}>
                        {hotMarkets.map((m) => (
                            <HotCard key={m.symbol} market={m} onClick={handlePick} />
                        ))}
                    </div>
                </div>
            )}

            {/* List */}
            <div style={{ padding: '24px 6px 0' }}>
                <HairlineSection
                    label={t.screens.mercados.section}
                    right={
                        <div
                            style={{
                                fontSize: 10,
                                color: 'var(--color-text-tertiary)',
                                letterSpacing: '0.12em',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                textTransform: 'uppercase',
                            }}
                        >
                            {t.screens.mercados.sort.volume}
                            <ChevronDown size={11} />
                        </div>
                    }
                />
                {isLoading ? (
                    <div style={{ marginTop: 16 }}>
                        <SkeletonRow count={7} height={56} />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        title={t.screens.mercados.empty.title}
                        body={t.screens.mercados.empty.body}
                        cta={t.screens.mercados.empty.cta}
                        onCtaClick={() => {
                            setQuery('');
                            setCategory('all');
                        }}
                    />
                ) : (
                    <div style={{ marginTop: 4 }}>
                        {filtered.slice(0, 60).map((m, i) => (
                            <ListRow
                                key={m.symbol}
                                index={i}
                                market={m}
                                last={i === Math.min(filtered.length, 60) - 1}
                                onClick={() => handlePick(m.symbol)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(MarketsScreen);

function CategoryChip({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: '7px 14px',
                borderRadius: 99,
                border: active
                    ? '1px solid var(--color-brand-primary)'
                    : '1px solid rgba(255,255,255,0.08)',
                background: active
                    ? 'rgba(250,204,21,0.12)'
                    : 'rgba(255,255,255,0.02)',
                color: active ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.03em',
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                flexShrink: 0,
            }}
        >
            {label}
        </button>
    );
}

function HotCard({ market, onClick }: { market: Market; onClick: (s: string) => void }) {
    const up = (market.change24h || 0) >= 0;
    const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';
    const baseTicker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
    return (
        <button
            type="button"
            onClick={() => onClick(market.symbol)}
            style={{
                width: 158,
                padding: 14,
                borderRadius: 18,
                border: '1px solid rgba(34,197,94,0.18)',
                background:
                    'linear-gradient(140deg, rgba(34,197,94,0.08), rgba(255,255,255,0.012) 70%)',
                color: '#fff',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                flexShrink: 0,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <TokenLogo symbol={market.symbol} size={28} />
                <div
                    className="font-display"
                    style={{
                        fontSize: 16,
                        fontWeight: 500,
                        fontVariationSettings: '"opsz" 36, "SOFT" 40, "wght" 500',
                    }}
                >
                    {baseTicker}
                </div>
            </div>
            <div style={{ height: 28, opacity: 0.8 }}>
                <MiniChart symbol={market.symbol} isStock={market.isStock === true} />
            </div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginTop: 10,
                }}
            >
                <div className="tabular-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                    ${(market.price || 0).toLocaleString('en-US', {
                        maximumFractionDigits: (market.price || 0) < 1 ? 4 : 2,
                    })}
                </div>
                <div className="tabular-mono" style={{ fontSize: 11, color: cl, fontWeight: 700 }}>
                    {up ? '+' : ''}
                    {(market.change24h || 0).toFixed(2)}%
                </div>
            </div>
        </button>
    );
}

function ListRow({
    index,
    market,
    last,
    onClick,
}: {
    index: number;
    market: Market;
    last: boolean;
    onClick: () => void;
}) {
    const up = (market.change24h || 0) >= 0;
    const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';
    const baseTicker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
    const vol = (market.volume24h || 0) / 1_000_000;
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 0',
                borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#fff',
                fontFamily: 'inherit',
                width: '100%',
                textAlign: 'left',
            }}
        >
            <div
                className="font-display"
                style={{
                    width: 22,
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: 'var(--color-text-muted)',
                    fontVariationSettings: '"opsz" 24, "SOFT" 100',
                }}
            >
                {String(index + 1).padStart(2, '0')}
            </div>
            <TokenLogo symbol={market.symbol} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    className="font-display"
                    style={{
                        fontSize: 16,
                        fontWeight: 500,
                        fontVariationSettings: '"opsz" 36, "SOFT" 40',
                        letterSpacing: '-0.01em',
                    }}
                >
                    {getTokenFullName(baseTicker)}
                </div>
                <div
                    style={{
                        fontSize: 10,
                        color: 'var(--color-text-tertiary)',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        marginTop: 1,
                    }}
                >
                    {baseTicker} · VOL ${vol >= 1 ? `${vol.toFixed(1)}M` : `${(vol * 1000).toFixed(0)}K`}
                </div>
            </div>
            <div style={{ width: 60, height: 28 }}>
                <MiniChart symbol={market.symbol} isStock={market.isStock === true} />
            </div>
            <div style={{ textAlign: 'right', minWidth: 70 }}>
                <div
                    className="tabular-mono"
                    style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}
                >
                    ${(market.price || 0).toLocaleString('en-US', {
                        maximumFractionDigits: (market.price || 0) < 1 ? 4 : 2,
                    })}
                </div>
                <div className="tabular-mono" style={{ fontSize: 11, color: cl, fontWeight: 600 }}>
                    {up ? '+' : ''}
                    {(market.change24h || 0).toFixed(2)}%
                </div>
            </div>
        </button>
    );
}

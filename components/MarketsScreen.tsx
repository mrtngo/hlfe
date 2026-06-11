'use client';

import { memo, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useHyperliquid, type Market } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { usePreferences } from '@/hooks/usePreferences';
import { getTokenFullName, STORAGE_KEYS, DEFAULT_WATCHLIST } from '@/lib/constants';
import { CATEGORIES, marketMatchesCategory, type TokenCategory } from '@/lib/token-categories';
import TokenLogo from '@/components/TokenLogo';
import MiniChart from '@/components/MiniChart';
import EmptyState from '@/components/EmptyState';
import SkeletonRow from '@/components/SkeletonRow';
import ProToggle from '@/components/ProToggle';
import TickerTape from '@/components/TickerTape';
import { ScreenV2, PctBadge, MarketLogo, V2 } from '@/components/V2Kit';

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
                    return marketMatchesCategory(m, category);
                }
                return true;
            })
            .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
    }, [allMarkets, query, category, watchlist]);

    const handlePick = (symbol: string) => {
        setSelectedMarket(symbol);
        onTokenClick?.(symbol);
    };

    // ── Pro (terminal) mode — unchanged dense table ───────────────────────────
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
                        <div style={{ fontSize: 9, color: 'var(--color-brand-primary)', letterSpacing: '0.3em', fontWeight: 800, marginBottom: 4 }}>
                            {t.screens.mercados.pro.title} // {allMarkets.length} SYMBOLS
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                            {allMarkets.filter((m) => (m.change24h || 0) >= 0).length} ▲ ·{' '}
                            {allMarkets.filter((m) => (m.change24h || 0) < 0).length} ▼
                        </div>
                    </div>
                    <ProToggle pro={true} onClick={toggleProMode} />
                </div>

                <TickerTape onSymbolClick={handlePick} />

                <div style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #1F1F1F', background: 'rgba(255,255,255,0.015)', borderRadius: 6, padding: '8px 10px', marginBottom: 10 }}>
                        <Search size={14} color="var(--color-text-tertiary)" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t.screens.mercados.searchPlaceholder}
                            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 12 }}
                        />
                    </div>

                    <div style={{ border: '1px solid #1A1A1A', borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.012)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.85fr 0.7fr 0.7fr 0.7fr', padding: '6px 12px', fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.18em', fontWeight: 700, borderBottom: '1px solid #1A1A1A', background: 'rgba(255,255,255,0.01)' }}>
                            <div>{t.screens.mercados.pro.table.symbol}</div>
                            <div style={{ textAlign: 'right' }}>{t.screens.mercados.pro.table.price}</div>
                            <div style={{ textAlign: 'right' }}>{t.screens.mercados.pro.table.change}</div>
                            <div style={{ textAlign: 'right' }}>{t.screens.mercados.pro.table.vol}</div>
                            <div style={{ textAlign: 'right' }}>{t.screens.mercados.pro.table.fund}</div>
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
                                        style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.85fr 0.7fr 0.7fr 0.7fr', padding: '10px 12px', fontSize: 11, alignItems: 'center', borderBottom: i < filtered.length - 1 ? '1px solid #1A1A1A' : 'none', background: i % 2 === 0 ? 'rgba(255,255,255,0.008)' : 'transparent', border: 'none', cursor: 'pointer', color: '#fff', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <TokenLogo symbol={m.symbol} size={20} />
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, color: '#fff', fontSize: 11 }}>{baseTicker}</div>
                                                <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>OI ${((m.openInterest || 0) / 1_000_000).toFixed(1)}M</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', fontWeight: 600, color: '#E5E5E5' }}>
                                            ${(m.price || 0).toLocaleString('en-US', { maximumFractionDigits: m.price && m.price < 1 ? 4 : 2 })}
                                        </div>
                                        <div style={{ textAlign: 'right', color: cl, fontWeight: 700 }}>
                                            {up ? '+' : ''}{(m.change24h || 0).toFixed(2)}%
                                        </div>
                                        <div style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                                            ${vol >= 1 ? `${vol.toFixed(1)}M` : `${(vol * 1000).toFixed(0)}K`}
                                        </div>
                                        <div style={{ textAlign: 'right', color: (m.fundingRate || 0) >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
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

    // ── Normal mode — V2 "serious redesign" ───────────────────────────────────
    const tabs: { id: 'all' | 'fav' | TokenCategory; label: string }[] = [
        { id: 'all', label: t.screens.mercados.all },
        { id: 'fav', label: t.screens.mercados.favorites },
        ...CATEGORIES.filter((c) => c.id !== 'watchlist').map((c) => ({ id: c.id as TokenCategory, label: c.label })),
    ];

    return (
        <ScreenV2 pad={0}>
            {/* Title */}
            <div style={{ padding: '56px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {onBack && (
                        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} aria-label="Back">
                            <span style={{ color: V2.t2, fontSize: 20, lineHeight: 1 }}>‹</span>
                        </button>
                    )}
                    <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.035em' }}>{t.screens.mercados.title.replace(/\.$/, '')}</div>
                </div>
                <ProToggle pro={false} onClick={toggleProMode} />
            </div>

            {/* Search */}
            <div style={{ padding: '0 20px 16px' }}>
                <div className="v2-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 14 }}>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t.screens.mercados.searchPlaceholder}
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: V2.t1, fontSize: 15, fontFamily: V2.ui }}
                    />
                    <Search size={18} color={V2.t2} />
                </div>
            </div>

            {/* Category tabs (underline) */}
            <div className="v2-noscroll" style={{ overflowX: 'auto', padding: '0 20px 4px' }}>
                <div style={{ display: 'flex', gap: 22, borderBottom: `1px solid ${V2.hair}` }}>
                    {tabs.map((c) => {
                        const on = c.id === category;
                        return (
                            <button
                                key={c.id}
                                onClick={() => setCategory(c.id)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: V2.ui, padding: '0 0 12px', whiteSpace: 'nowrap', position: 'relative', fontSize: 16, fontWeight: on ? 700 : 600, color: on ? V2.accent : V2.t3 }}
                            >
                                {c.label}
                                {on && <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2.5, borderRadius: 99, background: V2.accent }} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* List */}
            <div style={{ padding: '4px 0 0' }}>
                {isLoading ? (
                    <div style={{ padding: '16px 20px' }}>
                        <SkeletonRow count={8} height={56} />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        title={t.screens.mercados.empty.title}
                        body={t.screens.mercados.empty.body}
                        cta={t.screens.mercados.empty.cta}
                        onCtaClick={() => { setQuery(''); setCategory('all'); }}
                    />
                ) : (
                    filtered.slice(0, 60).map((m, i, arr) => (
                        <ListRowV2 key={m.symbol} market={m} last={i === arr.length - 1} onClick={() => handlePick(m.symbol)} />
                    ))
                )}
            </div>
        </ScreenV2>
    );
}

export default memo(MarketsScreen);

function ListRowV2({ market, last, onClick }: { market: Market; last: boolean; onClick: () => void }) {
    const ch = market.change24h || 0;
    const baseTicker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
    const price = market.price || 0;
    return (
        <button
            type="button"
            onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: last ? 'none' : `1px solid ${V2.hair}`, background: 'transparent', border: 'none', cursor: 'pointer', color: V2.t1, fontFamily: V2.ui, width: '100%', textAlign: 'left' }}
        >
            <MarketLogo sym={market.symbol} size={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>{baseTicker}</div>
                <div style={{ fontSize: 13.5, color: V2.t3, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTokenFullName(baseTicker)}</div>
            </div>
            <div style={{ width: 72, height: 36, flexShrink: 0 }}>
                <MiniChart symbol={market.symbol} isStock={market.isStock === true} />
            </div>
            <div style={{ textAlign: 'right', minWidth: 86, flexShrink: 0 }}>
                <div style={{ fontFamily: V2.ui, fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    ${price.toLocaleString('en-US', { minimumFractionDigits: price < 10 ? 3 : 2, maximumFractionDigits: price < 10 ? 4 : 2 })}
                </div>
                <div style={{ marginTop: 5, display: 'flex', justifyContent: 'flex-end' }}>
                    <PctBadge v={ch} size="sm" />
                </div>
            </div>
        </button>
    );
}

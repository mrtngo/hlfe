'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePolymarket } from '@/hooks/usePolymarket';
import { useLanguage } from '@/hooks/useLanguage';
import { Search, TrendingUp, ArrowLeft, X, ChevronDown } from 'lucide-react';
import PolymarketMarketCard from './PolymarketMarketCard';
import PolymarketOrderPanel from './PolymarketOrderPanel';
import PolymarketPositions from './PolymarketPositions';
import PolymarketDeposit from './PolymarketDeposit';
import PolymarketChart from './PolymarketChart';
import type { PolymarketEvent, PolymarketMarket } from '@/types/polymarket';
import { POLYMARKET_CATEGORIES } from '@/lib/constants/polymarket';

/** Safely parse a field that may be a JSON string or already an array */
function safeParseArray(val: any, fallback: any[] = []): any[] {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
    }
    return fallback;
}

const OUTCOME_COLORS = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#22c55e', // green-500
    '#eab308', // yellow-500
    '#a855f7', // purple-500
    '#f97316', // orange-500
];

function OutcomeCard({
    image, label, pct, vol, yesCents, noCents, color, onBuyYes, onBuyNo, pendingYes, pendingNo, isConnected, expanded, onToggle
}: {
    image?: string; label: string; pct: string; vol: string; yesCents: number; noCents: number;
    color: string; onBuyYes: () => void; onBuyNo: () => void; pendingYes: boolean; pendingNo: boolean; isConnected: boolean;
    expanded?: boolean; onToggle?: () => void;
}) {
    const { t } = useLanguage();
    return (
        <div
            className="flex flex-col gap-3 rounded-xl p-3 cursor-pointer transition-all"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: `1px solid ${expanded ? color : 'var(--color-border-subtle)'}` }}
            onClick={onToggle}
        >
            <div className="flex items-center gap-3">
                {image ? (
                    <div className="flex-shrink-0 rounded-lg overflow-hidden" style={{ width: 32, height: 32, minWidth: 32, maxWidth: 32 }}>
                        <img src={image} alt="" width={32} height={32} className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="flex-shrink-0 rounded-lg" style={{ width: 32, height: 32, minWidth: 32, backgroundColor: color }} />
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight line-clamp-1" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{vol} Vol.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <p className="text-lg font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>{pct}%</p>
                    </div>
                    {onToggle && (
                        <ChevronDown
                            className="w-4 h-4 flex-shrink-0 transition-transform"
                            style={{ color: 'var(--color-text-tertiary)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        />
                    )}
                </div>
            </div>
            {isConnected && (
                <div className="flex gap-2">
                    <button
                        onClick={onBuyYes}
                        disabled={pendingYes || pendingNo}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-[0.98] disabled:opacity-50"
                        style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-positive)' }}
                    >
                        {pendingYes ? <div className="spinner w-3 h-3 border-2" style={{ borderTopColor: 'var(--color-positive)' }} /> : <span>{t.polymarket?.buyYes || 'Buy Yes'} {yesCents}¢</span>}
                    </button>
                    <button
                        onClick={onBuyNo}
                        disabled={pendingYes || pendingNo}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-[0.98] disabled:opacity-50"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-negative)' }}
                    >
                        {pendingNo ? <div className="spinner w-3 h-3 border-2" style={{ borderTopColor: 'var(--color-negative)' }} /> : <span>{t.polymarket?.buyNo || 'Buy No'} {noCents}¢</span>}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function PolymarketPanel() {
    const { t } = useLanguage();
    const {
        events,
        trendingEvents,
        selectedEvent,
        selectedMarket,
        prices,
        loading,
        error,
        loadEvents,
        loadTrending,
        searchMarkets,
        setSelectedEvent,
        setSelectedMarket,
        loadOrderBook,
        accountState,
        isConnected,
        buy,
        pending
    } = usePolymarket();

    const [tab, setTab] = useState<'browse' | 'positions' | 'deposit'>('browse');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PolymarketEvent[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [expandedOutcomeId, setExpandedOutcomeId] = useState<string | null>(null);

    // Load data on mount
    useEffect(() => {
        loadEvents();
        loadTrending();
    }, [loadEvents, loadTrending]);

    // Reload when category changes
    useEffect(() => {
        loadEvents(selectedCategory);
    }, [selectedCategory, loadEvents]);

    // Search handler with debounce
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const timeout = setTimeout(async () => {
            const results = await searchMarkets(searchQuery);
            setSearchResults(results);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, searchMarkets]);

    const handleEventClick = useCallback((event: PolymarketEvent) => {
        setSelectedEvent(event);
        // Select first market by default
        const market = event.markets?.[0];
        if (market) {
            setSelectedMarket(market);
            // Subscribe to WS prices for all tokens
            const tokenIds = safeParseArray(market.clobTokenIds).filter(Boolean);
            if (tokenIds.length > 0) {
                loadOrderBook(tokenIds[0]);
            }
        }
    }, [setSelectedEvent, setSelectedMarket, loadOrderBook]);

    const handleBack = useCallback(() => {
        setSelectedEvent(null);
        setSelectedMarket(null);
    }, [setSelectedEvent, setSelectedMarket]);

    const displayedEvents = searchQuery.trim() ? searchResults : events;

    // Detail view for a selected event
    if (selectedEvent && selectedMarket) {
        const event = selectedEvent;
        const market = selectedMarket;

        const isMultiOutcome = (event.markets?.length ?? 0) > 2;

        let chartTokens: { tokenId: string; label: string; livePrice?: number; color: string }[] = [];

        if (isMultiOutcome) {
            const withPrices = (event.markets ?? []).map((m, i) => {
                const ids = safeParseArray(m.clobTokenIds);
                const prices0 = safeParseArray(m.outcomePrices, ['0.5']).map((p: any) => parseFloat(p));
                const livePrice = ids[0] && prices[ids[0]] !== undefined ? prices[ids[0]] : prices0[0] ?? 0.5;
                const label = m.groupItemTitle || m.question || '';
                const volume = parseFloat(m.volume || '0');
                return { m, ids, livePrice, label, volume };
            })
                .filter(({ ids, label, volume }) => ids[0] && label.trim() !== '' && volume > 0 && !/^\s*person/i.test(label))  // skip no-token, blank, or placeholder
                .sort((a, b) => b.livePrice - a.livePrice);                  // high → low

            chartTokens = withPrices.slice(0, 6).map(({ ids, livePrice, label }, i) => ({
                tokenId: ids[0] ?? '',
                label,
                livePrice,
                color: OUTCOME_COLORS[i % OUTCOME_COLORS.length],
            })).filter(t => t.tokenId);
        } else {
            const ids = safeParseArray(market.clobTokenIds);
            const rawPrices = safeParseArray(market.outcomePrices, ['0.5', '0.5']).map((p: any) => parseFloat(p));
            const outcomes = safeParseArray(market.outcomes, ['Yes', 'No']);
            chartTokens = ids.slice(0, 2).map((id: string, i: number) => ({
                tokenId: id,
                label: outcomes[i] ?? (i === 0 ? 'Yes' : 'No'),
                livePrice: prices[id] !== undefined ? prices[id] : rawPrices[i],
                color: OUTCOME_COLORS[i],
            }));
        }

        // Volume formatted
        const volume = parseFloat(market.volume || String(event.volume ?? 0));
        const fmtVol = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M`
            : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K` : `$${v.toFixed(0)}`;

        // Category breadcrumb
        const breadcrumb = [market.category, (event.tags as any)?.[0]?.label].filter(Boolean).join(' · ');

        return (
            <div className="space-y-4 pb-6">
                {/* Back */}
                <button onClick={handleBack} className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <ArrowLeft className="w-4 h-4" />
                    {t.polymarket?.backToMarkets || 'Back to Markets'}
                </button>

                {/* Header */}
                <div className="flex gap-3 items-start">
                    {(event.image || market.image) && (
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)', minWidth: 48 }}>
                            <img src={event.image || market.image} alt="" width={48} height={48} className="w-12 h-12 object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        {breadcrumb && (
                            <p className="text-[11px] mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{breadcrumb}</p>
                        )}
                        <h2 className="text-base font-bold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                            {event.title || market.question}
                        </h2>
                    </div>
                </div>

                {/* Outcome legend (dot + name + %) */}
                <div className="space-y-1.5">
                    {chartTokens.map((tok, i) => {
                        const pct = tok.livePrice !== undefined ? (tok.livePrice * 100).toFixed(1) : '—';
                        return (
                            <div key={tok.tokenId} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tok.color }} />
                                <span className="text-xs flex-1 line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>{tok.label}</span>
                                <span className="text-xs font-mono font-bold" style={{ color: tok.color }}>{pct}%</span>
                            </div>
                        );
                    })}
                </div>

                {/* Chart */}
                <div
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', paddingRight: 36 }}
                >
                    {chartTokens.length > 0 && <PolymarketChart tokens={chartTokens} />}

                    {/* Volume */}
                    <p className="text-[11px] mt-3" style={{ color: 'var(--color-text-tertiary)' }}>
                        🏆 {fmtVol(volume)} Vol.
                    </p>
                </div>

                {/* Outcome cards */}
                <div className="space-y-3">
                    {isMultiOutcome ? (
                        // Multi-outcome: one card per market, sorted high→low, no blank labels
                        (() => {
                            const sorted = (event.markets ?? [])
                                .map((m) => {
                                    const ids = safeParseArray(m.clobTokenIds);
                                    const rawP = safeParseArray(m.outcomePrices, ['0.5', '0.5']).map((p: any) => parseFloat(p));
                                    const yesTokenId = ids[0] ?? '';
                                    const noTokenId = ids[1] ?? '';
                                    const yesPrice = yesTokenId && prices[yesTokenId] !== undefined ? prices[yesTokenId] : rawP[0] ?? 0.5;
                                    const noPrice = noTokenId && prices[noTokenId] !== undefined ? prices[noTokenId] : rawP[1] ?? 0.5;
                                    const label = m.groupItemTitle || m.question || '';
                                    const volume = parseFloat(m.volume || '0');
                                    return { m, yesTokenId, noTokenId, yesPrice, noPrice, label, volume };
                                })
                                .filter(({ yesTokenId, label, volume }) => yesTokenId && label.trim() !== '' && volume > 0 && !/^\s*person/i.test(label))
                                .sort((a, b) => b.yesPrice - a.yesPrice);

                            return sorted.map(({ m, yesTokenId, noTokenId, yesPrice, noPrice, label }, i) => {
                                const vol = parseFloat(m.volume || '0');
                                const color = OUTCOME_COLORS[i % OUTCOME_COLORS.length];
                                const isExpanded = expandedOutcomeId === m.id;
                                return (
                                    <div key={m.id}>
                                        <OutcomeCard
                                            image={m.image}
                                            label={label}
                                            pct={(yesPrice * 100).toFixed(0)}
                                            vol={fmtVol(vol)}
                                            yesCents={Math.round(yesPrice * 100)}
                                            noCents={Math.round(noPrice * 100)}
                                            color={color}
                                            onBuyYes={() => buy(yesTokenId, 'BUY', yesPrice)}
                                            onBuyNo={() => buy(noTokenId, 'BUY', noPrice)}
                                            pendingYes={pending === yesTokenId + 'BUY'}
                                            pendingNo={pending === noTokenId + 'BUY'}
                                            isConnected={isConnected}
                                            expanded={isExpanded}
                                            onToggle={() => {
                                                setExpandedOutcomeId(isExpanded ? null : m.id);
                                                const tokenIds = safeParseArray(m.clobTokenIds).filter(Boolean);
                                                if (!isExpanded && tokenIds.length > 0) loadOrderBook(tokenIds[0]);
                                            }}
                                        />
                                        {isExpanded && (
                                            <div className="mt-1 rounded-xl overflow-hidden" style={{ border: `1px solid ${color}33` }}>
                                                <PolymarketOrderPanel market={m} />
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()
                    ) : (
                        // Binary: YES card + NO card as a single combined card
                        (() => {
                            const ids = safeParseArray(market.clobTokenIds);
                            const rawP = safeParseArray(market.outcomePrices, ['0.5', '0.5']).map((p: any) => parseFloat(p));
                            const yesTokenId = ids[0] ?? '';
                            const noTokenId = ids[1] ?? '';
                            const yesPrice = yesTokenId && prices[yesTokenId] !== undefined ? prices[yesTokenId] : rawP[0] ?? 0.5;
                            const noPrice = noTokenId && prices[noTokenId] !== undefined ? prices[noTokenId] : rawP[1] ?? 0.5;
                            const vol = parseFloat(market.volume || '0');

                            return (
                                <OutcomeCard
                                    image={market.image || event.image}
                                    label={market.question || event.title || ''}
                                    pct={(yesPrice * 100).toFixed(0)}
                                    vol={fmtVol(vol)}
                                    yesCents={Math.round(yesPrice * 100)}
                                    noCents={Math.round(noPrice * 100)}
                                    color={OUTCOME_COLORS[0]}
                                    onBuyYes={() => buy(yesTokenId, 'BUY', yesPrice)}
                                    onBuyNo={() => buy(noTokenId, 'BUY', noPrice)}
                                    pendingYes={pending === yesTokenId + 'BUY'}
                                    pendingNo={pending === noTokenId + 'BUY'}
                                    isConnected={isConnected}
                                />
                            );
                        })()
                    )}
                </div>

                {/* Order panel */}
                <PolymarketOrderPanel market={selectedMarket} />
            </div>
        );
    }

    // Browse view
    return (
        <div className="space-y-4">
            {/* Tab bar */}
            <div className="flex gap-2">
                <button
                    onClick={() => setTab('browse')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                        backgroundColor: tab === 'browse' ? 'var(--color-brand-primary-muted)' : 'var(--color-bg-tertiary)',
                        color: tab === 'browse' ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                        border: tab === 'browse' ? '1px solid var(--color-brand-primary)' : '1px solid transparent',
                    }}
                >
                    {t.polymarket?.browse || 'Browse'}
                </button>
                <button
                    onClick={() => setTab('positions')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all relative"
                    style={{
                        backgroundColor: tab === 'positions' ? 'var(--color-brand-primary-muted)' : 'var(--color-bg-tertiary)',
                        color: tab === 'positions' ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                        border: tab === 'positions' ? '1px solid var(--color-brand-primary)' : '1px solid transparent',
                    }}
                >
                    {t.polymarket?.myPositions || 'My Positions'}
                    {accountState.positions.length > 0 && (
                        <span
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                            style={{ backgroundColor: 'var(--color-brand-primary)', color: 'var(--color-text-on-brand)' }}
                        >
                            {accountState.positions.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setTab('deposit')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                        backgroundColor: tab === 'deposit' ? 'var(--color-brand-primary-muted)' : 'var(--color-bg-tertiary)',
                        color: tab === 'deposit' ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                        border: tab === 'deposit' ? '1px solid var(--color-brand-primary)' : '1px solid transparent',
                    }}
                >
                    {t.polymarket?.deposit || 'Deposit'}
                </button>
            </div>

            {tab === 'deposit' ? (
                <PolymarketDeposit />
            ) : tab === 'positions' ? (
                <PolymarketPositions />
            ) : (
                <>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t.polymarket?.searchMarkets || 'Search prediction markets...'}
                            className="w-full pl-10 pr-8 py-2.5 rounded-xl text-sm outline-none"
                            style={{
                                backgroundColor: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-primary)',
                                border: '1px solid var(--color-border-default)',
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ color: 'var(--color-text-tertiary)' }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {POLYMARKET_CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                                style={{
                                    backgroundColor: selectedCategory === cat ? 'var(--color-brand-primary)' : 'var(--color-bg-tertiary)',
                                    color: selectedCategory === cat ? 'var(--color-text-on-brand)' : 'var(--color-text-secondary)',
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Trending section (only when not searching) */}
                    {!searchQuery && trendingEvents.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-brand-primary)' }} />
                                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                    {t.polymarket?.trending || 'Trending'}
                                </h2>
                            </div>

                            {/* Horizontal scroll for trending */}
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {trendingEvents.slice(0, 6).map(event => {
                                    const market = event.markets?.[0];
                                    if (!market) return null;
                                    const yesPrice = parseFloat(safeParseArray(market.outcomePrices, ['0.5'])[0] || '0.5');
                                    return (
                                        <button
                                            key={event.id}
                                            onClick={() => handleEventClick(event)}
                                            className="flex-shrink-0 w-[200px] rounded-xl p-3 text-left transition-all active:scale-[0.98]"
                                            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}
                                        >
                                            <p className="text-xs font-medium line-clamp-2 mb-2" style={{ color: 'var(--color-text-primary)' }}>
                                                {event.title}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-mono font-bold" style={{ color: 'var(--color-positive)' }}>
                                                    {(yesPrice * 100).toFixed(0)}%
                                                </span>
                                                <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
                                                    {t.polymarket?.yes || 'Yes'}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Market list */}
                    <div>
                        {!searchQuery && (
                            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                                {selectedCategory === 'All'
                                    ? (t.polymarket?.allMarkets || 'All Markets')
                                    : selectedCategory
                                }
                            </h2>
                        )}

                        {loading && displayedEvents.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="spinner w-6 h-6 border-2 mx-auto mb-2" style={{ borderTopColor: 'var(--color-brand-primary)' }} />
                                <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                                    {t.common?.loading || 'Loading...'}
                                </p>
                            </div>
                        ) : displayedEvents.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                                    {searchQuery
                                        ? (t.polymarket?.noResults || 'No markets found')
                                        : (t.polymarket?.noMarkets || 'No markets available')
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {displayedEvents.map(event => (
                                    <PolymarketMarketCard
                                        key={event.id}
                                        event={event}
                                        onClick={handleEventClick}
                                        prices={prices}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-negative)' }}>
                            {error}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}


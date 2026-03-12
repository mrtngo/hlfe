'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePolymarket } from '@/hooks/usePolymarket';
import { useLanguage } from '@/hooks/useLanguage';
import { Search, TrendingUp, ArrowLeft, X } from 'lucide-react';
import PolymarketMarketCard from './PolymarketMarketCard';
import PolymarketOrderPanel from './PolymarketOrderPanel';
import PolymarketPositions from './PolymarketPositions';
import PolymarketDeposit from './PolymarketDeposit';
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
    } = usePolymarket();

    const [tab, setTab] = useState<'browse' | 'positions' | 'deposit'>('browse');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PolymarketEvent[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');

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
        return (
            <div className="space-y-4">
                {/* Back button */}
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-sm transition-all"
                    style={{ color: 'var(--color-text-secondary)' }}
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t.polymarket?.backToMarkets || 'Back to Markets'}
                </button>

                {/* Event header */}
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
                    <div className="flex gap-3">
                        {(selectedEvent.image || selectedMarket.image) && (
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)', minWidth: 48, maxWidth: 48, minHeight: 48, maxHeight: 48 }}>
                                <img
                                    src={selectedEvent.image || selectedMarket.image}
                                    alt=""
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-base font-semibold leading-tight mb-1" style={{ color: 'var(--color-text-primary)' }}>
                                {selectedEvent.title || selectedMarket.question}
                            </h2>
                            <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-tertiary)' }}>
                                {selectedMarket.description || selectedEvent.description}
                            </p>

                            {/* Stats */}
                            <div className="flex gap-4 mt-2 text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                                <span className="font-mono">
                                    Vol: ${Number(parseFloat(selectedMarket.volume || '0') >= 1000000
                                        ? (parseFloat(selectedMarket.volume) / 1000000).toFixed(1) + 'M'
                                        : parseFloat(selectedMarket.volume) >= 1000
                                            ? (parseFloat(selectedMarket.volume) / 1000).toFixed(0) + 'K'
                                            : parseFloat(selectedMarket.volume || '0').toFixed(0)
                                    )}
                                </span>
                                <span className="font-mono">
                                    Liq: ${Number(parseFloat(selectedMarket.liquidity || '0') >= 1000
                                        ? (parseFloat(selectedMarket.liquidity) / 1000).toFixed(0) + 'K'
                                        : parseFloat(selectedMarket.liquidity || '0').toFixed(0)
                                    )}
                                </span>
                                {selectedMarket.category && (
                                    <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                        {selectedMarket.category}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Outcome probabilities - large display */}
                    <div className="flex gap-3 mt-4">
                        {safeParseArray(selectedMarket.outcomes, ['Yes', 'No']).map((outcome: string, i: number) => {
                            const rawPrice = safeParseArray(selectedMarket.outcomePrices, ['0.5', '0.5']).map((p: any) => parseFloat(p));
                            const tokenId = safeParseArray(selectedMarket.clobTokenIds)[i];
                            const price = tokenId && prices[tokenId] !== undefined
                                ? prices[tokenId]
                                : rawPrice[i] || 0.5;
                            const isYes = outcome.toLowerCase() === 'yes' || i === 0;

                            return (
                                <div
                                    key={outcome}
                                    className="flex-1 rounded-xl p-3 text-center"
                                    style={{
                                        backgroundColor: isYes ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        border: `1px solid ${isYes ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                    }}
                                >
                                    <p className="text-xs font-medium mb-1" style={{ color: isYes ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                                        {outcome}
                                    </p>
                                    <p className="text-2xl font-mono font-bold" style={{ color: isYes ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                                        {(price * 100).toFixed(0)}¢
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Multi-outcome market selector (if more than 1 market in event) */}
                {selectedEvent.markets && selectedEvent.markets.length > 1 && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                            {t.polymarket?.selectOutcome || 'Select Outcome'}
                        </p>
                        <div className="space-y-1.5">
                            {selectedEvent.markets.map((m) => {
                                const isSelected = m.id === selectedMarket.id;
                                const mPrice = safeParseArray(m.outcomePrices).map((p: any) => parseFloat(p));
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => {
                                            setSelectedMarket(m);
                                            const mTokenIds = safeParseArray(m.clobTokenIds);
                                            if (mTokenIds[0]) loadOrderBook(mTokenIds[0]);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all"
                                        style={{
                                            backgroundColor: isSelected ? 'var(--color-brand-primary-muted)' : 'var(--color-bg-tertiary)',
                                            border: isSelected ? '1px solid var(--color-brand-primary)' : '1px solid transparent',
                                            color: 'var(--color-text-primary)',
                                        }}
                                    >
                                        <span className="text-xs">{m.groupItemTitle || m.question}</span>
                                        <span className="font-mono text-xs" style={{ color: 'var(--color-positive)' }}>
                                            {(mPrice[0] * 100).toFixed(0)}¢
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

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

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import dynamic from 'next/dynamic';
import OrderBook from '@/components/OrderBook';
import AdvancedOrderPanel from '@/components/AdvancedOrderPanel';
import PositionDisplay from '@/components/PositionDisplay';
import { ArrowLeft, ChevronDown, TrendingUp, TrendingDown, Search, X, ArrowUpDown, ChevronUp, BarChart2, List, Clock } from 'lucide-react';
import TokenLogo from '@/components/TokenLogo';

// Dynamic import for CandlestickChart
const CandlestickChart = dynamic(() => import('@/components/CandlestickChart'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-black">
            <div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
        </div>
    ),
});

// Content tabs
type ContentTab = 'chart' | 'orderbook' | 'trades';
// Bottom tabs
type BottomTab = 'positions' | 'orders' | 'history';

function TradePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const {
        connected,
        selectedMarket,
        setSelectedMarket,
        getMarket,
        markets,
        positions,
        account
    } = useHyperliquid();

    // Get symbol from URL or use selected market
    const urlSymbol = searchParams.get('symbol');
    const [symbol, setSymbol] = useState(urlSymbol || selectedMarket);
    const [showMarketSelector, setShowMarketSelector] = useState(false);
    const [contentTab, setContentTab] = useState<ContentTab>('chart');
    const [bottomTab, setBottomTab] = useState<BottomTab>('positions');
    const [orderPrice, setOrderPrice] = useState<number | null>(null);

    // Market selector state
    const [marketTab, setMarketTab] = useState<'crypto' | 'stocks'>('crypto');
    const [marketSearch, setMarketSearch] = useState('');
    const [sortColumn, setSortColumn] = useState<'name' | 'price' | 'volume' | 'change'>('volume');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const market = getMarket(symbol);
    const currentPosition = positions?.find(p => p.symbol === symbol);
    const coin = symbol?.replace('-USD', '').replace('-PERP', '') || 'BTC';
    const maxLeverage = market?.maxLeverage || 20;

    // Sync with URL
    useEffect(() => {
        if (urlSymbol && urlSymbol !== symbol) {
            setSymbol(urlSymbol);
            setSelectedMarket(urlSymbol);
        }
    }, [urlSymbol, symbol, setSelectedMarket]);

    // Calculate 24h change
    const priceChange = market?.change24h || 0;
    const isPositive = priceChange >= 0;

    // Handle price click from order book
    const handlePriceClick = (price: number) => {
        setOrderPrice(price);
    };

    // Format price
    const formatPrice = (price: number) => {
        if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (price >= 1) return price.toFixed(4);
        return price.toFixed(6);
    };

    return (
        <div className="min-h-screen bg-black text-[#FFFF00] flex flex-col">
            {/* Header - Compact Exchange Style */}
            <header className="flex items-center justify-between px-3 py-2 bg-black border-b border-[#FFFF00]/20">
                {/* Back + Market Selector */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.back()}
                        className="p-1.5 text-[#FFFF00]/60 hover:text-[#FFFF00]"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowMarketSelector(true)}
                        className="flex items-center gap-1.5"
                    >
                        <TokenLogo symbol={symbol} size={24} />
                        <span className="font-bold text-[#FFFF00]">{coin}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-[#FFFF00]/20 text-[#FFFF00] rounded font-medium">
                            {maxLeverage}x
                        </span>
                        <ChevronDown className="w-4 h-4 text-[#FFFF00]/60" />
                    </button>
                </div>

                {/* Price + Change */}
                <div className="text-right">
                    <div className="text-sm font-bold font-mono text-[#FFFF00]">
                        ${market?.price ? formatPrice(market.price) : '---'}
                    </div>
                    <div className={`text-xs font-mono ${isPositive ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                        {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                    </div>
                </div>
            </header>

            {/* Content Tabs: Chart | Order Book | Trades */}
            <div className="flex border-b border-[#FFFF00]/20 bg-black">
                <button
                    onClick={() => setContentTab('chart')}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors bg-black ${contentTab === 'chart'
                        ? 'text-[#FFFF00] border-b-2 border-[#FFFF00]'
                        : 'text-[#FFFF00]/50 hover:text-[#FFFF00]'
                        }`}
                >
                    Chart
                </button>
                <button
                    onClick={() => setContentTab('orderbook')}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors bg-black ${contentTab === 'orderbook'
                        ? 'text-[#FFFF00] border-b-2 border-[#FFFF00]'
                        : 'text-[#FFFF00]/50 hover:text-[#FFFF00]'
                        }`}
                >
                    Order Book
                </button>
                <button
                    onClick={() => setContentTab('trades')}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors bg-black ${contentTab === 'trades'
                        ? 'text-[#FFFF00] border-b-2 border-[#FFFF00]'
                        : 'text-[#FFFF00]/50 hover:text-[#FFFF00]'
                        }`}
                >
                    Trades
                </button>
            </div>

            {/* Main Scrollable Content */}
            <div className="flex-1 overflow-auto" style={{ paddingBottom: '60px' }}>
                {/* Chart/OrderBook/Trades Section */}
                {contentTab === 'chart' && (
                    <div className="h-[250px]">
                        <CandlestickChart symbol={symbol} height={250} />
                    </div>
                )}
                {contentTab === 'orderbook' && (
                    <div className="h-[300px]">
                        <OrderBook symbol={symbol} levels={10} onPriceClick={handlePriceClick} />
                    </div>
                )}
                {contentTab === 'trades' && (
                    <div className="h-[300px] flex items-center justify-center text-white/40 text-sm">
                        Recent trades coming soon
                    </div>
                )}

                {/* Order Form */}
                <div className="border-t border-[#FFFF00]/20">
                    <AdvancedOrderPanel symbol={symbol} initialPrice={orderPrice} />
                </div>

                {/* Bottom Tabs: Positions | Orders | History */}
                <div className="flex border-t border-[#FFFF00]/20 bg-black">
                    <button
                        onClick={() => setBottomTab('positions')}
                        className={`flex-1 py-2.5 text-xs font-medium transition-colors bg-black ${bottomTab === 'positions'
                            ? 'text-[#FFFF00] border-b-2 border-[#FFFF00]'
                            : 'text-[#FFFF00]/50 hover:text-[#FFFF00]'
                            }`}
                    >
                        Positions {positions?.length ? `(${positions.length})` : ''}
                    </button>
                    <button
                        onClick={() => setBottomTab('orders')}
                        className={`flex-1 py-2.5 text-xs font-medium transition-colors bg-black ${bottomTab === 'orders'
                            ? 'text-[#FFFF00] border-b-2 border-[#FFFF00]'
                            : 'text-[#FFFF00]/50 hover:text-[#FFFF00]'
                            }`}
                    >
                        Open Orders
                    </button>
                    <button
                        onClick={() => setBottomTab('history')}
                        className={`flex-1 py-2.5 text-xs font-medium transition-colors bg-black ${bottomTab === 'history'
                            ? 'text-[#FFFF00] border-b-2 border-[#FFFF00]'
                            : 'text-[#FFFF00]/50 hover:text-[#FFFF00]'
                            }`}
                    >
                        History
                    </button>
                </div>

                {/* Bottom Tab Content */}
                <div className="p-3 bg-black min-h-[100px]">
                    {bottomTab === 'positions' && (
                        positions && positions.length > 0 ? (
                            <div className="space-y-2">
                                {positions.map((pos) => (
                                    <div
                                        key={pos.symbol}
                                        className={`p-3 rounded-lg border cursor-pointer ${pos.symbol === symbol ? 'border-[#FFFF00]/50 bg-[#FFFF00]/5' : 'border-[#FFFF00]/20 bg-black'}`}
                                        onClick={() => {
                                            setSymbol(pos.symbol);
                                            setSelectedMarket(pos.symbol);
                                            router.replace(`/trade?symbol=${pos.symbol}`);
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <TokenLogo symbol={pos.symbol} size={20} />
                                                <span className="text-sm font-medium text-[#FFFF00]">
                                                    {pos.symbol.replace('-USD', '').replace('-PERP', '')}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${pos.side === 'long' ? 'bg-[#34C759]/20 text-[#34C759]' : 'bg-[#FF3B30]/20 text-[#FF3B30]'}`}>
                                                    {pos.side === 'long' ? 'LONG' : 'SHORT'} {pos.leverage}x
                                                </span>
                                            </div>
                                            <span className={`text-sm font-mono ${pos.unrealizedPnl >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                                                {pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-[#FFFF00]/50">
                                            <span>Size: {Math.abs(pos.size).toFixed(4)}</span>
                                            <span>Entry: ${pos.entryPrice.toFixed(2)}</span>
                                            <span>Mark: ${pos.markPrice.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-[#FFFF00]/40 text-sm py-6">
                                No Open Positions
                            </div>
                        )
                    )}
                    {bottomTab === 'orders' && (
                        <div className="text-center text-[#FFFF00]/40 text-sm py-6">
                            No Open Orders
                        </div>
                    )}
                    {bottomTab === 'history' && (
                        <div className="text-center text-[#FFFF00]/40 text-sm py-6">
                            No Trade History
                        </div>
                    )}
                </div>
            </div>

            {/* Fixed Bottom Nav */}
            <nav
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    backgroundColor: '#000000',
                    height: '60px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}
            >
                <div className="flex items-center justify-around h-full">
                    <button
                        onClick={() => router.push('/')}
                        className="flex flex-col items-center gap-1 px-4 py-2 transition-all border-none outline-none"
                        style={{
                            color: '#FFFF00',
                            background: 'transparent',
                            opacity: 0.6
                        }}
                    >
                        <BarChart2 className="w-6 h-6" strokeWidth={2} />
                        <span className="text-[10px] font-semibold">Markets</span>
                    </button>
                    <button
                        className="flex flex-col items-center gap-1 px-4 py-2 transition-all border-none outline-none scale-110"
                        style={{
                            color: '#FFFF00',
                            background: 'transparent',
                            filter: 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))',
                            opacity: 1
                        }}
                    >
                        <List className="w-6 h-6" strokeWidth={2} />
                        <span className="text-[10px] font-semibold">Trade</span>
                    </button>
                    <button
                        onClick={() => router.push('/profile')}
                        className="flex flex-col items-center gap-1 px-4 py-2 transition-all border-none outline-none"
                        style={{
                            color: '#FFFF00',
                            background: 'transparent',
                            opacity: 0.6
                        }}
                    >
                        <Clock className="w-6 h-6" strokeWidth={2} />
                        <span className="text-[10px] font-semibold">Account</span>
                    </button>
                </div>
            </nav>

            {/* Market Selector Modal */}
            {showMarketSelector && (() => {
                // Filter markets by tab and search
                const filteredMarkets = markets.filter(m => {
                    if (marketTab === 'stocks') {
                        if (!m.isStock && !m.onlyIsolated) return false;
                    } else {
                        if (m.isStock || m.onlyIsolated) return false;
                    }
                    if (marketSearch) {
                        const query = marketSearch.toLowerCase();
                        return m.symbol.toLowerCase().includes(query) || m.name.toLowerCase().includes(query);
                    }
                    return true;
                });

                // Sort markets
                const sortedMarkets = [...filteredMarkets].sort((a, b) => {
                    let aVal: number | string, bVal: number | string;
                    switch (sortColumn) {
                        case 'name':
                            aVal = a.name.toLowerCase();
                            bVal = b.name.toLowerCase();
                            break;
                        case 'price':
                            aVal = a.price || 0;
                            bVal = b.price || 0;
                            break;
                        case 'volume':
                            aVal = a.volume24h || 0;
                            bVal = b.volume24h || 0;
                            break;
                        case 'change':
                            aVal = a.change24h || 0;
                            bVal = b.change24h || 0;
                            break;
                        default:
                            return 0;
                    }
                    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                });

                const handleSort = (col: typeof sortColumn) => {
                    if (sortColumn === col) {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                        setSortColumn(col);
                        setSortDirection('desc');
                    }
                };

                return (
                    <div
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
                        onClick={() => { setShowMarketSelector(false); setMarketSearch(''); }}
                    >
                        <div
                            className="h-full flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Select Market</h3>
                                <button onClick={() => { setShowMarketSelector(false); setMarketSearch(''); }}>
                                    <X className="w-5 h-5 text-white/60" />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="px-4 py-3 border-b border-white/10">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={marketSearch}
                                        onChange={e => setMarketSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] text-white text-sm rounded-lg border border-white/10 outline-none focus:border-[#00D4AA]/50"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-white/10">
                                <button
                                    onClick={() => setMarketTab('crypto')}
                                    className={`flex-1 py-2.5 text-sm font-medium ${marketTab === 'crypto' ? 'text-[#00D4AA] border-b-2 border-[#00D4AA]' : 'text-white/50'
                                        }`}
                                >
                                    Crypto
                                </button>
                                <button
                                    onClick={() => setMarketTab('stocks')}
                                    className={`flex-1 py-2.5 text-sm font-medium ${marketTab === 'stocks' ? 'text-[#00D4AA] border-b-2 border-[#00D4AA]' : 'text-white/50'
                                        }`}
                                >
                                    Stocks
                                </button>
                            </div>

                            {/* Column Headers */}
                            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-medium text-white/40 border-b border-white/5">
                                <button onClick={() => handleSort('name')} className="col-span-5 flex items-center gap-1">
                                    Market {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </button>
                                <button onClick={() => handleSort('price')} className="col-span-3 text-right">
                                    Price {sortColumn === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </button>
                                <button onClick={() => handleSort('change')} className="col-span-4 text-right">
                                    24h % {sortColumn === 'change' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </button>
                            </div>

                            {/* Market List */}
                            <div className="flex-1 overflow-auto">
                                {sortedMarkets.slice(0, 50).map(m => {
                                    const isSelected = m.symbol === symbol;
                                    const mIsPositive = (m.change24h || 0) >= 0;

                                    return (
                                        <button
                                            key={m.symbol}
                                            onClick={() => {
                                                setSymbol(m.symbol);
                                                setSelectedMarket(m.symbol);
                                                setShowMarketSelector(false);
                                                setMarketSearch('');
                                                router.replace(`/trade?symbol=${m.symbol}`);
                                            }}
                                            className={`w-full grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/5 ${isSelected ? 'bg-[#00D4AA]/10' : ''
                                                }`}
                                        >
                                            <div className="col-span-5 flex items-center gap-2">
                                                <TokenLogo symbol={m.symbol} size={24} />
                                                <div className="text-left">
                                                    <div className="text-sm font-medium text-white">{m.name}</div>
                                                    <div className="text-[10px] text-white/40">{m.maxLeverage}x</div>
                                                </div>
                                            </div>
                                            <div className="col-span-3 text-right text-sm font-mono text-white">
                                                ${m.price ? formatPrice(m.price) : '---'}
                                            </div>
                                            <div className={`col-span-4 text-right text-sm font-mono ${mIsPositive ? 'text-[#00D4AA]' : 'text-[#FF5555]'
                                                }`}>
                                                {mIsPositive ? '+' : ''}{(m.change24h || 0).toFixed(2)}%
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

export default function TradePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#00D4AA] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <TradePageContent />
        </Suspense>
    );
}

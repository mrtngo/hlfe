'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useWallets } from '@privy-io/react-auth';
import { useCurrency } from '@/context/CurrencyContext';
import { useCandleData, type Timeframe } from '@/hooks/useCandleData';
import {
    TrendingUp,
    TrendingDown,
    Loader2,
    AlertCircle,
    ArrowDown,
    ArrowUp,
    ChevronDown,
    Search,
    X,
    DollarSign,
    Activity,
    ArrowUpCircle,
    ArrowDownCircle
} from 'lucide-react';
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area } from 'recharts';
import TokenLogo from '@/components/TokenLogo';
import { API_URL } from '@/lib/hyperliquid/client';

// Colors matching the app theme
const RAYO_YELLOW = '#FFD60A';

interface SpotToken {
    name: string;
    szDecimals: number;
    index: number;
    tokenId: string;
}

interface SpotPair {
    name: string;
    tokens: [number, number];
    index: number;
    baseName?: string;
    price?: number;
    change24h?: number;
    volume24h?: number;
}

interface SpotBalance {
    coin: string;
    token: number;
    hold: string;
    total: string;
}

// Stats card component matching MarketStats design
type StatVariant = 'brand' | 'info' | 'positive' | 'negative';

interface StatCardProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    variant: StatVariant;
}

function StatCard({ icon: Icon, label, value, variant }: StatCardProps) {
    const variantStyles: Record<StatVariant, { border: string; shadow: string; iconColor: string; valueColor: string }> = {
        brand: {
            border: 'border-yellow-500/25',
            shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.3),0_0_8px_rgba(255,214,10,0.15)]',
            iconColor: 'text-yellow-500',
            valueColor: 'text-yellow-500',
        },
        info: {
            border: 'border-blue-500/25',
            shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.3),0_0_8px_rgba(59,130,246,0.08)]',
            iconColor: 'text-blue-500',
            valueColor: 'text-blue-500',
        },
        positive: {
            border: 'border-green-500/25',
            shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.3),0_0_8px_rgba(34,197,94,0.15)]',
            iconColor: 'text-green-500',
            valueColor: 'text-green-500',
        },
        negative: {
            border: 'border-red-500/25',
            shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.3),0_0_8px_rgba(239,68,68,0.15)]',
            iconColor: 'text-red-500',
            valueColor: 'text-red-500',
        },
    };

    const style = variantStyles[variant];

    return (
        <div className={`bg-bg-secondary rounded-xl p-3 ${style.border} border ${style.shadow}`}>
            <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3 h-3 ${style.iconColor}`} />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/60">
                    {label}
                </span>
            </div>
            <div className={`font-mono font-bold text-xs ${style.valueColor}`}>
                {value}
            </div>
        </div>
    );
}

export default function SpotTradingPanel() {
    const { formatCurrency } = useCurrency();
    const { address, connected } = useHyperliquid();
    const { wallets } = useWallets();
    const activeWallet = wallets?.[0];

    // State
    const [tokens, setTokens] = useState<SpotToken[]>([]);
    const [pairs, setPairs] = useState<SpotPair[]>([]);
    const [selectedPair, setSelectedPair] = useState<SpotPair | null>(null);
    const [balances, setBalances] = useState<SpotBalance[]>([]);

    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Trading
    const [isBuy, setIsBuy] = useState(true);
    const [amount, setAmount] = useState('');
    const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
    const [limitPrice, setLimitPrice] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fetchingData, setFetchingData] = useState(true);

    // Chart timeframe
    const [timeframe, setTimeframe] = useState<Timeframe>('1h');
    const timeframes: { value: Timeframe; label: string }[] = [
        { value: '5m', label: '5m' },
        { value: '15m', label: '15m' },
        { value: '30m', label: '30m' },
        { value: '1h', label: '1h' },
        { value: '4h', label: '4h' },
        { value: '1d', label: '1d' },
    ];

    // Fetch candle data for the simple chart
    const { candles, loading: chartLoading } = useCandleData(selectedPair?.baseName || 'BTC', timeframe, false, 7);

    // Format chart data
    const chartData = useMemo(() => {
        return candles.map(candle => ({
            time: new Date(candle.time * 1000).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }),
            timestamp: candle.time,
            price: candle.close,
        }));
    }, [candles]);

    // Y-axis domain
    const { yDomainMin, yDomainMax } = useMemo(() => {
        if (chartData.length === 0) return { yDomainMin: 0, yDomainMax: 100 };
        const prices = chartData.map(d => d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        return {
            yDomainMin: minPrice - (priceRange * 0.05),
            yDomainMax: maxPrice + (priceRange * 0.05)
        };
    }, [chartData]);

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-black/90 px-3 py-2 rounded-xl border border-white/10">
                    <p className="text-sm font-bold text-white">{formatCurrency(data.price)}</p>
                </div>
            );
        }
        return null;
    };

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
                setSearchQuery('');
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isDropdownOpen]);

    // Fetch spot metadata and asset contexts
    const fetchSpotData = useCallback(async () => {
        try {
            setFetchingData(true);

            const response = await fetch(`${API_URL}/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'spotMetaAndAssetCtxs' }),
            });

            const data = await response.json();

            if (data && Array.isArray(data)) {
                const [meta, contexts] = data;

                if (meta.tokens) {
                    setTokens(meta.tokens);
                }

                if (meta.universe && contexts) {
                    const pairsWithData: SpotPair[] = meta.universe.map((p: any, idx: number) => {
                        const baseToken = meta.tokens.find((t: SpotToken) => t.index === p.tokens[0]);
                        const ctx = contexts[idx];

                        return {
                            ...p,
                            baseName: baseToken?.name,
                            price: ctx?.markPx ? parseFloat(ctx.markPx) : 0,
                            change24h: ctx?.prevDayPx && parseFloat(ctx.prevDayPx) > 0 ?
                                ((parseFloat(ctx.markPx) - parseFloat(ctx.prevDayPx)) / parseFloat(ctx.prevDayPx)) * 100
                                : 0,
                            volume24h: ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0,
                        };
                    });

                    // Deduplicate pairs by baseName
                    const seenBaseNames = new Set<string>();
                    const uniquePairs = pairsWithData.filter(p => {
                        if (!p.baseName || seenBaseNames.has(p.baseName)) return false;
                        seenBaseNames.add(p.baseName);
                        return true;
                    });

                    setPairs(uniquePairs);

                    // Select BTC by default, or first pair
                    const defaultPair = uniquePairs.find(p => p.baseName === 'BTC') || uniquePairs[0];
                    setSelectedPair(defaultPair || null);
                }
            }
        } catch (err) {
            console.error('Failed to fetch spot data:', err);
        } finally {
            setFetchingData(false);
        }
    }, []);

    // Fetch user's spot balances
    const fetchBalances = useCallback(async () => {
        if (!address) return;

        try {
            const response = await fetch(`${API_URL}/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'spotClearinghouseState',
                    user: address,
                }),
            });

            const data = await response.json();

            if (data?.balances) {
                setBalances(data.balances);
            }
        } catch (err) {
            console.error('Failed to fetch spot balances:', err);
        }
    }, [address]);

    useEffect(() => {
        fetchSpotData();
    }, [fetchSpotData]);

    useEffect(() => {
        if (address) {
            fetchBalances();
        }
    }, [address, fetchBalances]);

    // Filter pairs by search
    const filteredPairs = useMemo(() => {
        if (!searchQuery) return pairs;
        const query = searchQuery.toLowerCase();
        return pairs.filter(p =>
            p.baseName?.toLowerCase().includes(query) ||
            p.name.toLowerCase().includes(query)
        );
    }, [pairs, searchQuery]);

    // Handle pair selection
    const handleSelectPair = (pair: SpotPair) => {
        setSelectedPair(pair);
        setIsDropdownOpen(false);
        setSearchQuery('');
        setAmount('');
    };

    // Handle spot order
    const handleOrder = async () => {
        if (!activeWallet || !address || !selectedPair || !amount) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const provider = await activeWallet.getEthereumProvider();
            const nonce = Date.now();
            const baseToken = tokens.find(t => t.name === selectedPair.baseName);

            if (!baseToken) throw new Error('Token not found');

            const assetIndex = 10000 + selectedPair.index;
            const midPx = selectedPair.price || 0;

            // For market orders, use slippage; for limit orders, use user-specified price
            let orderPrice: string;
            let tif: string;

            if (orderType === 'limit') {
                const userLimitPrice = parseFloat(limitPrice);
                if (!userLimitPrice || userLimitPrice <= 0) {
                    throw new Error('Please enter a valid limit price');
                }
                orderPrice = userLimitPrice.toFixed(6);
                tif = 'Gtc'; // Good-til-cancel for limit orders
            } else {
                // Market order with slippage
                const slippageBps = 100; // 1% slippage
                orderPrice = isBuy
                    ? (midPx * (1 + slippageBps / 10000)).toFixed(6)
                    : (midPx * (1 - slippageBps / 10000)).toFixed(6);
                tif = 'Ioc'; // Immediate-or-cancel for market orders
            }

            const orderAction = {
                type: 'order',
                orders: [{
                    a: assetIndex,
                    b: isBuy,
                    p: orderPrice,
                    s: amount,
                    r: false,
                    t: { limit: { tif } },
                }],
                grouping: 'na',
            };

            const domain = {
                name: 'Exchange',
                version: '1',
                chainId: 1337,
                verifyingContract: '0x0000000000000000000000000000000000000000',
            };

            const signature = await provider.request({
                method: 'eth_signTypedData_v4',
                params: [
                    address,
                    JSON.stringify({
                        domain,
                        types: {
                            EIP712Domain: [
                                { name: 'name', type: 'string' },
                                { name: 'version', type: 'string' },
                                { name: 'chainId', type: 'uint256' },
                                { name: 'verifyingContract', type: 'address' },
                            ],
                            'Agent': [
                                { name: 'source', type: 'string' },
                                { name: 'connectionId', type: 'bytes32' },
                            ],
                        },
                        primaryType: 'Agent',
                        message: {
                            source: 'a',
                            connectionId: '0x' + '0'.repeat(64),
                        },
                    }),
                ],
            });

            const sig = signature.slice(2);
            const r = '0x' + sig.slice(0, 64);
            const s = '0x' + sig.slice(64, 128);
            const v = parseInt(sig.slice(128, 130), 16);

            const response = await fetch(`${API_URL}/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: orderAction,
                    nonce,
                    signature: { r, s, v },
                }),
            });

            const result = await response.json();

            if (result.status === 'ok') {
                setSuccess('Order placed successfully!');
                setAmount('');
                fetchBalances();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                throw new Error(result.response?.data || 'Order failed');
            }
        } catch (err: any) {
            console.error('Spot order error:', err);
            setError(err.message || 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    // Get balance for a token
    const getBalance = (tokenName: string): number => {
        const balance = balances.find(b => b.coin === tokenName);
        return balance ? parseFloat(balance.total) : 0;
    };

    const usdcBalance = getBalance('USDC');
    const baseBalance = selectedPair?.baseName ? getBalance(selectedPair.baseName) : 0;
    const amountNum = parseFloat(amount || '0');

    // Calculate max amount
    const maxAmount = isBuy
        ? (selectedPair?.price ? usdcBalance / selectedPair.price : 0)
        : baseBalance;

    const isValidAmount = amountNum > 0 && amountNum <= maxAmount;

    // Price info
    const currentPrice = selectedPair?.price || 0;
    const priceChange = selectedPair?.change24h || 0;
    const isPositive = priceChange >= 0;

    // Total value
    const totalValue = amountNum * currentPrice;

    // Smart price formatting for coins with very low prices
    const formatSmartPrice = (price: number): string => {
        if (price === 0) return '$0.00';
        if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const absPrice = Math.abs(price);
        return formatCurrency(price);
    };

    // Format large numbers
    const formatLargeNumber = (value: number): string => {
        if (value >= 1_000_000_000) {
            return `$${(value / 1_000_000_000).toFixed(2)}B`;
        } else if (value >= 1_000_000) {
            return `$${(value / 1_000_000).toFixed(2)}M`;
        } else if (value >= 1_000) {
            return `$${(value / 1_000).toFixed(2)}K`;
        } else {
            return formatSmartPrice(value);
        }
    };

    // Stats for selected pair
    const prevDayPrice = currentPrice / (1 + priceChange / 100);
    const estimatedHigh = priceChange >= 0 ? currentPrice : Math.max(currentPrice, prevDayPrice);
    const estimatedLow = priceChange >= 0 ? Math.min(currentPrice, prevDayPrice) : currentPrice;

    if (fetchingData) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Market Selector - Matching Trade Tab Design */}
            <div className="relative" ref={dropdownRef}>
                <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full p-4 rounded-xl transition-all flex items-center justify-between gap-4"
                    style={{
                        backgroundColor: '#000000',
                        border: 'none',
                        boxShadow: isDropdownOpen
                            ? '0 8px 24px rgba(0, 0, 0, 0.65), 0 0 12px rgba(255, 255, 0, 0.18)'
                            : '0 4px 12px rgba(0, 0, 0, 0.45)',
                    }}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <TokenLogo symbol={selectedPair?.baseName || 'BTC'} size={36} />
                        <div className="min-w-0">
                            <div className="text-sm font-semibold truncate text-white">
                                {selectedPair?.baseName || 'BTC'}
                            </div>
                            <div className="text-[11px] text-white/60">
                                Tap to change market
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                            <div className="font-mono font-bold text-sm text-white">
                                {currentPrice > 0 ? formatSmartPrice(currentPrice) : '---'}
                            </div>
                            <div className={`flex items-center justify-end gap-1 text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span className="font-mono font-semibold">
                                    {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-white transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {/* Dropdown */}
                {isDropdownOpen && (
                    <div
                        className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl z-50 overflow-hidden"
                        style={{
                            backgroundColor: '#000000',
                            border: '2px solid rgba(255, 255, 0, 0.5)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 255, 0, 0.2)',
                        }}
                    >
                        {/* Search */}
                        <div className="p-4 border-b border-white/10">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-yellow-500" />
                                <input
                                    type="text"
                                    placeholder="Search spot markets..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-10 py-3 rounded-xl font-semibold text-white placeholder-white/40"
                                    style={{
                                        backgroundColor: '#0a0a0a',
                                        border: '2px solid rgba(255, 255, 0, 0.3)',
                                        outline: 'none',
                                    }}
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-yellow-500 transition-colors p-1"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Market List */}
                        <div className="max-h-[360px] overflow-y-auto p-4 space-y-2">
                            {filteredPairs.length === 0 ? (
                                <div className="text-center py-8 text-sm font-semibold text-white/60">No markets found</div>
                            ) : (
                                filteredPairs.map((pair) => {
                                    const isSelected = pair.baseName === selectedPair?.baseName;
                                    const pairIsPositive = (pair.change24h || 0) >= 0;

                                    return (
                                        <button
                                            key={pair.index}
                                            type="button"
                                            onClick={() => handleSelectPair(pair)}
                                            className="w-full text-left p-3 transition-all rounded-xl hover:scale-[1.02]"
                                            style={{
                                                backgroundColor: isSelected ? 'rgba(250, 204, 21, 0.15)' : '#0a0a0a',
                                                border: isSelected ? '2px solid #FACC15' : '2px solid rgba(255, 255, 255, 0.1)',
                                                boxShadow: isSelected ? '0 4px 16px rgba(250, 204, 21, 0.3)' : 'none',
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <TokenLogo symbol={pair.baseName || ''} size={28} />
                                                    <div>
                                                        <div className="font-bold text-sm text-white">{pair.baseName}</div>
                                                        <div className="text-xs text-white/50">{pair.name}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono font-semibold text-sm text-white">
                                                        {pair.price ? formatSmartPrice(pair.price) : '---'}
                                                    </div>
                                                    <div className={`flex items-center justify-end gap-1 text-xs ${pairIsPositive ? 'text-green-500' : 'text-red-500'}`}>
                                                        {pairIsPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                        <span className="font-mono font-semibold">
                                                            {pairIsPositive ? '+' : ''}{(pair.change24h || 0).toFixed(2)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Cards - Matching Trade Tab Design */}
            <div className="grid grid-cols-3 gap-2">
                <StatCard
                    icon={DollarSign}
                    label="24H VOLUME"
                    value={formatLargeNumber(selectedPair?.volume24h || 0)}
                    variant="info"
                />
                <StatCard
                    icon={ArrowUpCircle}
                    label="24H HIGH"
                    value={formatSmartPrice(estimatedHigh)}
                    variant="positive"
                />
                <StatCard
                    icon={ArrowDownCircle}
                    label="24H LOW"
                    value={formatSmartPrice(estimatedLow)}
                    variant="negative"
                />
            </div>

            {/* Chart Section */}
            <div className="bg-bg-secondary rounded-xl p-4">
                {/* Chart Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-white">
                        {selectedPair?.baseName} · {timeframe}
                    </div>
                </div>

                {/* Timeframe Selector */}
                <div className="flex gap-1 mb-3 flex-wrap">
                    {timeframes.map((tf) => (
                        <button
                            key={tf.value}
                            onClick={() => setTimeframe(tf.value)}
                            className={`px-2 py-1 rounded text-xs font-semibold transition-all ${timeframe === tf.value
                                ? 'bg-yellow-500 text-black'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                {/* Chart */}
                <div className="h-[200px] w-full">
                    {chartLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                    ) : chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="spotFillGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={RAYO_YELLOW} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={RAYO_YELLOW} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <YAxis hide domain={[yDomainMin, yDomainMax]} />
                                <XAxis hide dataKey="time" />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: RAYO_YELLOW, strokeWidth: 1, strokeDasharray: '3 3' }} />
                                <Area
                                    type="monotone"
                                    dataKey="price"
                                    fill="url(#spotFillGradient)"
                                    stroke="none"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="price"
                                    stroke={RAYO_YELLOW}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: RAYO_YELLOW }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-white/40 text-sm">
                            No chart data
                        </div>
                    )}
                </div>
            </div>

            {/* Holdings Section */}
            <div className="bg-bg-secondary rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-bold text-white">Holdings</span>
                    </div>
                </div>

                {baseBalance > 0 ? (
                    <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <TokenLogo symbol={selectedPair?.baseName || 'BTC'} size={32} />
                                <div>
                                    <div className="text-sm font-bold text-white">{selectedPair?.baseName}</div>
                                    <div className="text-xs text-white/50 font-mono">{baseBalance > 0 ? baseBalance.toFixed(6) : '0.000000'}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-white font-mono">
                                    {formatSmartPrice(baseBalance * currentPrice)}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <div className="text-white/40 text-sm">No {selectedPair?.baseName} holdings</div>
                        <div className="text-xs text-white/30 mt-1">{selectedPair?.baseName}</div>
                        <div className="text-sm font-mono text-white mt-1">{formatSmartPrice(currentPrice)}</div>
                    </div>
                )}
            </div>

            {/* Trading Card */}
            <div className="bg-bg-secondary rounded-xl p-4">
                {/* Buy/Sell Toggle - Matching Trade Tab */}
                <div className="grid grid-cols-2 gap-0 mb-4">
                    <button
                        onClick={() => setIsBuy(true)}
                        className={`py-3 rounded-l-xl font-bold transition-all flex items-center justify-center gap-2 ${isBuy
                            ? 'bg-yellow-500 text-black'
                            : 'bg-black/30 text-red-500 border border-white/10'
                            }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Buy
                    </button>
                    <button
                        onClick={() => setIsBuy(false)}
                        className={`py-3 rounded-r-xl font-bold transition-all flex items-center justify-center gap-2 ${!isBuy
                            ? 'bg-black/30 text-red-500 border border-red-500/50'
                            : 'bg-black/30 text-red-500/50 border border-white/10'
                            }`}
                    >
                        <TrendingDown className="w-4 h-4" />
                        Sell
                    </button>
                </div>

                {/* Order Type Toggle - Market/Limit */}
                <div className="grid grid-cols-2 gap-0 mb-4">
                    <button
                        onClick={() => setOrderType('market')}
                        className={`py-2.5 rounded-l-xl text-sm font-semibold transition-all ${orderType === 'market'
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'bg-black/20 text-white/50 border border-white/5 hover:text-white/70'
                            }`}
                    >
                        Market
                    </button>
                    <button
                        onClick={() => {
                            setOrderType('limit');
                            // Pre-fill with current price if empty
                            if (!limitPrice && currentPrice > 0) {
                                setLimitPrice(currentPrice.toFixed(2));
                            }
                        }}
                        className={`py-2.5 rounded-r-xl text-sm font-semibold transition-all ${orderType === 'limit'
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'bg-black/20 text-white/50 border border-white/5 hover:text-white/70'
                            }`}
                    >
                        Limit
                    </button>
                </div>

                {/* Limit Price Input - Only show for limit orders */}
                {orderType === 'limit' && (
                    <div className="mb-4">
                        <div className="flex justify-between text-xs mb-2">
                            <span className="text-white/50">Limit Price</span>
                            <button
                                onClick={() => setLimitPrice(currentPrice.toFixed(6))}
                                className="text-yellow-500 hover:underline font-semibold"
                            >
                                Use Current: {formatSmartPrice(currentPrice)}
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                value={limitPrice}
                                onChange={(e) => setLimitPrice(e.target.value)}
                                placeholder={currentPrice.toFixed(2)}
                                step="any"
                                min="0"
                                className="w-full py-3 px-4 pr-16 bg-black/30 border border-white/10 rounded-xl text-white text-lg font-mono focus:border-yellow-500/50 outline-none"
                                style={{ fontSize: '16px' }}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 text-sm font-semibold">
                                USD
                            </span>
                        </div>
                    </div>
                )}

                {/* Balances */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-black/30 border border-white/5 rounded-xl">
                        <div className="text-[10px] text-white/50 mb-0.5">USDC</div>
                        <div className="text-white font-mono font-semibold">{formatCurrency(usdcBalance)}</div>
                    </div>
                    <div className="p-3 bg-black/30 border border-white/5 rounded-xl">
                        <div className="text-[10px] text-white/50 mb-0.5">{selectedPair?.baseName}</div>
                        <div className="text-white font-mono font-semibold">{baseBalance > 0 ? baseBalance.toFixed(4) : '0.0000'}</div>
                    </div>
                </div>

                {/* Amount Input */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-white/50">Amount</span>
                        <button
                            onClick={() => setAmount(maxAmount.toFixed(6))}
                            className="text-yellow-500 hover:underline font-semibold"
                        >
                            Max: {maxAmount.toFixed(4)}
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                setError('');
                                setSuccess('');
                            }}
                            placeholder="0.00"
                            step="any"
                            min="0"
                            className="w-full py-3 px-4 pr-16 bg-black/30 border border-white/10 rounded-xl text-white text-lg font-mono focus:border-yellow-500/50 outline-none"
                            style={{ fontSize: '16px' }}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 text-sm font-semibold">
                            {selectedPair?.baseName}
                        </span>
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2 mb-4">
                    {[25, 50, 75, 100].map(pct => (
                        <button
                            key={pct}
                            onClick={() => setAmount((maxAmount * pct / 100).toFixed(6))}
                            className="flex-1 py-2 text-xs font-semibold text-white/50 hover:text-yellow-500 bg-black/30 hover:bg-yellow-500/10 rounded-lg transition-all"
                        >
                            {pct}%
                        </button>
                    ))}
                </div>

                {/* Order Summary */}
                {amountNum > 0 && currentPrice > 0 && (
                    <div className="p-3 bg-black/30 border border-white/10 rounded-xl mb-4 text-sm">
                        <div className="flex justify-between mb-1">
                            <span className="text-white/50">Order Type</span>
                            <span className="text-white font-semibold">{orderType === 'limit' ? 'Limit' : 'Market'}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                            <span className="text-white/50">{orderType === 'limit' ? 'Limit Price' : 'Est. Price'}</span>
                            <span className="text-white font-mono">
                                {orderType === 'limit' && limitPrice
                                    ? formatSmartPrice(parseFloat(limitPrice))
                                    : formatSmartPrice(currentPrice)}
                            </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-white/5">
                            <span className="text-white/50">{isBuy ? 'Total' : 'Receive'}</span>
                            <span className="text-yellow-500 font-mono font-bold">
                                {formatSmartPrice(orderType === 'limit' && limitPrice
                                    ? amountNum * parseFloat(limitPrice)
                                    : totalValue)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Messages */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-500 mb-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-500 mb-4">
                        ✅ {success}
                    </div>
                )}
                {!connected && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-500 mb-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Connect wallet to trade
                    </div>
                )}

                {/* Action Button */}
                <button
                    onClick={handleOrder}
                    disabled={loading || !isValidAmount || !connected || !selectedPair}
                    className={`w-full py-4 rounded-full font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${isBuy
                        ? 'bg-yellow-500 hover:brightness-110 text-black'
                        : 'bg-black border border-red-500/50 text-red-500 hover:bg-red-500/10'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            {isBuy ? <ArrowDown className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
                            {isBuy ? 'Buy' : 'Sell'} {selectedPair?.baseName}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

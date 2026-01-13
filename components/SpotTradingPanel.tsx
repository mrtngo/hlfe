'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
    ArrowUp
} from 'lucide-react';
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area } from 'recharts';
import TokenLogo from '@/components/TokenLogo';
import { API_URL } from '@/lib/hyperliquid/client';

// Colors matching the app theme
const RAYO_YELLOW = '#FFD60A';

// Spot assets we support
const SPOT_ASSETS = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'HYPE', name: 'Hyperliquid' },
    { symbol: 'SOL', name: 'Solana' }
];

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
}

interface SpotBalance {
    coin: string;
    token: number;
    hold: string;
    total: string;
}

export default function SpotTradingPanel() {
    const { formatCurrency } = useCurrency();
    const { address, connected } = useHyperliquid();
    const { wallets } = useWallets();
    const activeWallet = wallets?.[0];

    // State
    const [tokens, setTokens] = useState<SpotToken[]>([]);
    const [pairs, setPairs] = useState<SpotPair[]>([]);
    const [selectedAsset, setSelectedAsset] = useState(SPOT_ASSETS[0]);
    const [selectedPair, setSelectedPair] = useState<SpotPair | null>(null);
    const [balances, setBalances] = useState<SpotBalance[]>([]);

    // Trading
    const [isBuy, setIsBuy] = useState(true);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fetchingData, setFetchingData] = useState(true);

    // Chart timeframe
    const [timeframe] = useState<Timeframe>('1h');

    // Fetch candle data for the simple chart
    const { candles, loading: chartLoading } = useCandleData(selectedAsset.symbol, timeframe, false, 7);

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
                    <p className="text-sm font-bold text-white">${data.price.toFixed(2)}</p>
                </div>
            );
        }
        return null;
    };

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

                    const pair = uniquePairs.find(p => p.baseName === selectedAsset.symbol);
                    setSelectedPair(pair || null);
                }
            }
        } catch (err) {
            console.error('Failed to fetch spot data:', err);
        } finally {
            setFetchingData(false);
        }
    }, [selectedAsset.symbol]);

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

    // Handle asset change
    const handleAssetChange = (asset: typeof SPOT_ASSETS[0]) => {
        setSelectedAsset(asset);
        const pair = pairs.find(p => p.baseName === asset.symbol);
        setSelectedPair(pair || null);
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
            const baseToken = tokens.find(t => t.name === selectedAsset.symbol);

            if (!baseToken) throw new Error('Token not found');

            const assetIndex = 10000 + selectedPair.index;
            const midPx = selectedPair.price || 0;
            const slippageBps = 100;
            const orderPrice = isBuy
                ? (midPx * (1 + slippageBps / 10000)).toFixed(6)
                : (midPx * (1 - slippageBps / 10000)).toFixed(6);

            const orderAction = {
                type: 'order',
                orders: [{
                    a: assetIndex,
                    b: isBuy,
                    p: orderPrice,
                    s: amount,
                    r: false,
                    t: { limit: { tif: 'Ioc' } },
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
    const baseBalance = getBalance(selectedAsset.symbol);
    const amountNum = parseFloat(amount || '0');

    // Calculate max amount
    const maxAmount = isBuy
        ? (selectedPair?.price ? usdcBalance / selectedPair.price : 0)
        : baseBalance;

    const isValidAmount = amountNum > 0 && amountNum <= maxAmount;

    // Price info - use selectedPair price directly
    const currentPrice = selectedPair?.price || 0;
    const priceChange = selectedPair?.change24h || 0;
    const isPositive = priceChange >= 0;

    // Total value
    const totalValue = amountNum * currentPrice;

    if (fetchingData) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header Card */}
            <div className="glass-card p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                <h2 className="text-2xl font-bold text-white mb-4 text-center relative z-10">💰 Spot Trading</h2>

                {/* Asset Pills */}
                <div className="flex items-center justify-center gap-2 flex-wrap relative z-10">
                    {SPOT_ASSETS.map(asset => {
                        const assetPair = pairs.find(p => p.baseName === asset.symbol);
                        const assetChange = assetPair?.change24h || 0;
                        const assetIsPositive = assetChange >= 0;
                        const isSelected = selectedAsset.symbol === asset.symbol;

                        return (
                            <button
                                key={asset.symbol}
                                onClick={() => handleAssetChange(asset)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95 ${isSelected
                                        ? 'bg-primary text-black'
                                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                                    }`}
                            >
                                <TokenLogo symbol={asset.symbol} size={20} />
                                <span>{asset.symbol}</span>
                                <span className={`text-[10px] font-mono ${isSelected ? 'text-black/70' : assetIsPositive ? 'text-bullish' : 'text-bearish'}`}>
                                    {assetIsPositive ? '+' : ''}{assetChange.toFixed(1)}%
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Price + Chart Card */}
            <div className="glass-card p-6">
                {/* Price Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <TokenLogo symbol={selectedAsset.symbol} size={40} />
                        <div>
                            <div className="text-xl font-bold text-white">{selectedAsset.symbol}</div>
                            <div className="text-xs text-coffee-medium">{selectedAsset.name}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-white font-mono">
                            {currentPrice > 0 ? formatCurrency(currentPrice) : '---'}
                        </div>
                        <div className={`flex items-center justify-end gap-1 text-sm ${isPositive ? 'text-bullish' : 'text-bearish'}`}>
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span className="font-mono">
                                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Simple Line Chart */}
                <div className="h-[180px] w-full">
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
                        <div className="flex items-center justify-center h-full text-coffee-medium text-sm">
                            No chart data
                        </div>
                    )}
                </div>
            </div>

            {/* Trading Card */}
            <div className="glass-card p-6">
                {/* Buy/Sell Toggle */}
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-5">
                    <button
                        onClick={() => setIsBuy(true)}
                        className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${isBuy
                                ? 'bg-bullish text-white'
                                : 'bg-transparent text-white/40 hover:text-white/60'
                            }`}
                    >
                        <ArrowDown className="w-4 h-4" />
                        Buy
                    </button>
                    <button
                        onClick={() => setIsBuy(false)}
                        className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${!isBuy
                                ? 'bg-bearish text-white'
                                : 'bg-transparent text-white/40 hover:text-white/60'
                            }`}
                    >
                        <ArrowUp className="w-4 h-4" />
                        Sell
                    </button>
                </div>

                {/* Balances */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                        <div className="text-[10px] text-coffee-medium mb-0.5">USDC</div>
                        <div className="text-white font-mono font-semibold">${usdcBalance.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                        <div className="text-[10px] text-coffee-medium mb-0.5">{selectedAsset.symbol}</div>
                        <div className="text-white font-mono font-semibold">{baseBalance.toFixed(4)}</div>
                    </div>
                </div>

                {/* Amount Input */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-coffee-medium">Amount</span>
                        <button
                            onClick={() => setAmount(maxAmount.toFixed(6))}
                            className="text-primary hover:underline font-semibold"
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
                            className="w-full py-3 px-4 pr-16 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-mono focus:border-primary/50 outline-none"
                            style={{ fontSize: '16px' }}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-coffee-medium text-sm font-semibold">
                            {selectedAsset.symbol}
                        </span>
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2 mb-5">
                    {[25, 50, 75, 100].map(pct => (
                        <button
                            key={pct}
                            onClick={() => setAmount((maxAmount * pct / 100).toFixed(6))}
                            className="flex-1 py-2 text-xs font-semibold text-white/50 hover:text-primary bg-white/5 hover:bg-primary/10 rounded-lg transition-all"
                        >
                            {pct}%
                        </button>
                    ))}
                </div>

                {/* Order Summary */}
                {amountNum > 0 && currentPrice > 0 && (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl mb-4 text-sm">
                        <div className="flex justify-between mb-1">
                            <span className="text-coffee-medium">Price</span>
                            <span className="text-white font-mono">{formatCurrency(currentPrice)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-white/5">
                            <span className="text-coffee-medium">{isBuy ? 'Total' : 'Receive'}</span>
                            <span className="text-primary font-mono font-bold">{formatCurrency(totalValue)}</span>
                        </div>
                    </div>
                )}

                {/* Messages */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-bearish/10 border border-bearish/20 rounded-xl text-sm text-bearish mb-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-3 bg-bullish/10 border border-bullish/20 rounded-xl text-sm text-bullish mb-4">
                        ✅ {success}
                    </div>
                )}
                {!connected && (
                    <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl text-sm text-primary mb-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Connect wallet to trade
                    </div>
                )}

                {/* Action Button */}
                <button
                    onClick={handleOrder}
                    disabled={loading || !isValidAmount || !connected || !selectedPair}
                    className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${isBuy
                            ? 'bg-bullish hover:brightness-110 text-white'
                            : 'bg-bearish hover:brightness-110 text-white'
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
                            {isBuy ? 'Buy' : 'Sell'} {selectedAsset.symbol}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

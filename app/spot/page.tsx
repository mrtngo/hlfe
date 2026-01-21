'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useWallets } from '@privy-io/react-auth';
import {
    ArrowLeft,
    ChevronDown,
    TrendingUp,
    TrendingDown,
    ArrowDown,
    ArrowUp,
    Loader2,
    RefreshCw,
    BarChart2,
    List,
    Clock,
    ArrowLeftRight,
    Search,
    X
} from 'lucide-react';
import TokenLogo from '@/components/TokenLogo';
import { API_URL } from '@/lib/hyperliquid/client';

// Dynamic import for CandlestickChart
const CandlestickChart = dynamic(() => import('@/components/CandlestickChart'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-black">
            <div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
        </div>
    ),
});

// Spot assets to support
const SPOT_ASSETS = [
    { symbol: 'BTC', name: 'Bitcoin', pair: 'BTC/USDC' },
    { symbol: 'ETH', name: 'Ethereum', pair: 'ETH/USDC' },
    { symbol: 'HYPE', name: 'Hyperliquid', pair: 'HYPE/USDC' },
    { symbol: 'SOL', name: 'Solana', pair: 'SOL/USDC' }
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

// Content tabs
type ContentTab = 'chart' | 'orderbook' | 'trades';
// Bottom tabs
type BottomTab = 'balances' | 'orders' | 'history';

export default function SpotTradingPage() {
    const router = useRouter();
    const { formatCurrency } = useLanguage();
    const { address, account, connected } = useHyperliquid();
    const { wallets } = useWallets();
    const activeWallet = wallets?.[0];

    // State
    const [tokens, setTokens] = useState<SpotToken[]>([]);
    const [pairs, setPairs] = useState<SpotPair[]>([]);
    const [selectedAsset, setSelectedAsset] = useState(SPOT_ASSETS[0]); // Default BTC
    const [selectedPair, setSelectedPair] = useState<SpotPair | null>(null);
    const [balances, setBalances] = useState<SpotBalance[]>([]);
    const [contentTab, setContentTab] = useState<ContentTab>('chart');
    const [bottomTab, setBottomTab] = useState<BottomTab>('balances');
    const [showMarketSelector, setShowMarketSelector] = useState(false);
    const [marketSearch, setMarketSearch] = useState('');

    // Trading
    const [isBuy, setIsBuy] = useState(true);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fetchingData, setFetchingData] = useState(true);

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

                    // Deduplicate pairs by baseName - keep only the first occurrence of each
                    const seenBaseNames = new Set<string>();
                    const uniquePairs = pairsWithData.filter(p => {
                        if (!p.baseName || seenBaseNames.has(p.baseName)) return false;
                        seenBaseNames.add(p.baseName);
                        return true;
                    });

                    setPairs(uniquePairs);

                    // Find the pair for selected asset
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

    // Initial fetch
    useEffect(() => {
        fetchSpotData();
    }, [fetchSpotData]);

    // Fetch balances when address changes
    useEffect(() => {
        if (address) {
            fetchBalances();
        }
    }, [address, fetchBalances]);

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
            const slippageBps = 100; // 1%
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
                setSuccess(`${isBuy ? 'Buy' : 'Sell'} successful!`);
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

    // Calculate price change
    const priceChange = selectedPair?.change24h || 0;
    const isPositive = priceChange >= 0;

    // Format price
    const formatPrice = (price: number) => {
        if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (price >= 1) return price.toFixed(4);
        return price.toFixed(6);
    };

    if (fetchingData) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#FFFF00] animate-spin" />
            </div>
        );
    }

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
                        <TokenLogo symbol={selectedAsset.symbol} size={24} />
                        <span className="font-bold text-[#FFFF00]">{selectedAsset.symbol}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-[#FFFF00]/20 text-[#FFFF00] rounded font-medium">
                            SPOT
                        </span>
                        <ChevronDown className="w-4 h-4 text-[#FFFF00]/60" />
                    </button>
                </div>

                {/* Price + Change */}
                <div className="text-right">
                    <div className="text-sm font-bold font-mono text-[#FFFF00]">
                        ${selectedPair?.price ? formatPrice(selectedPair.price) : '---'}
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
                        <CandlestickChart symbol={selectedAsset.symbol} height={250} />
                    </div>
                )}
                {contentTab === 'orderbook' && (
                    <div className="h-[300px] flex items-center justify-center text-white/40 text-sm">
                        Order book coming soon
                    </div>
                )}
                {contentTab === 'trades' && (
                    <div className="h-[300px] flex items-center justify-center text-white/40 text-sm">
                        Recent trades coming soon
                    </div>
                )}

                {/* Order Form */}
                <div className="border-t border-[#FFFF00]/20 p-4 space-y-4">
                    {/* Buy/Sell Toggle */}
                    <div className="flex gap-2 p-1 bg-[#0D0D0D] rounded-xl">
                        <button
                            onClick={() => setIsBuy(true)}
                            className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${isBuy
                                    ? 'bg-[#34C759] text-white'
                                    : 'bg-transparent text-white/50 hover:text-white'
                                }`}
                        >
                            <ArrowDown className="w-4 h-4" />
                            Buy
                        </button>
                        <button
                            onClick={() => setIsBuy(false)}
                            className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${!isBuy
                                    ? 'bg-[#FF3B30] text-white'
                                    : 'bg-transparent text-white/50 hover:text-white'
                                }`}
                        >
                            <ArrowUp className="w-4 h-4" />
                            Sell
                        </button>
                    </div>
                    {/* Balances */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[#1A1A1A] border border-white/10 rounded-xl">
                            <div className="text-xs text-white/50 mb-1">USDC</div>
                            <div className="text-white font-mono font-semibold">
                                ${usdcBalance.toFixed(2)}
                            </div>
                        </div>
                        <div className="p-3 bg-[#1A1A1A] border border-white/10 rounded-xl">
                            <div className="text-xs text-white/50 mb-1">{selectedAsset.symbol}</div>
                            <div className="text-white font-mono font-semibold">
                                {baseBalance.toFixed(4)}
                            </div>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-white/50">Amount ({selectedAsset.symbol})</span>
                            <button
                                onClick={() => setAmount(maxAmount.toFixed(4))}
                                className="text-[#FFFF00] hover:underline text-xs"
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
                                className="w-full py-4 px-4 pr-24 bg-[#1A1A1A] border border-white/10 rounded-xl text-white text-lg font-mono focus:border-[#FFFF00]/50 outline-none transition-all"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white font-semibold">
                                {selectedAsset.symbol}
                            </span>
                        </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="flex gap-2">
                        {[25, 50, 75, 100].map(pct => (
                            <button
                                key={pct}
                                onClick={() => setAmount((maxAmount * pct / 100).toFixed(4))}
                                className="flex-1 py-2 text-sm font-semibold text-white/60 hover:text-[#FFFF00] bg-white/5 hover:bg-[#FFFF00]/10 rounded-lg transition-all"
                            >
                                {pct}%
                            </button>
                        ))}
                    </div>

                    {/* Order Summary */}
                    {amountNum > 0 && selectedPair && (
                        <div className="p-4 bg-[#1A1A1A] border border-white/10 rounded-xl space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/50">Price</span>
                                <span className="text-white font-mono">${selectedPair.price?.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                                <span className="text-white/50">{isBuy ? 'Total to pay' : 'Total to receive'}</span>
                                <span className="text-[#FFFF00] font-mono font-bold">
                                    ${(amountNum * (selectedPair.price || 0)).toFixed(2)} USDC
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={handleOrder}
                        disabled={loading || !isValidAmount || !connected || !selectedPair}
                        className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${isBuy
                                ? 'bg-[#34C759] hover:bg-[#2DB34F] text-white'
                                : 'bg-[#FF3B30] hover:bg-[#E5342B] text-white'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        style={!loading && isValidAmount ? { boxShadow: `0 4px 16px ${isBuy ? 'rgba(52, 199, 89, 0.3)' : 'rgba(255, 59, 48, 0.3)'}` } : {}}
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

                    {/* Feedback */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
                            ✅ {success}
                        </div>
                    )}
                </div>

                {/* Bottom Tabs */}
                <div className="flex border-t border-b border-[#FFFF00]/20 bg-black">
                    <button
                        onClick={() => setBottomTab('balances')}
                        className={`flex-1 py-2.5 text-xs font-medium transition-colors bg-black ${bottomTab === 'balances'
                                ? 'text-[#FFFF00] border-b-2 border-[#FFFF00]'
                                : 'text-[#FFFF00]/50 hover:text-[#FFFF00]'
                            }`}
                    >
                        Balances
                    </button>
                    <button
                        onClick={() => setBottomTab('orders')}
                        className={`flex-1 py-2.5 text-xs font-medium transition-colors bg-black ${bottomTab === 'orders'
                                ? 'text-[#FFFF00] border-b-2 border-[#FFFF00]'
                                : 'text-[#FFFF00]/50 hover:text-[#FFFF00]'
                            }`}
                    >
                        Orders
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
                <div className="p-3 bg-black min-h-[120px]">
                    {bottomTab === 'balances' && (
                        balances.length > 0 ? (
                            <div className="space-y-2">
                                {balances.map(bal => {
                                    const balanceValue = parseFloat(bal.total);
                                    const holdValue = parseFloat(bal.hold);
                                    const available = balanceValue - holdValue;

                                    if (balanceValue === 0) return null;

                                    return (
                                        <div
                                            key={bal.coin}
                                            className="p-3 bg-[#1A1A1A] border border-white/10 rounded-lg"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <TokenLogo symbol={bal.coin} size={24} />
                                                    <span className="text-sm font-semibold text-white">{bal.coin}</span>
                                                </div>
                                                <span className="text-white font-mono font-bold">
                                                    {balanceValue.toFixed(bal.coin === 'USDC' ? 2 : 4)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-white/50">
                                                <span>Available: {available.toFixed(bal.coin === 'USDC' ? 2 : 4)}</span>
                                                {holdValue > 0 && <span>In Orders: {holdValue.toFixed(bal.coin === 'USDC' ? 2 : 4)}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center text-[#FFFF00]/40 text-sm py-6">
                                No Balances
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

                {/* Not Connected State */}
                {!connected && (
                    <div className="p-8 text-center">
                        <div className="text-white/40 mb-2">Connect your wallet</div>
                        <div className="text-white/20 text-sm">to start spot trading</div>
                    </div>
                )}
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
                        className="flex flex-col items-center gap-1 px-4 py-2 transition-all"
                        style={{
                            color: '#FFFF00',
                            opacity: 0.6
                        }}
                    >
                        <BarChart2 className="w-6 h-6" strokeWidth={2} />
                        <span className="text-[10px] font-semibold">Markets</span>
                    </button>
                    <button
                        onClick={() => router.push('/trade')}
                        className="flex flex-col items-center gap-1 px-4 py-2 transition-all"
                        style={{
                            color: '#FFFF00',
                            opacity: 0.6
                        }}
                    >
                        <List className="w-6 h-6" strokeWidth={2} />
                        <span className="text-[10px] font-semibold">Trade</span>
                    </button>
                    <button
                        className="flex flex-col items-center gap-1 px-4 py-2 transition-all scale-110"
                        style={{
                            color: '#FFFF00',
                            filter: 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))',
                            opacity: 1
                        }}
                    >
                        <ArrowLeftRight className="w-6 h-6" strokeWidth={2} />
                        <span className="text-[10px] font-semibold">Spot</span>
                    </button>
                    <button
                        onClick={() => router.push('/profile')}
                        className="flex flex-col items-center gap-1 px-4 py-2 transition-all"
                        style={{
                            color: '#FFFF00',
                            opacity: 0.6
                        }}
                    >
                        <Clock className="w-6 h-6" strokeWidth={2} />
                        <span className="text-[10px] font-semibold">Account</span>
                    </button>
                </div>
            </nav>

            {/* Market Selector Modal */}
            {showMarketSelector && (
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
                            <h3 className="text-lg font-bold text-white">Select Asset</h3>
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
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] text-white text-sm rounded-lg border border-white/10 outline-none focus:border-[#FFFF00]/50"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Column Headers */}
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-medium text-white/40 border-b border-white/5">
                            <div className="col-span-5">Asset</div>
                            <div className="col-span-3 text-right">Price</div>
                            <div className="col-span-4 text-right">24h %</div>
                        </div>

                        {/* Asset List */}
                        <div className="flex-1 overflow-auto">
                            {pairs
                                .filter(p => {
                                    if (!marketSearch) return true;
                                    const query = marketSearch.toLowerCase();
                                    return p.baseName?.toLowerCase().includes(query) || p.name.toLowerCase().includes(query);
                                })
                                .slice(0, 50)
                                .map(p => {
                                    const isSelected = p.baseName === selectedAsset.symbol;
                                    const pIsPositive = (p.change24h || 0) >= 0;
                                    const spotAsset = SPOT_ASSETS.find(a => a.symbol === p.baseName);

                                    return (
                                        <button
                                            key={p.name}
                                            onClick={() => {
                                                if (spotAsset) {
                                                    setSelectedAsset(spotAsset);
                                                } else {
                                                    // Handle non-predefined assets
                                                    setSelectedAsset({
                                                        symbol: p.baseName || p.name,
                                                        name: p.baseName || p.name,
                                                        pair: `${p.baseName}/USDC`
                                                    });
                                                }
                                                setSelectedPair(p);
                                                setShowMarketSelector(false);
                                                setMarketSearch('');
                                            }}
                                            className={`w-full grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/5 ${isSelected ? 'bg-[#FFFF00]/10' : ''}`}
                                        >
                                            <div className="col-span-5 flex items-center gap-2">
                                                <TokenLogo symbol={p.baseName || p.name} size={24} />
                                                <div className="text-left">
                                                    <div className="text-sm font-medium text-white">{p.baseName || p.name}</div>
                                                    <div className="text-[10px] text-white/40">SPOT</div>
                                                </div>
                                            </div>
                                            <div className="col-span-3 text-right text-sm font-mono text-white">
                                                ${p.price ? formatPrice(p.price) : '---'}
                                            </div>
                                            <div className={`col-span-4 text-right text-sm font-mono ${pIsPositive ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                                                {pIsPositive ? '+' : ''}{(p.change24h || 0).toFixed(2)}%
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

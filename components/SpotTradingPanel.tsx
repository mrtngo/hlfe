'use client';

import { useState, useEffect, useCallback } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useWallets } from '@privy-io/react-auth';
import { useLanguage } from '@/hooks/useLanguage';
import {
    ChevronDown,
    TrendingUp,
    TrendingDown,
    Loader2,
    X,
    ArrowDown,
    ArrowUp
} from 'lucide-react';
import TokenLogo from '@/components/TokenLogo';
import { API_URL } from '@/lib/hyperliquid/client';

// Spot assets we support
const SPOT_ASSETS = ['BTC', 'ETH', 'HYPE', 'SOL'];

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

type BottomTab = 'balances' | 'orders' | 'history';

export default function SpotTradingPanel() {
    const { formatCurrency } = useLanguage();
    const { address, connected } = useHyperliquid();
    const { wallets } = useWallets();
    const activeWallet = wallets?.[0];

    // State
    const [tokens, setTokens] = useState<SpotToken[]>([]);
    const [pairs, setPairs] = useState<SpotPair[]>([]);
    const [selectedAsset, setSelectedAsset] = useState('HYPE'); // Default HYPE
    const [selectedPair, setSelectedPair] = useState<SpotPair | null>(null);
    const [balances, setBalances] = useState<SpotBalance[]>([]);
    const [showAssetSelector, setShowAssetSelector] = useState(false);
    const [bottomTab, setBottomTab] = useState<BottomTab>('balances');

    // Trading
    const [side, setSide] = useState<'buy' | 'sell'>('buy');
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

                    setPairs(pairsWithData);

                    // Find the pair for selected asset
                    const pair = pairsWithData.find(p => p.baseName === selectedAsset);
                    setSelectedPair(pair || null);
                }
            }
        } catch (err) {
            console.error('Failed to fetch spot data:', err);
        } finally {
            setFetchingData(false);
        }
    }, [selectedAsset]);

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
            const baseToken = tokens.find(t => t.name === selectedAsset);

            if (!baseToken) throw new Error('Token not found');

            const assetIndex = 10000 + selectedPair.index;
            const midPx = selectedPair.price || 0;
            const slippageBps = 100; // 1%
            const orderPrice = side === 'buy'
                ? (midPx * (1 + slippageBps / 10000)).toFixed(6)
                : (midPx * (1 - slippageBps / 10000)).toFixed(6);

            const orderAction = {
                type: 'order',
                orders: [{
                    a: assetIndex,
                    b: side === 'buy',
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
    const baseBalance = getBalance(selectedAsset);
    const amountNum = parseFloat(amount || '0');

    // Calculate max amount
    const maxAmount = side === 'buy'
        ? (selectedPair?.price ? usdcBalance / selectedPair.price : 0)
        : baseBalance;

    const isValidAmount = amountNum > 0 && amountNum <= maxAmount;

    // Calculate price change
    const priceChange = selectedPair?.change24h || 0;
    const isPositive = priceChange >= 0;

    // Format price
    const formatPrice = (p: number) => {
        if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (p >= 1) return p.toFixed(4);
        return p.toFixed(6);
    };

    // Available spot pairs for the selector
    const availablePairs = pairs.filter(p => SPOT_ASSETS.includes(p.baseName || ''));

    if (fetchingData) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-[#FFFF00] animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-black">
            {/* Header - Compact Exchange Style */}
            <div className="flex items-center justify-between px-3 py-2 bg-black border-b border-[#FFFF00]/20">
                {/* Asset Selector */}
                <button
                    onClick={() => setShowAssetSelector(true)}
                    className="flex items-center gap-1.5"
                >
                    <TokenLogo symbol={selectedAsset} size={24} />
                    <span className="font-bold text-[#FFFF00]">{selectedAsset}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-[#FFFF00]/20 text-[#FFFF00] rounded font-medium">
                        SPOT
                    </span>
                    <ChevronDown className="w-4 h-4 text-[#FFFF00]/60" />
                </button>

                {/* Price + Change */}
                <div className="text-right">
                    <div className="text-sm font-bold font-mono text-[#FFFF00]">
                        ${selectedPair?.price ? formatPrice(selectedPair.price) : '---'}
                    </div>
                    <div className={`text-xs font-mono ${isPositive ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                        {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* Buy/Sell Tabs */}
            <div className="flex border-b border-[#FFFF00]/20 bg-black">
                <button
                    onClick={() => setSide('buy')}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors bg-black ${
                        side === 'buy'
                            ? 'text-[#34C759] border-b-2 border-[#34C759]'
                            : 'text-[#FFFF00]/50 hover:text-[#FFFF00]'
                    }`}
                >
                    Buy
                </button>
                <button
                    onClick={() => setSide('sell')}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors bg-black ${
                        side === 'sell'
                            ? 'text-[#FF3B30] border-b-2 border-[#FF3B30]'
                            : 'text-[#FFFF00]/50 hover:text-[#FFFF00]'
                    }`}
                >
                    Sell
                </button>
            </div>

            {/* Main Scrollable Content */}
            <div className="flex-1 overflow-auto p-4">
                {/* Balances */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-[#1A1A1A] border border-white/10 rounded-lg">
                        <div className="text-[10px] text-white/50 mb-1">USDC</div>
                        <div className="text-white font-mono font-semibold text-sm">
                            ${usdcBalance.toFixed(2)}
                        </div>
                    </div>
                    <div className="p-3 bg-[#1A1A1A] border border-white/10 rounded-lg">
                        <div className="text-[10px] text-white/50 mb-1">{selectedAsset}</div>
                        <div className="text-white font-mono font-semibold text-sm">
                            {baseBalance.toFixed(4)}
                        </div>
                    </div>
                </div>

                {/* Amount Input */}
                <div className="mb-3">
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-white/50">Amount ({selectedAsset})</span>
                        <button
                            onClick={() => setAmount(maxAmount.toFixed(4))}
                            className="text-[#FFFF00] hover:underline"
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
                            className="w-full py-3 px-4 pr-20 bg-[#1A1A1A] border border-white/10 rounded-lg text-white font-mono focus:border-[#FFFF00]/50 outline-none transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 text-sm font-medium">
                            {selectedAsset}
                        </span>
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2 mb-4">
                    {[25, 50, 75, 100].map(pct => (
                        <button
                            key={pct}
                            onClick={() => setAmount((maxAmount * pct / 100).toFixed(4))}
                            className="flex-1 py-2 text-xs font-semibold text-white/60 hover:text-[#FFFF00] bg-white/5 hover:bg-[#FFFF00]/10 rounded-lg transition-all"
                        >
                            {pct}%
                        </button>
                    ))}
                </div>

                {/* Order Summary */}
                {amountNum > 0 && selectedPair && (
                    <div className="p-3 bg-[#1A1A1A] border border-white/10 rounded-lg space-y-2 mb-4">
                        <div className="flex justify-between text-xs">
                            <span className="text-white/50">Price</span>
                            <span className="text-white font-mono">${selectedPair.price?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-xs border-t border-white/10 pt-2">
                            <span className="text-white/50">{side === 'buy' ? 'Total to pay' : 'Total to receive'}</span>
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
                    className={`w-full py-3.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                        side === 'buy'
                            ? 'bg-[#34C759] hover:bg-[#2DB34F] text-white'
                            : 'bg-[#FF3B30] hover:bg-[#E5342B] text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            {side === 'buy' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                            {side === 'buy' ? 'Buy' : 'Sell'} {selectedAsset}
                        </>
                    )}
                </button>

                {/* Feedback */}
                {error && (
                    <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-xs">
                        ✅ {success}
                    </div>
                )}

                {/* Not Connected State */}
                {!connected && (
                    <div className="mt-6 text-center py-4 text-white/40 text-sm">
                        Connect your wallet to trade
                    </div>
                )}
            </div>

            {/* Bottom Tabs */}
            <div className="flex border-t border-b border-[#FFFF00]/20 bg-black">
                <button
                    onClick={() => setBottomTab('balances')}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors bg-black ${
                        bottomTab === 'balances'
                            ? 'text-[#FFFF00] border-b-2 border-[#FFFF00]'
                            : 'text-[#FFFF00]/50 hover:text-[#FFFF00]'
                    }`}
                >
                    Balances
                </button>
                <button
                    onClick={() => setBottomTab('orders')}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors bg-black ${
                        bottomTab === 'orders'
                            ? 'text-[#FFFF00] border-b-2 border-[#FFFF00]'
                            : 'text-[#FFFF00]/50 hover:text-[#FFFF00]'
                    }`}
                >
                    Orders
                </button>
                <button
                    onClick={() => setBottomTab('history')}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors bg-black ${
                        bottomTab === 'history'
                            ? 'text-[#FFFF00] border-b-2 border-[#FFFF00]'
                            : 'text-[#FFFF00]/50 hover:text-[#FFFF00]'
                    }`}
                >
                    History
                </button>
            </div>

            {/* Bottom Tab Content */}
            <div className="p-3 bg-black min-h-[100px] max-h-[200px] overflow-y-auto">
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
                                        className="p-2 bg-[#1A1A1A] border border-white/10 rounded-lg"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <TokenLogo symbol={bal.coin} size={20} />
                                                <span className="text-xs font-semibold text-white">{bal.coin}</span>
                                            </div>
                                            <span className="text-white font-mono font-bold text-xs">
                                                {balanceValue.toFixed(bal.coin === 'USDC' ? 2 : 4)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-[9px] text-white/50">
                                            <span>Available: {available.toFixed(bal.coin === 'USDC' ? 2 : 4)}</span>
                                            {holdValue > 0 && <span>In Orders: {holdValue.toFixed(bal.coin === 'USDC' ? 2 : 4)}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-[#FFFF00]/40 text-xs py-6">
                            No Balances
                        </div>
                    )
                )}
                {bottomTab === 'orders' && (
                    <div className="text-center text-[#FFFF00]/40 text-xs py-6">
                        No Open Orders
                    </div>
                )}
                {bottomTab === 'history' && (
                    <div className="text-center text-[#FFFF00]/40 text-xs py-6">
                        No Trade History
                    </div>
                )}
            </div>

            {/* Asset Selector Modal */}
            {showAssetSelector && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
                    onClick={() => setShowAssetSelector(false)}
                >
                    <div
                        className="h-full flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Select Spot Asset</h3>
                            <button onClick={() => setShowAssetSelector(false)}>
                                <X className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

                        {/* Asset List */}
                        <div className="flex-1 overflow-auto">
                            {availablePairs.map(pair => {
                                const isSelected = pair.baseName === selectedAsset;
                                const pairIsPositive = (pair.change24h || 0) >= 0;

                                return (
                                    <button
                                        key={pair.name}
                                        onClick={() => {
                                            setSelectedAsset(pair.baseName || '');
                                            setSelectedPair(pair);
                                            setShowAssetSelector(false);
                                        }}
                                        className={`w-full grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/5 border-b border-white/5 ${
                                            isSelected ? 'bg-[#FFFF00]/10' : ''
                                        }`}
                                    >
                                        <div className="col-span-6 flex items-center gap-2">
                                            <TokenLogo symbol={pair.baseName || ''} size={28} />
                                            <div className="text-left">
                                                <div className="text-sm font-medium text-white">{pair.baseName}/USDC</div>
                                                <div className="text-[10px] text-white/40">SPOT</div>
                                            </div>
                                        </div>
                                        <div className="col-span-3 text-right text-sm font-mono text-white self-center">
                                            ${pair.price ? formatPrice(pair.price) : '---'}
                                        </div>
                                        <div className={`col-span-3 text-right text-sm font-mono self-center ${
                                            pairIsPositive ? 'text-[#34C759]' : 'text-[#FF3B30]'
                                        }`}>
                                            {pairIsPositive ? '+' : ''}{(pair.change24h || 0).toFixed(2)}%
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

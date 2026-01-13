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
    AlertCircle,
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

export default function SpotTradingPanel() {
    const { formatCurrency } = useLanguage();
    const { address, connected } = useHyperliquid();
    const { wallets } = useWallets();
    const activeWallet = wallets?.[0];

    // State
    const [tokens, setTokens] = useState<SpotToken[]>([]);
    const [pairs, setPairs] = useState<SpotPair[]>([]);
    const [selectedAsset, setSelectedAsset] = useState('HYPE');
    const [selectedPair, setSelectedPair] = useState<SpotPair | null>(null);
    const [balances, setBalances] = useState<SpotBalance[]>([]);
    const [showAssetSelector, setShowAssetSelector] = useState(false);

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

    useEffect(() => {
        fetchSpotData();
    }, [fetchSpotData]);

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
            const slippageBps = 100;
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

    // Price info
    const currentPrice = selectedPair?.price || 0;
    const priceChange = selectedPair?.change24h || 0;

    // Format price
    const formatPrice = (p: number) => {
        if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (p >= 1) return p.toFixed(4);
        return p.toFixed(6);
    };

    // Total value
    const totalValue = amountNum * currentPrice;

    // Available pairs for selector
    const availablePairs = pairs.filter(p => SPOT_ASSETS.includes(p.baseName || ''));

    if (fetchingData) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-[#FFFF00] animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col min-w-0">
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Market Info - Clean Display */}
                <div className="text-center py-2">
                    <button
                        onClick={() => setShowAssetSelector(true)}
                        className="inline-flex items-center gap-2 mb-2"
                    >
                        <TokenLogo symbol={selectedAsset} size={28} />
                        <span className="text-2xl font-bold text-white">{selectedAsset}</span>
                        <span className="text-xs px-2 py-0.5 bg-[#FFFF00]/20 text-[#FFFF00] rounded font-semibold">
                            SPOT
                        </span>
                        <ChevronDown className="w-5 h-5 text-[#FFFF00]/60" />
                    </button>
                    <div className="text-3xl font-bold text-primary">
                        {formatCurrency(currentPrice)}
                    </div>
                    <div className={`text-sm font-mono mt-1 ${priceChange >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                    </div>
                </div>

                {/* Buy/Sell Selection - Casino/Slots Style */}
                <div className="flex gap-2 px-2">
                    <button
                        onClick={() => setSide('buy')}
                        className={`flex-1 py-6 rounded-2xl font-black text-xl transition-all duration-200 flex flex-col items-center justify-center gap-1 ${side === 'buy'
                            ? 'bg-gradient-to-b from-[#FFFF00] to-[#FFD700] text-black shadow-[0_0_30px_rgba(255,255,0,0.5),0_4px_15px_rgba(0,0,0,0.3)] scale-[1.02] border-2 border-[#FFFF33]'
                            : 'bg-[#0D0D0D] text-[#FFFF00] border-2 border-[#FFFF00]/20 hover:border-[#FFFF00]/50 hover:bg-[#FFFF00]/5'
                            }`}
                        style={side === 'buy' ? { color: '#000' } : undefined}
                    >
                        <TrendingUp className="w-8 h-8" strokeWidth={3} />
                        <span className="tracking-wide">Buy</span>
                    </button>
                    <button
                        onClick={() => setSide('sell')}
                        className={`flex-1 py-6 rounded-2xl font-black text-xl transition-all duration-200 flex flex-col items-center justify-center gap-1 ${side === 'sell'
                            ? 'bg-gradient-to-b from-[#FF4444] to-[#CC0000] text-white shadow-[0_0_30px_rgba(255,68,68,0.5),0_4px_15px_rgba(0,0,0,0.3)] scale-[1.02] border-2 border-[#FF6666]'
                            : 'bg-[#0D0D0D] text-[#FF4444] border-2 border-[#FF4444]/20 hover:border-[#FF4444]/50 hover:bg-[#FF4444]/5'
                            }`}
                        style={side === 'sell' ? { color: '#FFFFFF' } : undefined}
                    >
                        <TrendingDown className="w-8 h-8" strokeWidth={3} />
                        <span className="tracking-wide">Sell</span>
                    </button>
                </div>

                {/* Amount Slider */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-base text-coffee-medium">Amount ({selectedAsset})</label>
                        <span className="text-xl font-bold text-[#FFFF00]">{amountNum.toFixed(4)}</span>
                    </div>

                    <input
                        type="range"
                        min="0"
                        max={maxAmount > 0 ? maxAmount : 1}
                        step={maxAmount / 100}
                        value={amountNum}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setAmount(val.toFixed(6));
                        }}
                        className="w-full h-[4px] rounded-full appearance-none cursor-pointer"
                        style={{
                            background: maxAmount > 0
                                ? `linear-gradient(to right, #FFFF00 0%, #FFFF00 ${(amountNum / maxAmount) * 100}%, #3A3A3C ${(amountNum / maxAmount) * 100}%, #3A3A3C 100%)`
                                : '#3A3A3C',
                        }}
                    />
                    <style jsx>{`
                        input[type="range"]::-webkit-slider-thumb {
                            -webkit-appearance: none;
                            appearance: none;
                            width: 28px;
                            height: 28px;
                            border-radius: 50%;
                            background: linear-gradient(to bottom, #FFFF00, #CCCC00);
                            cursor: pointer;
                            box-shadow: 0 0 10px rgba(255, 255, 0, 0.5), 0 2px 6px rgba(0,0,0,0.3);
                        }
                        input[type="range"]::-moz-range-thumb {
                            width: 28px;
                            height: 28px;
                            border-radius: 50%;
                            background: linear-gradient(to bottom, #FFFF00, #CCCC00);
                            cursor: pointer;
                            border: none;
                            box-shadow: 0 0 10px rgba(255, 255, 0, 0.5), 0 2px 6px rgba(0,0,0,0.3);
                        }
                    `}</style>

                    <div className="flex justify-between text-xs text-coffee-medium mt-2">
                        <span>0</span>
                        <button
                            onClick={() => setAmount(maxAmount.toFixed(6))}
                            className="text-[#FFFF00] hover:underline"
                        >
                            Max: {maxAmount.toFixed(4)} {selectedAsset}
                        </button>
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-3">
                    {[25, 50, 75, 100].map((pct) => (
                        <button
                            key={pct}
                            onClick={() => setAmount((maxAmount * pct / 100).toFixed(6))}
                            className="flex-1 rounded-lg text-base font-bold transition-all flex items-center justify-center hover:brightness-110"
                            style={{
                                backgroundColor: '#4A4A4C',
                                color: 'white',
                                minHeight: '48px'
                            }}
                            onMouseDown={(e) => { e.currentTarget.style.backgroundColor = '#FFFF00'; e.currentTarget.style.color = '#000'; }}
                            onMouseUp={(e) => { e.currentTarget.style.backgroundColor = '#4A4A4C'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A4A4C'; e.currentTarget.style.color = 'white'; }}
                            onTouchStart={(e) => { e.currentTarget.style.backgroundColor = '#FFFF00'; e.currentTarget.style.color = '#000'; }}
                            onTouchEnd={(e) => { e.currentTarget.style.backgroundColor = '#4A4A4C'; e.currentTarget.style.color = 'white'; }}
                        >
                            {pct}%
                        </button>
                    ))}
                </div>

                {/* Order Summary */}
                {amountNum > 0 && (
                    <div className="p-4 rounded-2xl space-y-2 border border-white/5 bg-transparent">
                        <div className="flex justify-between text-sm">
                            <span className="text-coffee-medium">Amount</span>
                            <span className="text-white font-semibold">{amountNum.toFixed(6)} {selectedAsset}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-coffee-medium">Price</span>
                            <span className="text-white font-semibold">{formatCurrency(currentPrice)}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                            <span className="text-coffee-medium">{side === 'buy' ? 'Total to pay' : 'You receive'}</span>
                            <span className="text-primary font-bold">{formatCurrency(totalValue)}</span>
                        </div>
                    </div>
                )}

                {/* Balances Display */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between items-center py-2 px-3 rounded-xl border border-white/5 bg-transparent">
                        <span className="text-sm text-coffee-medium">USDC</span>
                        <span className="text-sm font-bold text-white">{formatCurrency(usdcBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 rounded-xl border border-white/5 bg-transparent">
                        <span className="text-sm text-coffee-medium">{selectedAsset}</span>
                        <span className="text-sm font-bold text-white">{baseBalance.toFixed(4)}</span>
                    </div>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-bearish/10 border border-bearish/20 rounded-lg text-sm text-bearish">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 p-3 bg-[#FFFF00]/10 border border-[#FFFF00]/20 rounded-lg text-sm text-[#FFFF00]">
                        ✅ <span>{success}</span>
                    </div>
                )}

                {/* Not Connected State */}
                {!connected && (
                    <div className="flex items-center gap-2 p-3 bg-secondary/10 border border-secondary/20 rounded-lg text-sm text-secondary">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Connect wallet to trade</span>
                    </div>
                )}

                {/* Place Order Button - Rayo Style */}
                <button
                    onClick={handleOrder}
                    disabled={loading || !isValidAmount || !connected || !selectedPair}
                    className={`w-full rounded-xl text-xl font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${side === 'buy'
                        ? 'bg-[#FFFF00] hover:bg-[#FFFF33] text-black shadow-[0_0_20px_rgba(255,255,0,0.3)]'
                        : 'bg-[#FF4444] hover:bg-[#FF5555] text-white shadow-[0_0_20px_rgba(255,68,68,0.3)]'
                        }`}
                    style={side === 'buy' ? { color: '#000', minHeight: '80px' } : { minHeight: '80px' }}
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                        </div>
                    ) : (
                        <>
                            {side === 'buy' ? <ArrowDown className="w-6 h-6" /> : <ArrowUp className="w-6 h-6" />}
                            {side === 'buy' ? 'Buy' : 'Sell'} {selectedAsset}
                        </>
                    )}
                </button>
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
                        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between bg-black">
                            <h3 className="text-xl font-bold text-white">Select Asset</h3>
                            <button
                                onClick={() => setShowAssetSelector(false)}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="w-6 h-6 text-white/60" />
                            </button>
                        </div>

                        {/* Asset List */}
                        <div className="flex-1 overflow-auto bg-black">
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
                                            setAmount('');
                                        }}
                                        className={`w-full px-4 py-4 hover:bg-white/5 border-b border-white/5 transition-colors ${isSelected ? 'bg-[#FFFF00]/10' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <TokenLogo symbol={pair.baseName || ''} size={40} />
                                                <div className="text-left">
                                                    <div className="text-base font-bold text-white">{pair.baseName}/USDC</div>
                                                    <div className="text-xs text-white/40">Spot Trading</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-base font-mono font-bold text-white">
                                                    ${pair.price ? formatPrice(pair.price) : '---'}
                                                </div>
                                                <div className={`text-sm font-mono ${pairIsPositive ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                                                    {pairIsPositive ? '+' : ''}{(pair.change24h || 0).toFixed(2)}%
                                                </div>
                                            </div>
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

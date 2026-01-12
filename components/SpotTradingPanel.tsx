'use client';

import { useState, useEffect, useCallback } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useWallets } from '@privy-io/react-auth';
import {
    ArrowDown,
    ArrowUp,
    Loader2,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    ChevronDown,
    ArrowLeftRight
} from 'lucide-react';
import TokenLogo from '@/components/TokenLogo';
import { API_URL } from '@/lib/hyperliquid/client';

interface SpotToken {
    name: string;
    szDecimals: number;
    index: number;
    tokenId: string;
    fullName?: string;
}

interface SpotPair {
    name: string;
    tokens: [number, number]; // [base, quote]
    index: number;
    baseName?: string;
    quoteName?: string;
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
    const { address, account, connected } = useHyperliquid();
    const { wallets } = useWallets();
    const activeWallet = wallets?.[0];

    // State
    const [tokens, setTokens] = useState<SpotToken[]>([]);
    const [pairs, setPairs] = useState<SpotPair[]>([]);
    const [selectedPair, setSelectedPair] = useState<SpotPair | null>(null);
    const [balances, setBalances] = useState<SpotBalance[]>([]);
    const [showPairSelector, setShowPairSelector] = useState(false);

    // Trading
    const [isBuy, setIsBuy] = useState(true);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fetchingData, setFetchingData] = useState(true);

    // USDC Transfer Between Spot/Perps
    const [showTransfer, setShowTransfer] = useState(false);
    const [transferAmount, setTransferAmount] = useState('');
    const [toPerp, setToPerp] = useState(false); // Default: transfer from Perps to Spot
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferError, setTransferError] = useState('');
    const [transferSuccess, setTransferSuccess] = useState(false);

    // Fetch spot metadata and asset contexts
    const fetchSpotData = useCallback(async () => {
        try {
            setFetchingData(true);

            // Get spot metadata with asset contexts
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
                    // Map universe pairs with token names and prices
                    const pairsWithData: SpotPair[] = meta.universe
                        .map((p: any, idx: number) => {
                            const baseToken = meta.tokens.find((t: SpotToken) => t.index === p.tokens[0]);
                            const quoteToken = meta.tokens.find((t: SpotToken) => t.index === p.tokens[1]);
                            // Find the context by matching the pair name
                            const ctx = contexts.find((c: any) => c && p.name === meta.universe[contexts.indexOf(c)]?.name) || contexts[idx];

                            return {
                                ...p,
                                baseName: baseToken?.name || `Token${p.tokens[0]}`,
                                quoteName: quoteToken?.name || 'USDC',
                                price: ctx?.markPx ? parseFloat(ctx.markPx) : 0,
                                change24h: ctx?.prevDayPx && parseFloat(ctx.prevDayPx) > 0 ?
                                    ((parseFloat(ctx.markPx) - parseFloat(ctx.prevDayPx)) / parseFloat(ctx.prevDayPx)) * 100
                                    : 0,
                            };
                        })
                        .sort((a: SpotPair, b: SpotPair) => (b.price ?? 0) - (a.price ?? 0)); // Sort by price, highest first

                    setPairs(pairsWithData);

                    // Select first pair by default (usually PURR/USDC or HYPE/USDC)
                    if (pairsWithData.length > 0 && !selectedPair) {
                        // Try to find HYPE/USDC first
                        const hypePair = pairsWithData.find(p => p.baseName === 'HYPE');
                        setSelectedPair(hypePair || pairsWithData[0]);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch spot data:', err);
        } finally {
            setFetchingData(false);
        }
    }, [selectedPair]);

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

    // Handle USDC transfer between Spot and Perps
    const handleTransfer = async () => {
        if (!activeWallet || !address || !transferAmount) return;

        setTransferLoading(true);
        setTransferError('');
        setTransferSuccess(false);

        try {
            const provider = await activeWallet.getEthereumProvider();
            const nonce = Date.now();

            // Prepare the transfer action
            const transferAction = {
                type: 'usdClassTransfer',
                hyperliquidChain: 'Mainnet',
                signatureChainId: '0xa4b1',
                amount: transferAmount,
                toPerp: toPerp,
                nonce: nonce,
            };

            // EIP-712 domain - Use Exchange domain for all exchange actions
            const domain = {
                name: 'Exchange',
                version: '1',
                chainId: 1337, // Hyperliquid L1
                verifyingContract: '0x0000000000000000000000000000000000000000',
            };

            // EIP-712 Types for usdClassTransfer
            const types = {
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
            };

            const msgParams = JSON.stringify({
                domain,
                types,
                primaryType: 'Agent',
                message: {
                    source: 'a',
                    connectionId: '0x' + '0'.repeat(64),
                },
            });

            const signature = await provider.request({
                method: 'eth_signTypedData_v4',
                params: [address, msgParams],
            });

            const sig = signature.slice(2);
            const r = '0x' + sig.slice(0, 64);
            const s = '0x' + sig.slice(64, 128);
            const v = parseInt(sig.slice(128, 130), 16);

            const response = await fetch(`${API_URL}/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: transferAction,
                    nonce,
                    signature: { r, s, v },
                }),
            });

            const result = await response.json();

            if (result.status === 'ok' || result.response?.type === 'default') {
                setTransferSuccess(true);
                setTransferAmount('');
                fetchBalances(); // Refresh balances
                setTimeout(() => setTransferSuccess(false), 3000);
            } else {
                throw new Error(result.response?.data || result.error || 'Transfer failed');
            }
        } catch (err: any) {
            console.error('Transfer error:', err);
            setTransferError(err.message || 'Failed to process transfer');
        } finally {
            setTransferLoading(false);
        }
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

            // For spot, the asset index is calculated as 10000 + spot pair index
            const assetIndex = 10000 + selectedPair.index;

            // Get current mid price for market order
            const midPx = selectedPair.price || 0;
            // For market orders, use a slippage tolerance (1%)
            const slippageBps = 100; // 1%
            const orderPrice = isBuy
                ? (midPx * (1 + slippageBps / 10000)).toFixed(6)
                : (midPx * (1 - slippageBps / 10000)).toFixed(6);

            // Prepare order
            const orderAction = {
                type: 'order',
                orders: [{
                    a: assetIndex,
                    b: isBuy,
                    p: orderPrice,
                    s: amount,
                    r: false, // not reduce only
                    t: { limit: { tif: 'Ioc' } }, // IOC for market-like behavior
                }],
                grouping: 'na',
            };

            // EIP-712 domain
            const domain = {
                name: 'Exchange',
                version: '1',
                chainId: 1337, // Hyperliquid L1
                verifyingContract: '0x0000000000000000000000000000000000000000',
            };

            // Sign with EIP-712
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

            // Parse signature
            const sig = signature.slice(2);
            const r = '0x' + sig.slice(0, 64);
            const s = '0x' + sig.slice(64, 128);
            const v = parseInt(sig.slice(128, 130), 16);

            // Send order
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
                setSuccess(`${isBuy ? 'Compra' : 'Venta'} exitosa!`);
                setAmount('');
                fetchBalances();
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
    const baseBalance = selectedPair ? getBalance(selectedPair.baseName || '') : 0;
    const amountNum = parseFloat(amount || '0');

    // Calculate max amount
    const maxAmount = isBuy
        ? (selectedPair?.price ? usdcBalance / selectedPair.price : 0)
        : baseBalance;

    const isValidAmount = amountNum > 0 && amountNum <= maxAmount;

    if (fetchingData) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-[#FFFF00] animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Spot Trading</h2>
                <button
                    onClick={() => { fetchSpotData(); fetchBalances(); }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                    <RefreshCw className="w-4 h-4 text-white/60" />
                </button>
            </div>

            {/* USDC Transfer Section */}
            <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl overflow-hidden">
                <button
                    onClick={() => setShowTransfer(!showTransfer)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <ArrowLeftRight className="w-5 h-5 text-[#FFFF00]" />
                        <span className="font-semibold text-white">Transferir USDC</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-white/50 transition-transform ${showTransfer ? 'rotate-180' : ''}`} />
                </button>

                {showTransfer && (
                    <div className="p-4 border-t border-white/10 space-y-4">
                        {/* Direction Toggle */}
                        <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl">
                            <div className="text-sm">
                                <div className={`font-semibold ${!toPerp ? 'text-[#FFFF00]' : 'text-white/60'}`}>
                                    Perps
                                </div>
                                <div className="text-xs text-white/40">
                                    ${account.availableMargin.toFixed(2)}
                                </div>
                            </div>
                            <button
                                onClick={() => setToPerp(!toPerp)}
                                className="p-2 rounded-lg bg-[#FFFF00]/10 hover:bg-[#FFFF00]/20 transition-colors"
                            >
                                <ArrowLeftRight className="w-5 h-5 text-[#FFFF00]" />
                            </button>
                            <div className="text-sm text-right">
                                <div className={`font-semibold ${toPerp ? 'text-[#FFFF00]' : 'text-white/60'}`}>
                                    Spot
                                </div>
                                <div className="text-xs text-white/40">
                                    ${usdcBalance.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className="text-center text-xs text-white/50">
                            {toPerp ? 'Spot → Perps' : 'Perps → Spot'}
                        </div>

                        {/* Amount Input */}
                        <div>
                            <input
                                type="number"
                                value={transferAmount}
                                onChange={(e) => {
                                    setTransferAmount(e.target.value);
                                    setTransferError('');
                                }}
                                placeholder="0.00"
                                className="w-full py-3 px-4 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:border-[#FFFF00]/50 outline-none transition-all"
                            />
                            <div className="flex gap-2 mt-2">
                                {[25, 50, 75, 100].map(pct => {
                                    const maxTransfer = toPerp ? usdcBalance : account.availableMargin;
                                    return (
                                        <button
                                            key={pct}
                                            onClick={() => setTransferAmount((maxTransfer * pct / 100).toFixed(2))}
                                            className="flex-1 py-1.5 text-xs font-semibold text-white/60 hover:text-[#FFFF00] bg-white/5 hover:bg-[#FFFF00]/10 rounded-lg transition-all"
                                        >
                                            {pct}%
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Transfer Button */}
                        <button
                            onClick={handleTransfer}
                            disabled={transferLoading || !transferAmount || parseFloat(transferAmount) <= 0}
                            className="w-full py-3 bg-[#FFFF00] text-black font-bold rounded-xl hover:bg-[#FFFF33] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {transferLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <ArrowLeftRight className="w-4 h-4" />
                                    Transferir USDC
                                </>
                            )}
                        </button>

                        {/* Feedback */}
                        {transferError && (
                            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs text-center">
                                {transferError}
                            </div>
                        )}
                        {transferSuccess && (
                            <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-xs text-center">
                                ✅ Transferencia exitosa!
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Pair Selector */}
            <div className="relative">
                <button
                    onClick={() => setShowPairSelector(!showPairSelector)}
                    className="w-full p-4 bg-[#1A1A1A] border border-white/10 rounded-2xl flex items-center justify-between hover:border-[#FFFF00]/30 transition-all"
                >
                    {selectedPair ? (
                        <div className="flex items-center gap-3">
                            <TokenLogo symbol={selectedPair.baseName || ''} size={40} />
                            <div className="text-left">
                                <div className="font-bold text-white text-lg">
                                    {selectedPair.baseName}/{selectedPair.quoteName}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-[#FFFF00] font-mono">
                                        ${selectedPair.price?.toFixed(4)}
                                    </span>
                                    <span className={`flex items-center gap-0.5 ${(selectedPair.change24h || 0) >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'
                                        }`}>
                                        {(selectedPair.change24h || 0) >= 0 ? (
                                            <TrendingUp className="w-3 h-3" />
                                        ) : (
                                            <TrendingDown className="w-3 h-3" />
                                        )}
                                        {Math.abs(selectedPair.change24h || 0).toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <span className="text-white/50">Select a pair</span>
                    )}
                    <ChevronDown className={`w-5 h-5 text-white/50 transition-transform ${showPairSelector ? 'rotate-180' : ''}`} />
                </button>

                {/* Pair Dropdown */}
                {showPairSelector && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-white/10 rounded-2xl overflow-hidden z-50 max-h-64 overflow-y-auto">
                        {pairs.map(pair => (
                            <button
                                key={pair.index}
                                onClick={() => {
                                    setSelectedPair(pair);
                                    setShowPairSelector(false);
                                }}
                                className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                            >
                                <TokenLogo symbol={pair.baseName || ''} size={32} />
                                <div className="flex-1 text-left">
                                    <div className="font-semibold text-white">
                                        {pair.baseName}/{pair.quoteName}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-mono text-sm">
                                        ${pair.price?.toFixed(4)}
                                    </div>
                                    <div className={`text-xs ${(pair.change24h || 0) >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'
                                        }`}>
                                        {(pair.change24h || 0) >= 0 ? '+' : ''}{pair.change24h?.toFixed(2)}%
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

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
                    Comprar
                </button>
                <button
                    onClick={() => setIsBuy(false)}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${!isBuy
                        ? 'bg-[#FF3B30] text-white'
                        : 'bg-transparent text-white/50 hover:text-white'
                        }`}
                >
                    <ArrowUp className="w-4 h-4" />
                    Vender
                </button>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#1A1A1A] rounded-xl">
                    <div className="text-xs text-white/50 mb-1">USDC Balance</div>
                    <div className="text-white font-mono font-semibold">
                        ${usdcBalance.toFixed(2)}
                    </div>
                </div>
                {selectedPair && (
                    <div className="p-3 bg-[#1A1A1A] rounded-xl">
                        <div className="text-xs text-white/50 mb-1">{selectedPair.baseName} Balance</div>
                        <div className="text-white font-mono font-semibold">
                            {baseBalance.toFixed(4)}
                        </div>
                    </div>
                )}
            </div>

            {/* Amount Input */}
            <div>
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/50">Cantidad ({selectedPair?.baseName})</span>
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
                        className="w-full py-4 px-4 pr-24 bg-[#1A1A1A] border border-white/10 rounded-xl text-white text-lg font-mono focus:border-[#FFFF00]/50 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white font-semibold">
                        {selectedPair?.baseName}
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
                <div className="p-4 bg-[#1A1A1A] rounded-xl space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-white/50">Precio estimado</span>
                        <span className="text-white font-mono">${selectedPair.price?.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                        <span className="text-white/50">{isBuy ? 'Total a pagar' : 'Total a recibir'}</span>
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
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isBuy
                    ? 'bg-[#34C759] hover:bg-[#2DB34F] text-white'
                    : 'bg-[#FF3B30] hover:bg-[#E5342B] text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Procesando...
                    </>
                ) : (
                    <>
                        {isBuy ? <ArrowDown className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
                        {isBuy ? 'Comprar' : 'Vender'} {selectedPair?.baseName}
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

            {/* Not Connected State */}
            {!connected && (
                <div className="text-center py-8 text-white/50">
                    Conecta tu wallet para operar
                </div>
            )}
        </div>
    );
}

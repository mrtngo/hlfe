'use client';

import { useState, useCallback, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { AlertCircle, Check, ChevronDown, Zap, X } from 'lucide-react';

// Order types
type OrderType = 'market' | 'limit';
type OrderSide = 'buy' | 'sell';

interface AdvancedOrderPanelProps {
    symbol?: string;
    initialPrice?: number | null;
}

export default function AdvancedOrderPanel({ symbol, initialPrice }: AdvancedOrderPanelProps) {
    const {
        selectedMarket,
        getMarket,
        placeOrder,
        account,
        positions,
        connected,
        dexAbstractionEnabled,
        dexAbstractionLoading,
        enableDexAbstraction,
    } = useHyperliquid();

    const marketSymbol = symbol || selectedMarket;
    const market = getMarket(marketSymbol);
    const currentPosition = positions?.find(p => p.symbol === marketSymbol);
    const maxLeverage = market?.maxLeverage || 20;
    const coin = marketSymbol?.replace('-USD', '').replace('-PERP', '') || 'BTC';

    // Order state
    const [orderType, setOrderType] = useState<OrderType>('limit');
    const [side, setSide] = useState<OrderSide>('buy');
    const [size, setSize] = useState('');
    const [price, setPrice] = useState('');
    const [leverage, setLeverage] = useState(10);
    const [reduceOnly, setReduceOnly] = useState(false);
    const [sizePercent, setSizePercent] = useState(0);

    // TP/SL state
    const [enableTpSl, setEnableTpSl] = useState(false);
    const [tpPrice, setTpPrice] = useState('');
    const [slPrice, setSlPrice] = useState('');

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLeverageDropdown, setShowLeverageDropdown] = useState(false);
    const [showStockApprovalModal, setShowStockApprovalModal] = useState(false);

    // Check if this is a stock/XYZ asset
    const isStockAsset = market?.isStock === true || market?.onlyIsolated === true;

    // Available balance
    const availableMargin = account?.availableMargin || 0;

    // Set price from parent (clicked from order book)
    useEffect(() => {
        if (initialPrice) {
            setPrice(initialPrice.toString());
        }
    }, [initialPrice]);

    // Set price from market when switching to limit
    useEffect(() => {
        if (orderType === 'limit' && market?.price && !price) {
            setPrice(market.price.toFixed(2));
        }
    }, [orderType, market?.price, price]);

    // Clamp leverage when market changes (different maxLeverage)
    useEffect(() => {
        if (leverage > maxLeverage) {
            setLeverage(maxLeverage);
        }
    }, [maxLeverage, leverage]);

    // Calculate size from percentage
    const setQuickSize = (pct: number) => {
        setSizePercent(pct);
        if (market?.price && availableMargin > 0) {
            const maxSize = (availableMargin * leverage * (pct / 100)) / market.price;
            setSize(maxSize.toFixed(4));
        }
    };

    // Calculate order value
    const orderValue = parseFloat(size || '0') * parseFloat(price || market?.price?.toString() || '0');
    const margin = orderValue / leverage;

    // Handle order submission
    const handleSubmit = useCallback(async () => {
        if (!marketSymbol || !size || parseFloat(size) <= 0) {
            setError('Enter a valid size');
            return;
        }

        if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
            setError('Enter a valid price');
            return;
        }

        if (!connected) {
            setError('Please connect wallet first');
            return;
        }

        // Check if trying to trade a stock without DEX abstraction enabled
        if (isStockAsset && !dexAbstractionEnabled) {
            setShowStockApprovalModal(true);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const orderPrice = orderType === 'market' ? undefined : parseFloat(price);
            await placeOrder(
                marketSymbol,
                side,
                orderType,
                parseFloat(size),
                orderPrice,
                Math.min(leverage, maxLeverage),
                reduceOnly
            );
            setSize('');
            setSizePercent(0);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Order failed');
        } finally {
            setLoading(false);
        }
    }, [marketSymbol, size, price, orderType, side, leverage, maxLeverage, reduceOnly, connected, placeOrder, isStockAsset, dexAbstractionEnabled]);

    // Handle enabling stock trading
    const handleEnableStocks = async () => {
        const result = await enableDexAbstraction();
        setShowStockApprovalModal(false);
        if (result.success) {
            // Show success message, user can now click to place order
            setError(null);
        } else {
            setError(result.message);
        }
    };

    const formatPrice = (p: number) => {
        if (p >= 1000) return p.toFixed(2);
        if (p >= 1) return p.toFixed(4);
        return p.toFixed(6);
    };

    return (
        <div className="flex flex-col bg-black p-4">
            {/* Order Type Tabs + Leverage */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex">
                    <button
                        onClick={() => setOrderType('limit')}
                        className={`px-4 py-1.5 text-xs font-medium rounded-l-md border transition-colors ${orderType === 'limit'
                            ? 'bg-brand border-[#FFFF00] text-black'
                            : 'bg-transparent border-white/20 text-white/60 hover:text-white'
                            }`}
                    >
                        Limit
                    </button>
                    <button
                        onClick={() => setOrderType('market')}
                        className={`px-4 py-1.5 text-xs font-medium rounded-r-md border-t border-r border-b transition-colors ${orderType === 'market'
                            ? 'bg-brand border-[#FFFF00] text-black'
                            : 'bg-transparent border-white/20 text-white/60 hover:text-white'
                            }`}
                    >
                        Market
                    </button>
                </div>

                {/* Leverage Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowLeverageDropdown(!showLeverageDropdown)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-brand border border-[#FFFF00] rounded text-black"
                    >
                        {Math.min(leverage, maxLeverage)}x
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    {showLeverageDropdown && (
                        <div
                            className="absolute right-0 top-full mt-1 bg-[#111111] border border-[#FFFF00]/30 rounded-lg shadow-2xl z-50 p-3"
                            style={{ minWidth: '150px' }}
                        >
                            <div className="text-center text-brand font-bold text-lg mb-2">
                                {Math.min(leverage, maxLeverage)}x
                            </div>
                            <input
                                type="range"
                                min="1"
                                max={maxLeverage}
                                value={Math.min(leverage, maxLeverage)}
                                onChange={(e) => setLeverage(parseInt(e.target.value))}
                                className="w-full h-2 accent-[#FFFF00] bg-bg-elevated rounded-full"
                                style={{ accentColor: '#FFFF00' }}
                            />
                            <div className="flex justify-between text-[10px] text-brand/60 mt-1">
                                <span>1x</span>
                                <span>{maxLeverage}x</span>
                            </div>
                            <button
                                onClick={() => setShowLeverageDropdown(false)}
                                className="w-full mt-3 py-1.5 text-xs bg-brand text-black font-bold rounded"
                            >
                                Confirm
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Buy/Sell Buttons */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setSide('buy')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${side === 'buy'
                        ? 'bg-[#34C759] text-white shadow-lg'
                        : 'bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/30 hover:bg-[#34C759]/30'
                        }`}
                >
                    Buy / Long
                </button>
                <button
                    onClick={() => setSide('sell')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${side === 'sell'
                        ? 'bg-[#FF3B30] text-white shadow-lg'
                        : 'bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30 hover:bg-[#FF3B30]/30'
                        }`}
                >
                    Sell / Short
                </button>
            </div>

            {/* Available to Trade */}
            <div className="flex justify-between text-xs mb-3">
                <span className="text-brand/60">Avail. to Trade</span>
                <span className="text-brand font-mono">{availableMargin.toFixed(2)} USDC</span>
            </div>

            {/* Price Input (for limit orders) */}
            {orderType === 'limit' && (
                <div className="mb-3">
                    <div className="flex items-center justify-between bg-black border border-[#FFFF00]/30 rounded-lg px-3 py-2.5">
                        <span className="text-xs text-brand/60">Price (USDC)</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0.00"
                                step="any"
                                min="0"
                                className="w-24 text-right bg-transparent text-sm font-mono outline-none"
                                style={{ color: '#FFFF00' }}
                            />
                            <button
                                onClick={() => market?.price && setPrice(formatPrice(market.price))}
                                className="text-[10px] text-black bg-brand font-medium border border-[#FFFF00] px-1.5 py-0.5 rounded"
                            >
                                Mid
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Size Input */}
            <div className="mb-3">
                <div className="flex items-center justify-between bg-black border border-[#FFFF00]/30 rounded-lg px-3 py-2.5">
                    <span className="text-xs text-brand/60">Size</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={size}
                            onChange={(e) => {
                                setSize(e.target.value);
                                setSizePercent(0);
                            }}
                            placeholder="0.0000"
                            step="any"
                            min="0"
                            className="w-24 text-right bg-transparent text-sm font-mono outline-none"
                            style={{ color: '#FFFF00' }}
                        />
                        <span className="text-xs text-brand/50">{coin}</span>
                    </div>
                </div>
            </div>

            {/* Size Slider with Tick Marks */}
            <div className="mb-4">
                <div className="relative pt-1">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="25"
                        value={sizePercent}
                        onChange={(e) => setQuickSize(parseInt(e.target.value))}
                        className="w-full h-1 bg-brand/20 rounded-lg appearance-none cursor-pointer accent-[#FFFF00]"
                    />
                    {/* Tick marks */}
                    <div className="flex justify-between mt-1">
                        {[0, 25, 50, 75, 100].map((tick) => (
                            <button
                                key={tick}
                                onClick={() => setQuickSize(tick)}
                                className={`w-2 h-2 rounded-full transition-colors ${sizePercent >= tick ? 'bg-brand' : 'bg-brand/30'
                                    }`}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-brand/50 mt-1">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>

            {/* Reduce Only + TP/SL Toggles */}
            <div className="flex flex-col gap-2 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <div
                        onClick={() => setReduceOnly(!reduceOnly)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${reduceOnly ? 'bg-brand border-[#FFFF00]' : 'border-[#FFFF00]/40 bg-transparent'
                            }`}
                    >
                        {reduceOnly && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-xs text-brand/70">Reduce Only</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <div
                        onClick={() => setEnableTpSl(!enableTpSl)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${enableTpSl ? 'bg-brand border-[#FFFF00]' : 'border-[#FFFF00]/40 bg-transparent'
                            }`}
                    >
                        {enableTpSl && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-xs text-brand/70">Take Profit / Stop Loss</span>
                </label>
            </div>

            {/* TP/SL Inputs */}
            {enableTpSl && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-black border border-[#FFFF00]/30 rounded-lg px-3 py-2">
                        <span className="text-[10px] text-brand/50 block mb-1">TP Price</span>
                        <input
                            type="number"
                            value={tpPrice}
                            onChange={(e) => setTpPrice(e.target.value)}
                            placeholder="---"
                            step="any"
                            min="0"
                            className="w-full bg-transparent text-sm font-mono outline-none"
                            style={{ color: '#FFFF00' }}
                        />
                    </div>
                    <div className="bg-black border border-[#FFFF00]/30 rounded-lg px-3 py-2">
                        <span className="text-[10px] text-brand/50 block mb-1">SL Price</span>
                        <input
                            type="number"
                            value={slPrice}
                            onChange={(e) => setSlPrice(e.target.value)}
                            placeholder="---"
                            step="any"
                            min="0"
                            className="w-full bg-transparent text-sm font-mono outline-none"
                            style={{ color: '#FFFF00' }}
                        />
                    </div>
                </div>
            )}

            {/* Order Summary */}
            <div className="border-t border-[#FFFF00]/20 pt-3 mb-4 space-y-1">
                <div className="flex justify-between text-xs">
                    <span className="text-brand/50">Order Value</span>
                    <span className="text-brand font-mono">${orderValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-brand/50">Margin Required</span>
                    <span className="text-brand font-mono">${margin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-brand/50">Est. Liq. Price</span>
                    <span className="text-brand/50 font-mono">---</span>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-3 p-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#FF3B30] flex-shrink-0" />
                    <span className="text-xs text-[#FF3B30]">{error}</span>
                </div>
            )}

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={loading || !size || parseFloat(size) <= 0}
                className={`w-full py-3.5 rounded-lg font-bold text-sm transition-all shadow-lg ${side === 'buy'
                    ? 'bg-[#34C759] hover:bg-[#34C759]/90 text-white'
                    : 'bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
            >
                {loading ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Placing Order...
                    </div>
                ) : !size || parseFloat(size) <= 0 ? (
                    'Enter Amount'
                ) : (
                    `${side === 'buy' ? 'Buy / Long' : 'Sell / Short'} ${coin}`
                )}
            </button>

            {/* Stock Approval Modal */}
            {showStockApprovalModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-[#FFFF00]/30 rounded-2xl p-6 max-w-sm w-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-400" />
                                <h3 className="text-lg font-bold text-white">Enable Stock Trading</h3>
                            </div>
                            <button
                                onClick={() => setShowStockApprovalModal(false)}
                                className="text-white/50 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-white/70 text-sm mb-6">
                            To trade <span className="text-[#FFFF00] font-bold">{coin}</span> and other XYZ stocks, you need to enable stock trading on your account. This is a one-time approval.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowStockApprovalModal(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/10 text-white/70 hover:bg-white/20 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEnableStocks}
                                disabled={dexAbstractionLoading}
                                className="flex-1 py-3 rounded-xl font-bold text-sm bg-blue-500 text-white hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {dexAbstractionLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Enabling...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        Enable Stocks
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

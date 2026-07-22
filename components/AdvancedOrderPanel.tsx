'use client';

import { useState, useCallback, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { AlertCircle, Check, ChevronDown, Zap, X } from 'lucide-react';
import TradeConfirmSheet from '@/components/TradeConfirmSheet';
import TradeSuccessSheet from '@/components/TradeSuccessSheet';
import { priceDecimalsFromMarket } from '@/lib/format/price';

// Order types
type OrderType = 'market' | 'limit';
type OrderSide = 'buy' | 'sell';

interface AdvancedOrderPanelProps {
    symbol?: string;
    initialPrice?: number | null;
    initialSide?: OrderSide;
}

export default function AdvancedOrderPanel({ symbol, initialPrice, initialSide = 'buy' }: AdvancedOrderPanelProps) {
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
        refreshAccountData,
    } = useHyperliquid();
    const { t } = useLanguage();

    const marketSymbol = symbol || selectedMarket;
    const market = getMarket(marketSymbol);
    const currentPosition = positions?.find(p => p.symbol === marketSymbol);
    const maxLeverage = market?.maxLeverage || 20;
    const coin = marketSymbol?.replace('-USD', '').replace('-PERP', '') || 'BTC';

    // Order state
    const [orderType, setOrderType] = useState<OrderType>('limit');
    const [side, setSide] = useState<OrderSide>(initialSide);
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
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [filledSnapshot, setFilledSnapshot] = useState<{
        side: OrderSide;
        symbol: string;
        ticker: string;
        tokenAmount: number;
        usdAmount: number;
        avgPrice: number;
        leverage: number;
    } | null>(null);

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
            setPrice(formatPrice(market.price));
        }
    }, [orderType, market, price]);

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

    // Primary button: validate, then open confirm sheet
    const handleSubmit = useCallback(() => {
        if (!marketSymbol || !size || parseFloat(size) <= 0) {
            setError(t.order.invalidSize);
            return;
        }

        if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
            setError(t.order.invalidPrice);
            return;
        }

        if (!connected) {
            setError(t.wallet.connectFirst);
            return;
        }

        // Check if trying to trade a stock without DEX abstraction enabled
        if (isStockAsset && !dexAbstractionEnabled) {
            setShowStockApprovalModal(true);
            return;
        }

        setError(null);
        setShowConfirm(true);
    }, [marketSymbol, size, price, orderType, connected, isStockAsset, dexAbstractionEnabled, t]);

    // Called from confirm sheet — actually place the order
    const handleConfirmOrder = useCallback(async () => {
        if (!marketSymbol) return;
        setLoading(true);
        setError(null);
        try {
            const orderPrice = orderType === 'market' ? undefined : parseFloat(price);
            const result = await placeOrder(
                marketSymbol,
                side,
                orderType,
                parseFloat(size),
                orderPrice,
                Math.min(leverage, maxLeverage),
                reduceOnly,
            );
            const tokenAmount = parseFloat(size);
            const effectivePrice =
                orderType === 'market'
                    ? market?.price || parseFloat(price) || 0
                    : parseFloat(price) || 0;
            // Treat the absence of an explicit `filled === false` as success
            // since older callers don't read this field.
            const filled = !result || (result as any).filled !== false;
            if (filled) {
                setFilledSnapshot({
                    side,
                    symbol: marketSymbol,
                    ticker: coin,
                    tokenAmount,
                    usdAmount: tokenAmount * effectivePrice,
                    avgPrice: effectivePrice,
                    leverage: Math.min(leverage, maxLeverage),
                });
                setSize('');
                setSizePercent(0);
                setShowConfirm(false);
                setShowSuccess(true);
                setTimeout(() => refreshAccountData?.(), 500);
            } else {
                setError(((result as any)?.error as string) || t.order.placeFailed);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t.order.placeFailed);
        } finally {
            setLoading(false);
        }
    }, [marketSymbol, size, price, orderType, side, leverage, maxLeverage, reduceOnly, placeOrder, market?.price, coin, refreshAccountData, t]);

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
        return p.toFixed(priceDecimalsFromMarket(market));
    };

    return (
        <div className="flex flex-col bg-black p-4">
            {/* Order Type Tabs + Leverage */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2">
                    <button
                        onClick={() => setOrderType('limit')}
                        className={`px-4 py-1.5 text-xs font-medium rounded-xl border transition-colors ${orderType === 'limit'
                            ? 'bg-brand border-[#E3B34C] text-black'
                            : 'bg-transparent border-white/20 text-white/60 hover:text-white'
                            }`}
                    >
                        {t.order.limit}
                    </button>
                    <button
                        onClick={() => setOrderType('market')}
                        className={`px-4 py-1.5 text-xs font-medium rounded-xl border transition-colors ${orderType === 'market'
                            ? 'bg-brand border-[#E3B34C] text-black'
                            : 'bg-transparent border-white/20 text-white/60 hover:text-white'
                            }`}
                    >
                        {t.order.market}
                    </button>
                </div>

                {/* Leverage Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowLeverageDropdown(!showLeverageDropdown)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-brand border border-[#E3B34C] rounded text-black"
                    >
                        {Math.min(leverage, maxLeverage)}x
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    {showLeverageDropdown && (
                        <div
                            className="absolute right-0 top-full mt-1 bg-[#111111] border border-[#E3B34C]/30 rounded-lg shadow-2xl z-50 p-3"
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
                                className="w-full h-2 accent-[#E3B34C] bg-bg-elevated rounded-full"
                                style={{ accentColor: '#E3B34C' }}
                            />
                            <div className="flex justify-between text-[10px] text-brand/60 mt-1">
                                <span>1x</span>
                                <span>{maxLeverage}x</span>
                            </div>
                            <button
                                onClick={() => setShowLeverageDropdown(false)}
                                className="w-full mt-3 py-1.5 text-xs bg-brand text-black font-bold rounded"
                            >
                                {t.common.confirm}
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
                    {t.order.buyLong}
                </button>
                <button
                    onClick={() => setSide('sell')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${side === 'sell'
                        ? 'bg-[#FF3B30] text-white shadow-lg'
                        : 'bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30 hover:bg-[#FF3B30]/30'
                        }`}
                >
                    {t.order.sellShort}
                </button>
            </div>

            {/* Available to Trade */}
            <div className="flex justify-between text-xs mb-3">
                <span className="text-brand/60">{t.advancedOrder.availToTrade}</span>
                <span className="text-brand font-mono">{availableMargin.toFixed(2)} USDC</span>
            </div>

            {/* Price Input (for limit orders) */}
            {orderType === 'limit' && (
                <div className="mb-3">
                    <div className="flex items-center justify-between bg-black border border-[#E3B34C]/30 rounded-lg px-3 py-2.5">
                        <span className="text-xs text-brand/60">{t.order.price} (USDC)</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0.00"
                                step="any"
                                min="0"
                                className="w-24 text-right bg-transparent text-sm font-mono outline-none"
                                style={{ color: '#E3B34C' }}
                            />
                            <button
                                onClick={() => market?.price && setPrice(formatPrice(market.price))}
                                className="text-[10px] text-black bg-brand font-medium border border-[#E3B34C] px-1.5 py-0.5 rounded"
                            >
                                {t.order.mid}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Size Input */}
            <div className="mb-3">
                <div className="flex items-center justify-between bg-black border border-[#E3B34C]/30 rounded-lg px-3 py-2.5">
                    <span className="text-xs text-brand/60">{t.order.amount}</span>
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
                            style={{ color: '#E3B34C' }}
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
                        className="w-full h-1 bg-brand/20 rounded-lg appearance-none cursor-pointer accent-[#E3B34C]"
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
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${reduceOnly ? 'bg-brand border-[#E3B34C]' : 'border-[#E3B34C]/40 bg-transparent'
                            }`}
                    >
                        {reduceOnly && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-xs text-brand/70">{t.order.reduceOnly}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <div
                        onClick={() => setEnableTpSl(!enableTpSl)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${enableTpSl ? 'bg-brand border-[#E3B34C]' : 'border-[#E3B34C]/40 bg-transparent'
                            }`}
                    >
                        {enableTpSl && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-xs text-brand/70">{t.order.tpSl}</span>
                </label>
            </div>

            {/* TP/SL Inputs */}
            {enableTpSl && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-black border border-[#E3B34C]/30 rounded-lg px-3 py-2">
                        <span className="text-[10px] text-brand/50 block mb-1">{t.order.tpPrice}</span>
                        <input
                            type="number"
                            value={tpPrice}
                            onChange={(e) => setTpPrice(e.target.value)}
                            placeholder="---"
                            step="any"
                            min="0"
                            className="w-full bg-transparent text-sm font-mono outline-none"
                            style={{ color: '#E3B34C' }}
                        />
                    </div>
                    <div className="bg-black border border-[#E3B34C]/30 rounded-lg px-3 py-2">
                        <span className="text-[10px] text-brand/50 block mb-1">{t.order.slPrice}</span>
                        <input
                            type="number"
                            value={slPrice}
                            onChange={(e) => setSlPrice(e.target.value)}
                            placeholder="---"
                            step="any"
                            min="0"
                            className="w-full bg-transparent text-sm font-mono outline-none"
                            style={{ color: '#E3B34C' }}
                        />
                    </div>
                </div>
            )}

            {/* Order Summary */}
            <div className="border-t border-[#E3B34C]/20 pt-3 mb-4 space-y-1">
                <div className="flex justify-between text-xs">
                    <span className="text-brand/50">{t.order.value}</span>
                    <span className="text-brand font-mono">${orderValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-brand/50">{t.positions.margin}</span>
                    <span className="text-brand font-mono">${margin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-brand/50">{t.positions.liq}</span>
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
                        {t.order.placing}
                    </div>
                ) : !size || parseFloat(size) <= 0 ? (
                    t.order.enterAmount
                ) : (
                    `${side === 'buy' ? t.order.buyLong : t.order.sellShort} ${coin}`
                )}
            </button>

            {/* Confirm sheet */}
            <TradeConfirmSheet
                open={showConfirm}
                onClose={() => {
                    if (!loading) setShowConfirm(false);
                }}
                onConfirm={handleConfirmOrder}
                submitting={loading}
                side={side}
                symbol={marketSymbol || coin}
                ticker={coin}
                price={
                    orderType === 'market'
                        ? market?.price || 0
                        : parseFloat(price) || market?.price || 0
                }
                usdAmount={orderValue}
                tokenAmount={parseFloat(size) || 0}
                leverage={Math.min(leverage, maxLeverage)}
                venueLabel={orderType === 'limit' ? 'Perp · Limit' : 'Perp'}
                error={error || undefined}
            />

            {/* Success sheet */}
            <TradeSuccessSheet
                open={showSuccess}
                onClose={() => setShowSuccess(false)}
                side={filledSnapshot?.side || 'buy'}
                symbol={filledSnapshot?.symbol || marketSymbol || coin}
                ticker={filledSnapshot?.ticker || coin}
                tokenAmount={filledSnapshot?.tokenAmount || 0}
                usdAmount={filledSnapshot?.usdAmount || 0}
                avgPrice={filledSnapshot?.avgPrice}
                newBalance={account?.equity}
            />

            {/* Stock Approval Modal */}
            {showStockApprovalModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-[#E3B34C]/30 rounded-2xl p-6 max-w-sm w-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-400" />
                                <h3 className="text-lg font-bold text-white">{t.advancedOrder.enableStocks}</h3>
                            </div>
                            <button
                                onClick={() => setShowStockApprovalModal(false)}
                                className="text-white/50 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {t.advancedOrder.enableStocksDesc.replace('{{coin}}', coin)}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowStockApprovalModal(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/8 text-white/70 border border-white/10 hover:bg-white/15 transition-all"
                            >
                                {t.common.cancel}
                            </button>
                            <button
                                onClick={handleEnableStocks}
                                disabled={dexAbstractionLoading}
                                className="flex-1 py-3 rounded-xl font-bold text-sm bg-blue-500 text-white hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {dexAbstractionLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {t.advancedOrder.enabling}
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        {t.advancedOrder.enableStocks}
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

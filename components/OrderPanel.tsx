'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useWallets } from '@privy-io/react-auth';
import { TrendingUp, TrendingDown, AlertCircle, Info, Settings2, Zap } from 'lucide-react';
import OrderNotification, { OrderNotificationData } from '@/components/OrderNotification';
import { BUILDER_CONFIG } from '@/lib/hyperliquid/client';
import { MIN_NOTIONAL_VALUE } from '@/lib/constants';

type OrderSide = 'long' | 'short';
type OrderMode = 'basic' | 'advanced';
type MarginMode = 'isolated' | 'cross';

export default function OrderPanel() {
    const { t, formatCurrency } = useLanguage();
    const { connected, getMarket, selectedMarket, placeOrder, account, refreshAccountData } = useHyperliquid();

    const [mode, setMode] = useState<OrderMode>('basic');
    const [orderSide, setOrderSide] = useState<OrderSide>('long');

    // Basic mode state (margin amount - position size = margin * leverage)
    const [marginAmount, setMarginAmount] = useState<string>('');

    // Advanced mode state (token amount)
    const [size, setSize] = useState<string>('');
    const [limitPrice, setLimitPrice] = useState<string>('');

    // Shared state
    const [leverage, setLeverage] = useState<number>(1);
    const [marginMode, setMarginMode] = useState<MarginMode>('isolated');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [orderNotification, setOrderNotification] = useState<OrderNotificationData | null>(null);

    const market = getMarket(selectedMarket);
    const displaySymbol = selectedMarket?.replace(/-(USD|PERP)$/i, '') || selectedMarket;
    const currentPrice = market?.price || 0;
    const maxLeverage = market?.maxLeverage || 20;

    const { wallets } = useWallets();
    const isUsingEmbeddedWallet = wallets.some((w: any) => w.walletClientType === 'privy');

    // Calculate values based on mode
    // Basic mode: user enters margin, position size = margin * leverage
    // Cap margin to available balance
    const rawMarginValue = parseFloat(marginAmount) || 0;
    const marginValue = Math.min(rawMarginValue, account.availableMargin > 0 ? account.availableMargin : rawMarginValue);
    const notionalValue = mode === 'basic'
        ? marginValue * leverage  // Position size = margin × leverage
        : (parseFloat(size) || 0) * currentPrice;
    const tokenSize = currentPrice > 0 ? notionalValue / currentPrice : 0;
    const requiredMargin = mode === 'basic' ? marginValue : notionalValue / leverage;

    // Fee breakdown for transparency
    // Exchange fee: ~0.035% for taker orders (market orders)
    const exchangeFee = notionalValue * 0.00035;
    // Builder fee: 0.03% (30 tenths of basis points)
    const builderFee = BUILDER_CONFIG.enabled ? notionalValue * (BUILDER_CONFIG.fee / 100000) : 0;
    // Total fee
    const fee = exchangeFee + builderFee;
    const totalRequired = requiredMargin + fee;

    const liquidationPrice = orderSide === 'long'
        ? currentPrice * (1 - 1 / leverage)
        : currentPrice * (1 + 1 / leverage);

    const apiSide = orderSide === 'long' ? 'buy' : 'sell';

    // Set margin mode for HIP-3 markets
    useEffect(() => {
        if (market?.onlyIsolated === true && marginMode !== 'isolated') {
            setMarginMode('isolated');
        }
    }, [market?.onlyIsolated, marginMode]);

    // Sync limit price with current price when switching to advanced
    useEffect(() => {
        if (mode === 'advanced' && !limitPrice && currentPrice > 0) {
            setLimitPrice(currentPrice.toFixed(2));
        }
    }, [mode, currentPrice, limitPrice]);

    const handlePlaceOrder = async () => {
        setError('');
        setSuccess('');

        if (!connected) {
            setError(t.errors.walletNotConnected);
            return;
        }

        if (tokenSize <= 0) {
            setError(t.order.invalidAmount);
            return;
        }

        if (notionalValue < MIN_NOTIONAL_VALUE) {
            setError(`Minimum order size is $${MIN_NOTIONAL_VALUE}`);
            return;
        }

        if (totalRequired > account.availableMargin) {
            setError(`${t.errors.insufficientFunds}`);
            return;
        }

        setLoading(true);
        try {
            const orderType = mode === 'basic' ? 'market' : 'limit';
            const price = mode === 'advanced' ? parseFloat(limitPrice) : undefined;

            const orderResult = await placeOrder(
                selectedMarket,
                apiSide,
                orderType,
                tokenSize,
                price,
                leverage
            );

            if (orderResult.filled) {
                setOrderNotification({
                    symbol: orderResult.symbol,
                    side: orderResult.side,
                    size: orderResult.filledSize,
                    price: orderResult.filledPrice,
                    pnl: orderResult.pnl,
                    isClosing: orderResult.isClosing,
                });

                // Force refresh account data to show updated positions/balance immediately
                setTimeout(() => refreshAccountData(), 500);
            }

            setSuccess(t.order.orderPlaced);
            setMarginAmount('');
            setSize('');
        } catch (err) {
            setError(err instanceof Error ? err.message : t.errors.unknown);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col min-w-0">
            {/* Mode Toggle Header */}
            <div className="p-3">
                <div className="flex items-center justify-center gap-1 p-1 bg-bg-tertiary rounded-xl">
                    <button
                        onClick={() => setMode('basic')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${mode === 'basic'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-coffee-medium hover:text-white'
                            }`}
                    >
                        <Zap className="w-4 h-4" />
                        {t.order.basic}
                    </button>
                    <button
                        onClick={() => setMode('advanced')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${mode === 'advanced'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-coffee-medium hover:text-white'
                            }`}
                    >
                        <Settings2 className="w-4 h-4" />
                        {t.order.advanced}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {mode === 'basic' ? (
                    /* ========== BASIC MODE ========== */
                    <>
                        {/* Market Info - Clean Display */}
                        <div className="text-center py-2">
                            <div className="text-2xl font-bold text-white">{displaySymbol}</div>
                            <div className="text-3xl font-bold text-primary mt-1">
                                {formatCurrency(currentPrice)}
                            </div>
                        </div>

                        {/* Buy/Sell Selection - Casino/Slots Style */}
                        <div className="flex gap-2 px-2">
                            <button
                                onClick={() => setOrderSide('long')}
                                className={`flex-1 py-6 rounded-2xl font-black text-xl transition-all duration-200 flex flex-col items-center justify-center gap-1 ${orderSide === 'long'
                                    ? 'bg-gradient-to-b from-[#FFFF00] to-[#FFD700] text-black shadow-[0_0_30px_rgba(255,255,0,0.5),0_4px_15px_rgba(0,0,0,0.3)] scale-[1.02] border-2 border-[#FFFF33]'
                                    : 'bg-[#0D0D0D] text-[#FFFF00] border-2 border-[#FFFF00]/20 hover:border-[#FFFF00]/50 hover:bg-[#FFFF00]/5'
                                    }`}
                                style={orderSide === 'long' ? { color: '#000' } : undefined}
                            >
                                <TrendingUp className="w-8 h-8" strokeWidth={3} />
                                <span className="tracking-wide">{t.order.buy}</span>
                            </button>
                            <button
                                onClick={() => setOrderSide('short')}
                                className={`flex-1 py-6 rounded-2xl font-black text-xl transition-all duration-200 flex flex-col items-center justify-center gap-1 ${orderSide === 'short'
                                    ? 'bg-gradient-to-b from-[#FF4444] to-[#CC0000] text-white shadow-[0_0_30px_rgba(255,68,68,0.5),0_4px_15px_rgba(0,0,0,0.3)] scale-[1.02] border-2 border-[#FF6666]'
                                    : 'bg-[#0D0D0D] text-[#FF4444] border-2 border-[#FF4444]/20 hover:border-[#FF4444]/50 hover:bg-[#FF4444]/5'
                                    }`}
                                style={orderSide === 'short' ? { color: '#FFFFFF' } : undefined}
                            >
                                <TrendingDown className="w-8 h-8" strokeWidth={3} />
                                <span className="tracking-wide">{t.order.sell}</span>
                            </button>
                        </div>

                        {/* Margin Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-base text-coffee-medium">Margin</label>
                                <span className="text-xl font-bold text-[#FFFF00]">{formatCurrency(marginValue)}</span>
                            </div>

                            <input
                                type="range"
                                min="0"
                                max={account.availableMargin > 0 ? account.availableMargin : 100}
                                step="1"
                                value={marginValue}
                                onChange={(e) => {
                                    const val = Math.min(parseFloat(e.target.value), account.availableMargin);
                                    setMarginAmount(val.toString());
                                }}
                                className="w-full h-[4px] rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: account.availableMargin > 0
                                        ? `linear-gradient(to right, #FFFF00 0%, #FFFF00 ${(marginValue / account.availableMargin) * 100}%, #3A3A3C ${(marginValue / account.availableMargin) * 100}%, #3A3A3C 100%)`
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
                        </div>

                        {/* Leverage Selector */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm text-coffee-medium">{t.order.leverage}</label>
                                <span className="text-lg font-bold text-[#FFFF00]">{leverage}x</span>
                            </div>
                            <div className="flex gap-3">
                                {/* Decrease leverage buttons */}
                                {[5, 2, 1].map((dec) => {
                                    const newLev = leverage - dec;
                                    const isDisabled = newLev < 1;
                                    return (
                                        <button
                                            key={`lev-sub-${dec}`}
                                            onClick={() => setLeverage(Math.max(1, newLev))}
                                            disabled={isDisabled}
                                            className={`flex-1 rounded-lg text-base font-bold transition-all flex items-center justify-center ${isDisabled ? 'cursor-not-allowed' : 'hover:brightness-110'}`}
                                            style={{
                                                backgroundColor: isDisabled ? '#2C2C2E' : '#4A4A4C',
                                                color: isDisabled ? 'rgba(255,255,255,0.3)' : 'white',
                                                minHeight: '56px'
                                            }}
                                            onMouseDown={(e) => { if (!isDisabled) { e.currentTarget.style.backgroundColor = '#FFFF00'; e.currentTarget.style.color = '#000'; } }}
                                            onMouseUp={(e) => { e.currentTarget.style.backgroundColor = isDisabled ? '#2C2C2E' : '#4A4A4C'; e.currentTarget.style.color = isDisabled ? 'rgba(255,255,255,0.3)' : 'white'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isDisabled ? '#2C2C2E' : '#4A4A4C'; e.currentTarget.style.color = isDisabled ? 'rgba(255,255,255,0.3)' : 'white'; }}
                                            onTouchStart={(e) => { if (!isDisabled) { e.currentTarget.style.backgroundColor = '#FFFF00'; e.currentTarget.style.color = '#000'; } }}
                                            onTouchEnd={(e) => { e.currentTarget.style.backgroundColor = isDisabled ? '#2C2C2E' : '#4A4A4C'; e.currentTarget.style.color = isDisabled ? 'rgba(255,255,255,0.3)' : 'white'; }}
                                        >
                                            −{dec}x
                                        </button>
                                    );
                                })}

                                {/* Increase leverage buttons */}
                                {[1, 2, 5].map((inc) => {
                                    const newLev = leverage + inc;
                                    const isDisabled = newLev > maxLeverage;
                                    return (
                                        <button
                                            key={`lev-add-${inc}`}
                                            onClick={() => setLeverage(Math.min(maxLeverage, newLev))}
                                            disabled={isDisabled}
                                            className={`flex-1 rounded-lg text-base font-bold transition-all flex items-center justify-center ${isDisabled ? 'cursor-not-allowed' : 'hover:brightness-110'}`}
                                            style={{
                                                backgroundColor: isDisabled ? '#2C2C2E' : '#4A4A4C',
                                                color: isDisabled ? 'rgba(255,255,255,0.3)' : 'white',
                                                minHeight: '56px'
                                            }}
                                            onMouseDown={(e) => { if (!isDisabled) { e.currentTarget.style.backgroundColor = '#FFFF00'; e.currentTarget.style.color = '#000'; } }}
                                            onMouseUp={(e) => { e.currentTarget.style.backgroundColor = isDisabled ? '#2C2C2E' : '#4A4A4C'; e.currentTarget.style.color = isDisabled ? 'rgba(255,255,255,0.3)' : 'white'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isDisabled ? '#2C2C2E' : '#4A4A4C'; e.currentTarget.style.color = isDisabled ? 'rgba(255,255,255,0.3)' : 'white'; }}
                                            onTouchStart={(e) => { if (!isDisabled) { e.currentTarget.style.backgroundColor = '#FFFF00'; e.currentTarget.style.color = '#000'; } }}
                                            onTouchEnd={(e) => { e.currentTarget.style.backgroundColor = isDisabled ? '#2C2C2E' : '#4A4A4C'; e.currentTarget.style.color = isDisabled ? 'rgba(255,255,255,0.3)' : 'white'; }}
                                        >
                                            +{inc}x
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Simple Summary */}
                        {marginValue > 0 && (
                            <div className="p-4 rounded-2xl space-y-2 border border-white/5 bg-transparent">
                                <div className="flex justify-between text-sm">
                                    <span className="text-coffee-medium">Margin</span>
                                    <span className="text-white font-semibold">{formatCurrency(marginValue)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-coffee-medium">{t.order.leverage}</span>
                                    <span className="text-white font-semibold">×{leverage}</span>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                                    <span className="text-coffee-medium">{t.order.positionSize}</span>
                                    <span className="text-primary font-bold">{formatCurrency(notionalValue)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-coffee-medium">{orderSide === 'long' ? t.order.youWillBuy : t.order.youWillSell}</span>
                                    <span className="text-white font-semibold">{tokenSize.toFixed(6)} {displaySymbol}</span>
                                </div>

                                {/* Fee Breakdown */}
                                <div className="space-y-1 pt-2 border-t border-white/5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-coffee-medium/70">Exchange Fee (0.035%)</span>
                                        <span className="text-coffee-medium">{formatCurrency(exchangeFee)}</span>
                                    </div>
                                    {BUILDER_CONFIG.enabled && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-coffee-medium/70">Builder Fee (0.03%)</span>
                                            <span className="text-coffee-medium">{formatCurrency(builderFee)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="text-coffee-medium">Total Fees</span>
                                        <span className="text-white">{formatCurrency(fee)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                                    <span className="text-coffee-medium">{t.order.liqPrice}</span>
                                    <span className="text-bearish font-semibold">{formatCurrency(liquidationPrice)}</span>
                                </div>
                            </div>
                        )}

                        {/* Balance Display */}
                        <div className="flex justify-between items-center py-2 px-3 rounded-xl border border-white/5 bg-transparent">
                            <span className="text-sm text-coffee-medium">{t.order.available}</span>
                            <span className="text-sm font-bold text-white">{formatCurrency(account.availableMargin)}</span>
                        </div>
                    </>
                ) : (
                    /* ========== ADVANCED MODE ========== */
                    <>
                        {/* Order Type Info */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-transparent">
                            <span className="text-sm text-coffee-medium">{t.order.orderType}</span>
                            <span className="text-sm font-semibold text-primary">{t.order.limitOrder}</span>
                        </div>

                        {/* Long/Short Tabs */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setOrderSide('long')}
                                className={`py-4 rounded-lg font-bold transition-all border-2 ${orderSide === 'long'
                                    ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                                    : 'bg-primary/30 text-primary-foreground border-primary/30 hover:bg-primary/50'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    {t.order.long}
                                </div>
                            </button>
                            <button
                                onClick={() => setOrderSide('short')}
                                className={`py-4 rounded-lg font-bold transition-all border-2 ${orderSide === 'short'
                                    ? 'bg-bearish text-white border-bearish shadow-lg'
                                    : 'bg-bearish/30 text-white border-bearish/30 hover:bg-bearish/50'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <TrendingDown className="w-5 h-5" />
                                    {t.order.short}
                                </div>
                            </button>
                        </div>

                        {/* Limit Price */}
                        <div>
                            <label className="text-sm font-semibold mb-2 block text-white">{t.order.limitPrice}</label>
                            <input
                                type="number"
                                value={limitPrice}
                                onChange={(e) => setLimitPrice(e.target.value)}
                                placeholder={currentPrice.toFixed(2)}
                                className="input text-lg font-bold bg-bg-tertiary border-white/10 rounded-lg"
                                step="0.01"
                            />
                            <div className="flex justify-between text-xs text-coffee-medium mt-1">
                                <span>{t.order.current}: {formatCurrency(currentPrice)}</span>
                                <button
                                    onClick={() => setLimitPrice(currentPrice.toFixed(2))}
                                    className="text-primary hover:underline"
                                >
                                    {t.order.useCurrent}
                                </button>
                            </div>
                        </div>

                        {/* Token Amount */}
                        <div>
                            <label className="text-sm font-semibold mb-2 block text-white">{t.order.amountTokens}</label>
                            <input
                                type="number"
                                value={size}
                                onChange={(e) => setSize(e.target.value)}
                                placeholder="0.000000"
                                className="input text-lg font-bold bg-bg-tertiary border-white/10 rounded-lg"
                                step="0.001"
                            />
                            <div className="mt-3">
                                {(() => {
                                    const maxTokens = currentPrice > 0 ? (account.availableMargin / currentPrice) : 0;
                                    return (
                                        <>
                                            <input
                                                type="range"
                                                min="0"
                                                max={maxTokens > 0 ? maxTokens.toFixed(6) : "0"}
                                                value={tokenSize || 0}
                                                onChange={(e) => setSize(parseFloat(e.target.value).toFixed(6))}
                                                className="w-full h-2 bg-bg-tertiary rounded-full appearance-none cursor-pointer accent-primary"
                                            />
                                            <div className="flex justify-between text-xs text-coffee-medium mt-1">
                                                <span>0</span>
                                                <span>{maxTokens.toFixed(4)} {t.order.max}</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Leverage */}
                        <div>
                            <label className="text-sm font-semibold mb-2 block text-white">{t.order.leverage}</label>
                            <input
                                type="text"
                                value={`x${Math.min(leverage, maxLeverage)}`}
                                onChange={(e) => {
                                    const val = e.target.value.replace('x', '');
                                    const num = parseInt(val) || 1;
                                    setLeverage(Math.min(Math.max(num, 1), maxLeverage));
                                }}
                                className="input text-lg font-bold bg-bg-tertiary border-white/10 rounded-lg"
                            />
                            <div className="mt-3">
                                <input
                                    type="range"
                                    min="1"
                                    max={maxLeverage}
                                    value={Math.min(leverage, maxLeverage)}
                                    onChange={(e) => setLeverage(parseInt(e.target.value))}
                                    className="w-full h-2 bg-bg-tertiary rounded-full appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-xs text-coffee-medium mt-1">
                                    <span>x1</span>
                                    <span>x{maxLeverage}</span>
                                </div>
                            </div>
                        </div>

                        {/* Margin Mode */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="text-sm font-semibold text-white">{t.order.marginMode}</label>
                                {market?.onlyIsolated && (
                                    <span className="text-xs text-secondary bg-secondary/20 px-2 py-0.5 rounded font-semibold">
                                        HIP-3
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {(['isolated', 'cross'] as MarginMode[]).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMarginMode(m)}
                                        disabled={market?.onlyIsolated && m === 'cross'}
                                        className={`py-3 px-4 rounded-lg text-sm font-semibold transition-all capitalize ${marginMode === m
                                            ? 'bg-primary text-primary-foreground'
                                            : market?.onlyIsolated && m === 'cross'
                                                ? 'bg-bg-tertiary/50 text-coffee-medium/50 cursor-not-allowed'
                                                : 'bg-bg-tertiary text-coffee-medium hover:bg-white/10'
                                            }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="space-y-2 p-3 rounded-lg border border-white/5 bg-transparent">
                            <div className="flex justify-between text-sm">
                                <span className="text-coffee-medium">{t.order.limitPrice}</span>
                                <span className="font-semibold text-white">{formatCurrency(parseFloat(limitPrice) || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-coffee-medium">{t.order.notional}</span>
                                <span className="font-semibold text-white">{formatCurrency(notionalValue)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-coffee-medium">{t.order.marginNeeded} ({leverage}x)</span>
                                <span className="font-semibold text-white">{formatCurrency(requiredMargin)}</span>
                            </div>

                            {/* Fee Breakdown */}
                            <div className="space-y-1 pt-2 border-t border-white/5">
                                <div className="flex justify-between text-xs">
                                    <span className="text-coffee-medium/70">Exchange Fee (0.035%)</span>
                                    <span className="text-coffee-medium">{formatCurrency(exchangeFee)}</span>
                                </div>
                                {BUILDER_CONFIG.enabled && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-coffee-medium/70">Builder Fee (0.03%)</span>
                                        <span className="text-coffee-medium">{formatCurrency(builderFee)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-coffee-medium">Total Fees</span>
                                    <span className="text-white">{formatCurrency(fee)}</span>
                                </div>
                            </div>

                            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                                <span className="text-coffee-medium">{t.order.estLiquidation}</span>
                                <span className="font-semibold text-bearish">{formatCurrency(liquidationPrice)}</span>
                            </div>
                        </div>

                        {/* Balance */}
                        <div className="flex justify-between text-sm p-3 rounded-lg border border-white/5 bg-transparent">
                            <span className="text-coffee-medium">{t.order.available}</span>
                            <span className="font-semibold text-white">{formatCurrency(account.availableMargin)}</span>
                        </div>
                    </>
                )}

                {/* Error/Success Messages */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-bearish/10 border border-bearish/20 rounded-lg text-sm text-bearish">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 p-3 bg-[#FFFF00]/10 border border-[#FFFF00]/20 rounded-lg text-sm text-[#FFFF00]">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {/* Minimum Notional Warning */}
                {((mode === 'basic' && marginValue > 0 && notionalValue < MIN_NOTIONAL_VALUE) ||
                    (mode === 'advanced' && tokenSize > 0 && notionalValue < MIN_NOTIONAL_VALUE)) && (
                        <div className="flex items-center gap-2 p-3 bg-secondary/10 border border-secondary/20 rounded-lg text-sm text-secondary">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Minimum ${MIN_NOTIONAL_VALUE} required</span>
                        </div>
                    )}

                {/* Place Order Button - Rayo Style - Taller & Squared */}
                <button
                    onClick={handlePlaceOrder}
                    disabled={!connected || loading || tokenSize <= 0 || notionalValue < MIN_NOTIONAL_VALUE}
                    className={`w-full rounded-xl text-xl font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center ${orderSide === 'long'
                        ? 'bg-[#FFFF00] hover:bg-[#FFFF33] text-black shadow-[0_0_20px_rgba(255,255,0,0.3)]'
                        : 'bg-[#FF4444] hover:bg-[#FF5555] text-white shadow-[0_0_20px_rgba(255,68,68,0.3)]'
                        }`}
                    style={orderSide === 'long' ? { color: '#000', minHeight: '80px' } : { minHeight: '80px' }}
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="spinner" style={{ borderTopColor: orderSide === 'long' ? '#000' : '#FFF' }} />
                            {t.common.processing}
                        </div>
                    ) : notionalValue > 0 && notionalValue < MIN_NOTIONAL_VALUE ? (
                        `Min $${MIN_NOTIONAL_VALUE}`
                    ) : (
                        mode === 'basic'
                            ? `${orderSide === 'long' ? t.order.buy : t.order.sell} ${displaySymbol}`
                            : `${t.order.placeOrder} ${orderSide === 'long' ? t.order.long : t.order.short}`
                    )}
                </button>
            </div>

            {/* Order Notification */}
            <OrderNotification
                order={orderNotification}
                onClose={() => setOrderNotification(null)}
            />
        </div>
    );
}

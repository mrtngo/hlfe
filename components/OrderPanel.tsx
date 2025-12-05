'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useWallets } from '@privy-io/react-auth';
import { TrendingUp, TrendingDown, AlertCircle, Info, Settings2, Zap } from 'lucide-react';
import OrderNotification, { OrderNotificationData } from '@/components/OrderNotification';

type OrderSide = 'long' | 'short';
type OrderMode = 'basic' | 'advanced';
type MarginMode = 'isolated' | 'cross';

// Hyperliquid minimum notional value requirement
const MIN_NOTIONAL_VALUE = 10;

export default function OrderPanel() {
    const { t, formatCurrency } = useLanguage();
    const { connected, getMarket, selectedMarket, placeOrder, account } = useHyperliquid();

    const [mode, setMode] = useState<OrderMode>('basic');
    const [orderSide, setOrderSide] = useState<OrderSide>('long');
    
    // Basic mode state (USD amount)
    const [usdAmount, setUsdAmount] = useState<string>('');
    
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
    const currentPrice = market?.price || 0;
    const maxLeverage = market?.maxLeverage || 20;
    
    const { wallets } = useWallets();
    const isUsingEmbeddedWallet = wallets.some((w: any) => w.walletClientType === 'privy');

    // Calculate values based on mode
    const usdValue = parseFloat(usdAmount) || 0;
    const tokenSize = mode === 'basic' 
        ? (currentPrice > 0 ? usdValue / currentPrice : 0)
        : (parseFloat(size) || 0);
    
    const notionalValue = mode === 'basic' ? usdValue : tokenSize * currentPrice;
    const requiredMargin = notionalValue / leverage;
    const fee = notionalValue * 0.0005;
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
            }
            
            setSuccess(t.order.orderPlaced);
            setUsdAmount('');
            setSize('');
        } catch (err) {
            setError(err instanceof Error ? err.message : t.errors.unknown);
        } finally {
            setLoading(false);
        }
    };

    // Quick amount buttons for basic mode
    const quickAmounts = [10, 25, 50, 100];

    return (
        <div className="h-full flex flex-col bg-[#1A1A1A] rounded-2xl shadow-soft-lg min-w-0 border border-[#FFFF00]/10">
            {/* Mode Toggle Header */}
            <div className="p-3 border-b border-white/10">
                <div className="flex items-center justify-center gap-1 p-1 bg-bg-tertiary rounded-xl">
                    <button
                        onClick={() => setMode('basic')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                            mode === 'basic'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'text-coffee-medium hover:text-white'
                        }`}
                    >
                        <Zap className="w-4 h-4" />
                        {t.order.basic}
                    </button>
                    <button
                        onClick={() => setMode('advanced')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                            mode === 'advanced'
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
                            <div className="text-2xl font-bold text-white">{selectedMarket}</div>
                            <div className="text-3xl font-bold text-primary mt-1">
                                {formatCurrency(currentPrice)}
                            </div>
                        </div>

                        {/* Buy/Sell Selection - Rayo Brand Style */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setOrderSide('long')}
                                className={`py-5 rounded-full font-bold text-lg transition-all ${
                                    orderSide === 'long'
                                        ? 'bg-[#FFFF00] text-black shadow-[0_0_20px_rgba(255,255,0,0.3)] scale-[1.02]'
                                        : 'bg-[#1A1A1A] text-[#FFFF00] border-2 border-[#FFFF00]/30 hover:border-[#FFFF00]/60'
                                }`}
                            >
                                <TrendingUp className="w-6 h-6 mx-auto mb-1" />
                                {t.order.buy}
                            </button>
                            <button
                                onClick={() => setOrderSide('short')}
                                className={`py-5 rounded-full font-bold text-lg transition-all ${
                                    orderSide === 'short'
                                        ? 'bg-[#FF4444] text-white shadow-[0_0_20px_rgba(255,68,68,0.3)] scale-[1.02]'
                                        : 'bg-[#1A1A1A] text-[#FF4444] border-2 border-[#FF4444]/30 hover:border-[#FF4444]/60'
                                }`}
                            >
                                <TrendingDown className="w-6 h-6 mx-auto mb-1" />
                                {t.order.sell}
                            </button>
                        </div>

                        {/* USD Amount Input - Simple and Clear */}
                        <div>
                            <label className="text-sm text-coffee-medium mb-2 block">{t.order.amountUSD}</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-coffee-medium">$</span>
                                <input
                                    type="number"
                                    value={usdAmount}
                                    onChange={(e) => setUsdAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-10 pr-4 py-4 text-2xl font-bold text-white bg-bg-tertiary border border-white/10 rounded-2xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>
                            
                            {/* Quick Amount Buttons - Rayo brand */}
                            <div className="flex gap-3 mt-4">
                                {quickAmounts.map((amount) => {
                                    const isActive = usdAmount === amount.toString();
                                    return (
                                        <button
                                            key={amount}
                                            onClick={() => setUsdAmount(amount.toString())}
                                            className={`flex-1 py-3 px-3 rounded-2xl text-base font-bold transition-all active:scale-[0.98] ${
                                                isActive
                                                    ? 'bg-[#FFFF00] text-black shadow-[0_0_18px_rgba(255,255,0,0.35)] border-2 border-[#FFFF00]/80'
                                                    : 'bg-[#0A0A0A] text-[#FFFF00]/80 border border-[#FFFF00]/20 hover:border-[#FFFF00]/50 hover:text-[#FFFF00]'
                                            }`}
                                        >
                                            ${amount}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Simple Leverage Selector */}
                        <div>
                            <label className="text-sm text-coffee-medium mb-2 block">{t.order.leverage}</label>
                            <div className="flex gap-3">
                                {[1, 2, 5, 10].map((lev) => {
                                    const isActive = leverage === lev;
                                    const isDisabled = lev > maxLeverage;
                                    return (
                                        <button
                                            key={lev}
                                            onClick={() => setLeverage(Math.min(lev, maxLeverage))}
                                            disabled={isDisabled}
                                            className={`flex-1 py-3.5 px-3 rounded-2xl text-base font-bold transition-all active:scale-[0.98] ${
                                                isDisabled
                                                    ? 'bg-bg-tertiary/40 text-coffee-medium/50 border border-white/5 cursor-not-allowed'
                                                    : isActive
                                                    ? 'bg-[#FFFF00] text-black shadow-[0_0_18px_rgba(255,255,0,0.35)] border-2 border-[#FFFF00]/80'
                                                    : 'bg-[#0A0A0A] text-[#FFFF00]/80 border border-[#FFFF00]/20 hover:border-[#FFFF00]/50 hover:text-[#FFFF00]'
                                            }`}
                                        >
                                            {lev}x
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Simple Summary */}
                        {usdValue > 0 && (
                            <div className="p-4 bg-bg-tertiary/50 rounded-2xl space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-coffee-medium">{orderSide === 'long' ? t.order.youWillBuy : t.order.youWillSell}</span>
                                    <span className="text-white font-semibold">{tokenSize.toFixed(6)} {selectedMarket}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-coffee-medium">{t.order.positionSize}</span>
                                    <span className="text-white font-semibold">{formatCurrency(usdValue)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-coffee-medium">{t.order.leverage}</span>
                                    <span className="text-white font-semibold">{leverage}x</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-coffee-medium">{t.order.marginNeeded}</span>
                                    <span className="text-white font-semibold">{formatCurrency(usdValue / leverage)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-coffee-medium">{t.order.liqPrice}</span>
                                    <span className="text-bearish font-semibold">{formatCurrency(liquidationPrice)}</span>
                                </div>
                            </div>
                        )}

                        {/* Balance Display */}
                        <div className="flex justify-between items-center py-2 px-3 bg-bg-tertiary/30 rounded-xl">
                            <span className="text-sm text-coffee-medium">{t.order.available}</span>
                            <span className="text-sm font-bold text-white">{formatCurrency(account.availableMargin)}</span>
                        </div>
                    </>
                ) : (
                    /* ========== ADVANCED MODE ========== */
                    <>
                        {/* Order Type Info */}
                        <div className="flex items-center justify-between p-3 bg-bg-tertiary/30 rounded-xl">
                            <span className="text-sm text-coffee-medium">{t.order.orderType}</span>
                            <span className="text-sm font-semibold text-primary">{t.order.limitOrder}</span>
                        </div>

                        {/* Long/Short Tabs */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setOrderSide('long')}
                                className={`py-4 rounded-lg font-bold transition-all border-2 ${
                                    orderSide === 'long'
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
                                className={`py-4 rounded-lg font-bold transition-all border-2 ${
                                    orderSide === 'short'
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
                                        className={`py-3 px-4 rounded-lg text-sm font-semibold transition-all capitalize ${
                                            marginMode === m
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
                        <div className="space-y-2 p-3 bg-bg-tertiary/50 rounded-lg">
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
                            <div className="flex justify-between text-sm">
                                <span className="text-coffee-medium">{t.order.fee}</span>
                                <span className="text-white">{formatCurrency(fee)}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                                <span className="text-coffee-medium">{t.order.estLiquidation}</span>
                                <span className="font-semibold text-bearish">{formatCurrency(liquidationPrice)}</span>
                            </div>
                        </div>

                        {/* Balance */}
                        <div className="flex justify-between text-sm p-3 bg-bg-tertiary/30 rounded-lg">
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
                {((mode === 'basic' && usdValue > 0 && usdValue < MIN_NOTIONAL_VALUE) ||
                  (mode === 'advanced' && tokenSize > 0 && notionalValue < MIN_NOTIONAL_VALUE)) && (
                    <div className="flex items-center gap-2 p-3 bg-secondary/10 border border-secondary/20 rounded-lg text-sm text-secondary">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Minimum ${MIN_NOTIONAL_VALUE} required</span>
                    </div>
                )}

                {/* Place Order Button - Rayo Style */}
                <button
                    onClick={handlePlaceOrder}
                    disabled={!connected || loading || tokenSize <= 0 || notionalValue < MIN_NOTIONAL_VALUE}
                    className={`w-full rounded-full py-4 text-lg font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                        orderSide === 'long'
                            ? 'bg-[#FFFF00] hover:bg-[#FFFF33] text-black shadow-[0_0_20px_rgba(255,255,0,0.3)]'
                            : 'bg-[#FF4444] hover:bg-[#FF5555] text-white shadow-[0_0_20px_rgba(255,68,68,0.3)]'
                    }`}
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
                            ? `${orderSide === 'long' ? t.order.buy : t.order.sell} ${selectedMarket}`
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

'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { TrendingUp, TrendingDown, AlertCircle, Info, Plus } from 'lucide-react';

type OrderType = 'market' | 'limit' | 'twap';
type OrderSide = 'long' | 'short';
type MarginMode = 'isolated' | 'cross';

export default function OrderPanel() {
    const { t, formatCurrency, formatPercent } = useLanguage();
    const { connected, getMarket, selectedMarket, placeOrder, account } = useHyperliquid();

    const [orderSide, setOrderSide] = useState<OrderSide>('long');
    const [orderType, setOrderType] = useState<OrderType>('market');
    const [size, setSize] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [leverage, setLeverage] = useState<number>(1);
    const [advanced, setAdvanced] = useState<boolean>(false);
    const [marginMode, setMarginMode] = useState<MarginMode>('isolated');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    const market = getMarket(selectedMarket);
    const currentPrice = market?.price || 0;
    const maxLeverage = market?.maxLeverage || 20; // Default to 20 if not set
    const orderPrice = orderType === 'market' ? currentPrice : (parseFloat(price) || currentPrice);
    const orderSize = parseFloat(size) || 0;
    const notionalValue = orderSize * orderPrice;
    const requiredMargin = notionalValue / leverage;
    const fee = notionalValue * 0.0005;
    const totalRequired = requiredMargin + fee;
    const liquidationPrice = orderSide === 'long'
        ? orderPrice * (1 - 1 / leverage)
        : orderPrice * (1 + 1 / leverage);
    
    const apiSide = orderSide === 'long' ? 'buy' : 'sell';

    // Automatically set margin mode to isolated for HIP-3 markets
    useEffect(() => {
        if (market?.onlyIsolated === true && marginMode !== 'isolated') {
            setMarginMode('isolated');
        }
    }, [market?.onlyIsolated, marginMode]);

    const handlePlaceOrder = async () => {
        setError('');
        setSuccess('');

        if (!connected) {
            setError(t.errors.walletNotConnected);
            return;
        }

        if (orderSize <= 0) {
            setError(t.order.invalidAmount);
            return;
        }

        if (orderType === 'limit' && orderPrice <= 0) {
            setError(t.order.invalidPrice);
            return;
        }

        if (totalRequired > account.availableMargin) {
            setError(`${t.errors.insufficientFunds}. Required: ${formatCurrency(totalRequired)}, Available: ${formatCurrency(account.availableMargin)}`);
            return;
        }

        setLoading(true);
        try {
            await placeOrder(
                selectedMarket,
                apiSide,
                orderType === 'twap' ? 'market' : orderType,
                orderSize,
                orderType === 'limit' ? orderPrice : undefined,
                leverage
            );
            setSuccess(t.order.orderPlaced);
            setSize('');
            setPrice('');
        } catch (err) {
            setError(err instanceof Error ? err.message : t.errors.unknown);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card h-full flex flex-col bg-bg-secondary rounded-lg shadow-soft-lg min-w-0 border border-white/10">
            <div className="p-4 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">{t.order.title}</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Order Side Tabs - Large Pill Control */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setOrderSide('long')}
                        className={`py-4 rounded-lg font-bold transition-all min-h-[64px] border-2 shadow-soft ${
                            orderSide === 'long'
                                ? 'bg-bullish text-white border-bullish shadow-soft-lg scale-105'
                                : 'bg-bg-tertiary text-coffee-medium hover:bg-bg-hover border-white/10'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Long
                        </div>
                    </button>
                    <button
                        onClick={() => setOrderSide('short')}
                        className={`py-4 rounded-lg font-bold transition-all min-h-[64px] border-2 shadow-soft ${
                            orderSide === 'short'
                                ? 'bg-bearish text-white border-bearish shadow-soft-lg scale-105'
                                : 'bg-bg-tertiary text-coffee-medium hover:bg-bg-hover border-white/10'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <TrendingDown className="w-5 h-5" />
                            Short
                        </div>
                    </button>
                </div>

                {/* Advanced Toggle */}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Advanced</span>
                    <button
                        onClick={() => setAdvanced(!advanced)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                            advanced ? 'bg-primary' : 'bg-bg-tertiary border border-white/10'
                        }`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-soft ${
                            advanced ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                    </button>
                </div>

                {/* Order Type */}
                <div>
                    <div className="grid grid-cols-3 gap-2">
                        {(['market', 'limit', 'twap'] as OrderType[]).map((type) => (
                        <button
                                key={type}
                                onClick={() => setOrderType(type)}
                                className={`py-3 px-4 rounded-lg text-sm font-semibold transition-all min-h-[48px] capitalize ${
                                    orderType === type
                                        ? 'bg-primary text-white border-2 border-primary shadow-soft'
                                        : 'bg-bg-tertiary text-coffee-medium hover:bg-bg-hover border border-white/10'
                                }`}
                            >
                                {type}
                        </button>
                        ))}
                    </div>
                </div>

                {/* Price (for limit orders) */}
                {orderType === 'limit' && (
                    <div>
                        <label className="text-sm text-coffee-medium mb-2 block font-semibold">{t.order.price}</label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder={formatCurrency(currentPrice)}
                            className="input bg-bg-tertiary border-white/10 rounded-lg"
                            step="0.01"
                        />
                    </div>
                )}

                {/* Amount */}
                <div>
                    <label className="text-sm font-semibold mb-2 block text-white">Amount</label>
                    <input
                        type="number"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        placeholder="$0.00"
                        className="input text-lg font-bold bg-bg-tertiary border-white/10 rounded-lg"
                        step="0.001"
                    />
                    <div className="mt-3">
                        <input
                            type="range"
                            min="0"
                            max={account.availableMargin > 0 ? (account.availableMargin * leverage / currentPrice).toFixed(2) : "100"}
                            value={orderSize || 0}
                            onChange={(e) => setSize(e.target.value)}
                            className="w-full h-2 bg-bg-tertiary rounded-full appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-coffee-medium mt-1">
                            <span>$0.00</span>
                            <span>${((account.availableMargin * leverage / currentPrice) || 0.01).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Multiplier (Leverage) */}
                <div>
                    <label className="text-sm font-semibold mb-2 block text-white">Multiplier</label>
                    <input
                        type="text"
                        value={`x${Math.min(leverage, maxLeverage)}`}
                        onChange={(e) => {
                            const val = e.target.value.replace('x', '');
                            const num = parseInt(val) || 1;
                            setLeverage(Math.min(Math.max(num, 1), maxLeverage));
                        }}
                        placeholder="x1"
                        className="input text-lg font-bold bg-bg-tertiary border-white/10 rounded-lg"
                    />
                    <div className="mt-3">
                        <input
                            type="range"
                            min="1"
                            max={maxLeverage}
                            value={Math.min(leverage, maxLeverage)}
                            onChange={(e) => setLeverage(Math.min(parseInt(e.target.value), maxLeverage))}
                            className="w-full h-2 bg-bg-tertiary rounded-full appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-coffee-medium mt-1">
                            <span>x1</span>
                            <span>x{maxLeverage}</span>
                        </div>
                    </div>
                </div>

                {/* Margin Mode */}
                {advanced && (
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm font-semibold text-white">Margin Mode</label>
                            <Info className="w-3 h-3 text-coffee-medium" />
                            {market?.onlyIsolated && (
                                <span className="text-xs text-secondary bg-secondary/20 px-2 py-0.5 rounded font-semibold">
                                    HIP-3
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {(['isolated', 'cross'] as MarginMode[]).map((mode) => (
                            <button
                                    key={mode}
                                    onClick={() => setMarginMode(mode)}
                                    disabled={market?.onlyIsolated === true && mode === 'cross'}
                                    className={`py-3 px-4 rounded-lg text-sm font-semibold transition-all min-h-[48px] capitalize ${
                                        marginMode === mode
                                            ? 'bg-primary text-white border-2 border-primary shadow-soft'
                                            : market?.onlyIsolated === true && mode === 'cross'
                                            ? 'bg-bg-tertiary text-coffee-light cursor-not-allowed'
                                            : 'bg-bg-tertiary text-coffee-medium hover:bg-bg-hover border border-white/10'
                                    }`}
                                >
                                    {mode}
                            </button>
                            ))}
                        </div>
                        {market?.onlyIsolated === true && (
                            <p className="text-xs text-coffee-medium mt-2">
                                HIP-3 markets only support isolated margin mode
                            </p>
                        )}
                    </div>
                )}

                {/* Order Summary */}
                <div className="space-y-3 p-4 bg-bg-tertiary rounded-lg border border-white/10">
                    <div className="flex justify-between text-sm">
                        <span className="text-coffee-medium">{t.order.price}</span>
                        <span className="mono font-semibold text-white">{formatCurrency(orderPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-coffee-medium">Notional Value</span>
                        <span className="mono font-semibold text-white">{formatCurrency(notionalValue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-coffee-medium">Required Margin ({leverage}x)</span>
                        <span className="mono font-semibold text-white">{formatCurrency(requiredMargin)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-coffee-medium">{t.order.fee}</span>
                        <span className="mono text-white">{formatCurrency(fee)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                        <span className="text-white font-semibold">Total Required</span>
                        <span className="mono font-semibold text-white">{formatCurrency(totalRequired)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                        <div className="flex items-center gap-1">
                            <span className="text-coffee-medium">{t.order.estLiquidation}</span>
                            <div className="group relative">
                                <Info className="w-3 h-3 text-coffee-medium cursor-help" />
                                <div className="invisible group-hover:visible absolute left-0 top-6 w-48 p-2 bg-bg-tertiary border border-white/10 rounded-lg text-xs z-10 shadow-soft-lg">
                                    {t.tooltips.liquidationPrice}
                                </div>
                            </div>
                        </div>
                        <span className="mono font-semibold text-bearish">{formatCurrency(liquidationPrice)}</span>
                    </div>
                </div>

                {/* Available Balance */}
                <div className="flex justify-between text-sm p-3 bg-bg-tertiary rounded-lg border border-white/10">
                    <span className="text-coffee-medium">{t.order.availableBalance}</span>
                    <span className="mono font-semibold text-white">{formatCurrency(account.availableMargin)}</span>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-bearish/10 border border-bearish/20 rounded-lg text-sm text-bearish">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 p-3 bg-bullish/10 border border-bullish/20 rounded-lg text-sm text-bullish">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {/* Place Order Button - Large, Distinct, Bottom Position */}
                <button
                    onClick={handlePlaceOrder}
                    disabled={!connected || loading || orderSize <= 0}
                    className={`w-full rounded-lg py-4 text-base font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-soft-lg ${
                        orderSide === 'long'
                            ? 'bg-bullish hover:bg-bullish-light text-white'
                            : 'bg-bearish hover:bg-bearish-light text-white'
                    }`}
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="spinner" />
                            {t.common.loading}
                        </div>
                    ) : (
                        `Place ${orderSide === 'long' ? 'Long' : 'Short'} Order`
                    )}
                </button>
            </div>
        </div>
    );
}

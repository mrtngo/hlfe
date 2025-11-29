'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { TrendingUp, TrendingDown, AlertCircle, Info } from 'lucide-react';

type OrderType = 'market' | 'limit';
type OrderSide = 'buy' | 'sell';

export default function OrderPanel() {
    const { t, formatCurrency, formatPercent } = useLanguage();
    const { connected, getMarket, selectedMarket, placeOrder, account } = useHyperliquid();

    const [orderSide, setOrderSide] = useState<OrderSide>('buy');
    const [orderType, setOrderType] = useState<OrderType>('market');
    const [size, setSize] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [leverage, setLeverage] = useState<number>(5);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    const market = getMarket(selectedMarket);
    const currentPrice = market?.price || 0;
    const orderPrice = orderType === 'market' ? currentPrice : (parseFloat(price) || currentPrice);
    const orderSize = parseFloat(size) || 0;
    const notionalValue = orderSize * orderPrice; // Total position value
    const requiredMargin = notionalValue / leverage; // Margin needed with leverage
    const fee = notionalValue * 0.0005; // 0.05% fee
    const totalRequired = requiredMargin + fee;
    const liquidationPrice = orderSide === 'buy'
        ? orderPrice * (1 - 1 / leverage)
        : orderPrice * (1 + 1 / leverage);

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

        // Check if we have enough margin (with leverage, not full notional)
        if (totalRequired > account.availableMargin) {
            setError(`${t.errors.insufficientFunds}. Required: ${formatCurrency(totalRequired)}, Available: ${formatCurrency(account.availableMargin)}`);
            return;
        }

        setLoading(true);
        try {
            await placeOrder(
                selectedMarket,
                orderSide,
                orderType,
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
        <div className="glass-card h-full flex flex-col">
            <div className="p-4 border-b border-border">
                <h3 className="text-lg font-bold">{t.order.title}</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Order Side Tabs */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setOrderSide('buy')}
                        className={`py-3 rounded-lg font-bold transition-all ${orderSide === 'buy'
                                ? 'bg-buy text-white shadow-md'
                                : 'bg-tertiary text-muted hover:bg-glass'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            {t.order.buy}
                        </div>
                    </button>
                    <button
                        onClick={() => setOrderSide('sell')}
                        className={`py-3 rounded-lg font-bold transition-all ${orderSide === 'sell'
                                ? 'bg-sell text-white shadow-md'
                                : 'bg-tertiary text-muted hover:bg-glass'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <TrendingDown className="w-4 h-4" />
                            {t.order.sell}
                        </div>
                    </button>
                </div>

                {/* Order Type */}
                <div>
                    <label className="text-sm text-muted mb-2 block">{t.order.orderTypes.market}</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setOrderType('market')}
                            className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${orderType === 'market'
                                    ? 'bg-primary text-white'
                                    : 'bg-tertiary text-muted hover:bg-glass'
                                }`}
                        >
                            {t.order.market}
                        </button>
                        <button
                            onClick={() => setOrderType('limit')}
                            className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${orderType === 'limit'
                                    ? 'bg-primary text-white'
                                    : 'bg-tertiary text-muted hover:bg-glass'
                                }`}
                        >
                            {t.order.limit}
                        </button>
                    </div>
                </div>

                {/* Price (for limit orders) */}
                {orderType === 'limit' && (
                    <div>
                        <label className="text-sm text-muted mb-2 block">{t.order.price}</label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder={formatCurrency(currentPrice)}
                            className="input"
                            step="0.01"
                        />
                    </div>
                )}

                {/* Size */}
                <div>
                    <label className="text-sm text-muted mb-2 block">{t.order.amount}</label>
                    <input
                        type="number"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        placeholder="0.00"
                        className="input"
                        step="0.001"
                    />
                </div>

                {/* Leverage Slider */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-muted">{t.order.leverage}</label>
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-primary">{leverage}x</span>
                            <div className="group relative">
                                <Info className="w-3 h-3 text-muted cursor-help" />
                                <div className="invisible group-hover:visible absolute right-0 top-6 w-48 p-2 bg-tertiary border border-border rounded-md text-xs z-10">
                                    {t.tooltips.leverage}
                                </div>
                            </div>
                        </div>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="50"
                        value={leverage}
                        onChange={(e) => setLeverage(parseInt(e.target.value))}
                        className="w-full"
                        style={{
                            background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${(leverage - 1) / 49 * 100}%, var(--bg-tertiary) ${(leverage - 1) / 49 * 100}%, var(--bg-tertiary) 100%)`
                        }}
                    />
                    <div className="flex justify-between text-xs text-muted mt-1">
                        <span>1x</span>
                        <span>25x</span>
                        <span>50x</span>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="space-y-2 p-3 bg-tertiary rounded-lg">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted">{t.order.price}</span>
                        <span className="mono font-semibold">{formatCurrency(orderPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted">Notional Value</span>
                        <span className="mono font-semibold">{formatCurrency(notionalValue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted">Required Margin ({leverage}x)</span>
                        <span className="mono font-semibold">{formatCurrency(requiredMargin)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted">{t.order.fee}</span>
                        <span className="mono">{formatCurrency(fee)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border pt-2">
                        <span className="text-muted font-semibold">Total Required</span>
                        <span className="mono font-semibold">{formatCurrency(totalRequired)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border pt-2">
                        <div className="flex items-center gap-1">
                            <span className="text-muted">{t.order.estLiquidation}</span>
                            <div className="group relative">
                                <Info className="w-3 h-3 text-muted cursor-help" />
                                <div className="invisible group-hover:visible absolute left-0 top-6 w-48 p-2 bg-tertiary border border-border rounded-md text-xs z-10">
                                    {t.tooltips.liquidationPrice}
                                </div>
                            </div>
                        </div>
                        <span className="mono font-semibold text-sell">{formatCurrency(liquidationPrice)}</span>
                    </div>
                </div>

                {/* Available Balance */}
                <div className="flex justify-between text-sm p-2 bg-glass rounded">
                    <span className="text-muted">{t.order.availableBalance}</span>
                    <span className="mono font-semibold">{formatCurrency(account.availableMargin)}</span>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-sell/10 border border-sell/30 rounded-lg text-sm text-sell">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 p-3 bg-buy/10 border border-buy/30 rounded-lg text-sm text-buy">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {/* Place Order Button */}
                <button
                    onClick={handlePlaceOrder}
                    disabled={!connected || loading || orderSize <= 0}
                    className={orderSide === 'buy' ? 'btn-buy w-full' : 'btn-sell w-full'}
                >
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <div className="spinner" />
                            {t.common.loading}
                        </div>
                    ) : (
                        orderSide === 'buy' ? t.order.placeBuyOrder : t.order.placeSellOrder
                    )}
                </button>
            </div>
        </div>
    );
}

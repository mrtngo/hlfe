'use client';

import { useState } from 'react';
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
    const orderPrice = orderType === 'market' ? currentPrice : (parseFloat(price) || currentPrice);
    const orderSize = parseFloat(size) || 0;
    const notionalValue = orderSize * orderPrice; // Total position value
    const requiredMargin = notionalValue / leverage; // Margin needed with leverage
    const fee = notionalValue * 0.0005; // 0.05% fee
    const totalRequired = requiredMargin + fee;
    const liquidationPrice = orderSide === 'long'
        ? orderPrice * (1 - 1 / leverage)
        : orderPrice * (1 + 1 / leverage);
    
    // Convert to buy/sell for API
    const apiSide = orderSide === 'long' ? 'buy' : 'sell';

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
            // Convert long/short to buy/sell for API
            await placeOrder(
                selectedMarket,
                apiSide,
                orderType === 'twap' ? 'market' : orderType, // TWAP not supported yet, use market
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
                {/* Order Side Tabs - Long/Short */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setOrderSide('long')}
                        className={`py-4 rounded-full font-bold transition-all min-h-[56px] border-2 ${
                            orderSide === 'long'
                                ? 'bg-buy text-white border-buy shadow-md'
                                : 'bg-elevated text-muted hover:bg-card border-border'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Long
                        </div>
                    </button>
                    <button
                        onClick={() => setOrderSide('short')}
                        className={`py-4 rounded-full font-bold transition-all min-h-[56px] border-2 ${
                            orderSide === 'short'
                                ? 'bg-sell text-white border-sell shadow-md'
                                : 'bg-elevated text-muted hover:bg-card border-border'
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
                    <span className="text-sm font-semibold">Advanced</span>
                    <button
                        onClick={() => setAdvanced(!advanced)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                            advanced ? 'bg-primary' : 'bg-elevated border border-border'
                        }`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            advanced ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                    </button>
                </div>

                {/* Order Type */}
                <div>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setOrderType('market')}
                            className={`py-3 px-4 rounded-full text-sm font-semibold transition-all min-h-[48px] ${
                                orderType === 'market'
                                    ? 'bg-elevated text-white border-2 border-primary'
                                    : 'bg-elevated text-muted hover:bg-card border border-border'
                            }`}
                        >
                            Market
                        </button>
                        <button
                            onClick={() => setOrderType('limit')}
                            className={`py-3 px-4 rounded-full text-sm font-semibold transition-all min-h-[48px] ${
                                orderType === 'limit'
                                    ? 'bg-elevated text-white border-2 border-primary'
                                    : 'bg-elevated text-muted hover:bg-card border border-border'
                            }`}
                        >
                            Limit
                        </button>
                        <button
                            onClick={() => setOrderType('twap')}
                            className={`py-3 px-4 rounded-full text-sm font-semibold transition-all min-h-[48px] ${
                                orderType === 'twap'
                                    ? 'bg-elevated text-white border-2 border-primary'
                                    : 'bg-elevated text-muted hover:bg-card border border-border'
                            }`}
                        >
                            TWAP
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

                {/* Amount */}
                <div>
                    <label className="text-sm font-semibold mb-2 block">Amount</label>
                    <input
                        type="number"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        placeholder="$0.00"
                        className="input text-lg font-bold"
                        step="0.001"
                    />
                    {/* Amount Slider */}
                    <div className="mt-3">
                        <input
                            type="range"
                            min="0"
                            max={account.availableMargin > 0 ? (account.availableMargin * leverage / currentPrice).toFixed(2) : "100"}
                            value={orderSize || 0}
                            onChange={(e) => setSize(e.target.value)}
                            className="w-full h-2 bg-elevated rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-muted mt-1">
                            <span>$0.00</span>
                            <span>${((account.availableMargin * leverage / currentPrice) || 0.01).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Multiplier (Leverage) */}
                <div>
                    <label className="text-sm font-semibold mb-2 block">Multiplier</label>
                    <input
                        type="text"
                        value={`x${leverage}`}
                        onChange={(e) => {
                            const val = e.target.value.replace('x', '');
                            const num = parseInt(val) || 1;
                            setLeverage(Math.min(Math.max(num, 1), 20));
                        }}
                        placeholder="x1"
                        className="input text-lg font-bold"
                    />
                    {/* Multiplier Slider */}
                    <div className="mt-3">
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={leverage}
                            onChange={(e) => setLeverage(parseInt(e.target.value))}
                            className="w-full h-2 bg-elevated rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-muted mt-1">
                            <span>x1</span>
                            <span>x20</span>
                        </div>
                    </div>
                </div>

                {/* Margin Mode */}
                {advanced && (
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm font-semibold">Margin Mode</label>
                            <Info className="w-3 h-3 text-muted" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setMarginMode('isolated')}
                                className={`py-3 px-4 rounded-full text-sm font-semibold transition-all min-h-[48px] ${
                                    marginMode === 'isolated'
                                        ? 'bg-elevated text-white border-2 border-primary'
                                        : 'bg-elevated text-muted hover:bg-card border border-border'
                                }`}
                            >
                                Isolated
                            </button>
                            <button
                                onClick={() => setMarginMode('cross')}
                                className={`py-3 px-4 rounded-full text-sm font-semibold transition-all min-h-[48px] ${
                                    marginMode === 'cross'
                                        ? 'bg-elevated text-white border-2 border-primary'
                                        : 'bg-elevated text-muted hover:bg-card border border-border'
                                }`}
                            >
                                Cross
                            </button>
                        </div>
                    </div>
                )}

                {/* TP/SL */}
                {advanced && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-semibold">TP/SL</label>
                                <Info className="w-3 h-3 text-muted" />
                            </div>
                            <button className="px-3 py-1.5 bg-elevated border border-border rounded-full text-sm font-semibold hover:bg-card transition-colors flex items-center gap-1">
                                <Plus className="w-3 h-3" />
                                Add
                            </button>
                        </div>
                    </div>
                )}

                {/* Order Summary */}
                <div className="space-y-2 p-4 bg-elevated rounded-xl border border-border">
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
                <div className="flex justify-between text-sm p-3 bg-elevated rounded-xl border border-border">
                    <span className="text-muted">{t.order.availableBalance}</span>
                    <span className="mono font-semibold">{formatCurrency(account.availableMargin)}</span>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-sell-light border border-sell/30 rounded-xl text-sm text-sell">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 p-3 bg-buy-light border border-buy/30 rounded-xl text-sm text-buy">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {/* Place Order Button */}
                <button
                    onClick={handlePlaceOrder}
                    disabled={!connected || loading || orderSize <= 0}
                    className="w-full bg-elevated hover:bg-card border-2 border-primary rounded-full py-4 text-lg font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="spinner" />
                            {t.common.loading}
                        </div>
                    ) : (
                        'Place Order'
                    )}
                </button>
            </div>
        </div>
    );
}

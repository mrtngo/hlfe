'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellPlus, Trash2, TrendingUp, TrendingDown, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { db, PriceAlert } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import TokenLogo from './TokenLogo';

interface PriceAlertsProps {
    symbol?: string;
    currentPrice?: number;
    onClose?: () => void;
    isModal?: boolean;
}

export default function PriceAlerts({ symbol, currentPrice, onClose, isModal = false }: PriceAlertsProps) {
    const { user } = useUser();
    const { formatCurrency, formatNumber } = useLanguage();
    const [alerts, setAlerts] = useState<PriceAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [targetPrice, setTargetPrice] = useState('');
    const [direction, setDirection] = useState<'above' | 'below'>('above');
    const [selectedSymbol, setSelectedSymbol] = useState(symbol || 'BTC-USD');

    // Fetch user's alerts
    const fetchAlerts = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            const userAlerts = await db.priceAlerts.getByUser(user.id);
            // Filter by symbol if provided
            if (symbol) {
                setAlerts(userAlerts.filter(a => a.symbol === symbol || a.symbol === symbol.replace('-USD', '')));
            } else {
                setAlerts(userAlerts);
            }
        } catch (err) {
            console.error('Error fetching alerts:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id, symbol]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    // Set initial price based on current price
    useEffect(() => {
        if (currentPrice && !targetPrice) {
            // Default to 5% above/below current price
            const defaultTarget = direction === 'above'
                ? currentPrice * 1.05
                : currentPrice * 0.95;
            setTargetPrice(formatNumber(defaultTarget));
        }
    }, [currentPrice, direction, targetPrice]);

    // Update target price when direction changes
    const handleDirectionChange = (newDirection: 'above' | 'below') => {
        setDirection(newDirection);
        if (currentPrice) {
            const newTarget = newDirection === 'above'
                ? currentPrice * 1.05
                : currentPrice * 0.95;
            setTargetPrice(formatNumber(newTarget));
        }
    };

    // Create new alert
    const handleCreateAlert = async () => {
        if (!user?.id) {
            setError('Please connect your wallet first');
            return;
        }

        const price = parseFloat(targetPrice);
        if (isNaN(price) || price <= 0) {
            setError('Please enter a valid price');
            return;
        }

        // Validate direction makes sense
        if (currentPrice) {
            if (direction === 'above' && price <= currentPrice) {
                setError(`Target price must be above current price (${formatCurrency(currentPrice)})`);
                return;
            }
            if (direction === 'below' && price >= currentPrice) {
                setError(`Target price must be below current price (${formatCurrency(currentPrice)})`);
                return;
            }
        }

        setCreating(true);
        setError(null);

        try {
            const cleanSymbol = selectedSymbol.replace('-USD', '');
            const alert = await db.priceAlerts.create(user.id, cleanSymbol, price, direction);

            if (alert) {
                setAlerts(prev => [alert, ...prev]);
                setSuccess('Price alert created!');
                setTargetPrice('');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError('Failed to create alert. Make sure the price_alerts table exists in Supabase.');
            }
        } catch (err) {
            console.error('Error creating alert:', err);
            setError('Failed to create alert');
        } finally {
            setCreating(false);
        }
    };

    // Delete alert
    const handleDeleteAlert = async (alertId: string) => {
        try {
            const success = await db.priceAlerts.delete(alertId);
            if (success) {
                setAlerts(prev => prev.filter(a => a.id !== alertId));
            }
        } catch (err) {
            console.error('Error deleting alert:', err);
        }
    };

    const content = (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Price Alerts</h2>
                        <p className="text-xs text-white/50">Get notified when price hits your target</p>
                    </div>
                </div>
                {isModal && onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                )}
            </div>

            {/* Create Alert Form */}
            <div className="p-4 border-b border-white/10 bg-bg-secondary/50">
                <div className="space-y-4">
                    {/* Symbol + Current Price */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <TokenLogo symbol={selectedSymbol} size={36} />
                            <div>
                                <span className="font-bold text-white">{selectedSymbol.replace('-USD', '')}</span>
                                {currentPrice && (
                                    <p className="text-xs text-white/50">
                                        Current: {formatCurrency(currentPrice)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Direction Selector */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleDirectionChange('above')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${direction === 'above'
                                    ? 'bg-bullish text-white'
                                    : 'bg-bg-tertiary text-white/60 hover:bg-bg-hover'
                                }`}
                        >
                            <TrendingUp className="w-4 h-4" />
                            Price Above
                        </button>
                        <button
                            onClick={() => handleDirectionChange('below')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${direction === 'below'
                                    ? 'bg-bearish text-white'
                                    : 'bg-bg-tertiary text-white/60 hover:bg-bg-hover'
                                }`}
                        >
                            <TrendingDown className="w-4 h-4" />
                            Price Below
                        </button>
                    </div>

                    {/* Target Price Input */}
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-mono">$</span>
                        <input
                            type="number"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            placeholder="Enter target price"
                            className="w-full bg-bg-tertiary border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-mono text-lg placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                        />
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
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{success}</span>
                        </div>
                    )}

                    {/* Create Button */}
                    <button
                        onClick={handleCreateAlert}
                        disabled={creating || !targetPrice || !user}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <BellPlus className="w-5 h-5" />
                        {creating ? 'Creating...' : 'Create Alert'}
                    </button>

                    {!user && (
                        <p className="text-xs text-white/40 text-center">
                            Connect your wallet to create alerts
                        </p>
                    )}
                </div>
            </div>

            {/* Active Alerts List */}
            <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-sm font-semibold text-white/60 mb-3">
                    Active Alerts ({alerts.length})
                </h3>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-white/40">
                        <Bell className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm">No active alerts</p>
                        <p className="text-xs mt-1">Create one above to get started</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className="flex items-center justify-between p-3 bg-bg-secondary border border-white/10 rounded-xl hover:border-white/20 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <TokenLogo symbol={alert.symbol} size={32} />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-white">{alert.symbol}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${alert.direction === 'above'
                                                    ? 'bg-bullish/20 text-bullish'
                                                    : 'bg-bearish/20 text-bearish'
                                                }`}>
                                                {alert.direction === 'above' ? '↑ Above' : '↓ Below'}
                                            </span>
                                        </div>
                                        <p className="text-sm font-mono text-white/70">
                                            {formatCurrency(Number(alert.target_price))}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteAlert(alert.id)}
                                    className="p-2 hover:bg-bearish/20 rounded-lg transition-colors text-white/40 hover:text-bearish"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                />
                {/* Modal */}
                <div className="relative w-full sm:max-w-md max-h-[85vh] bg-bg-primary border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-bg-primary">
            {content}
        </div>
    );
}

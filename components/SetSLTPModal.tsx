'use client';

import { useState, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { Position } from '@/types/hyperliquid';
import { X, TrendingUp, TrendingDown, Zap, Percent, DollarSign } from 'lucide-react';

interface SetSLTPModalProps {
    isOpen: boolean;
    onClose: () => void;
    position: Position;
}

export default function SetSLTPModal({ isOpen, onClose, position }: SetSLTPModalProps) {
    const { placeTriggerOrder, markets } = useHyperliquid();
    const { formatCurrency } = useLanguage();

    const [takeProfitPrice, setTakeProfitPrice] = useState('');
    const [stopLossPrice, setStopLossPrice] = useState('');
    const [takeProfitPercent, setTakeProfitPercent] = useState('');
    const [stopLossPercent, setStopLossPercent] = useState('');
    const [tpInputMode, setTpInputMode] = useState<'price' | 'percent'>('percent');
    const [slInputMode, setSlInputMode] = useState<'price' | 'percent'>('percent');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const market = markets.find(m => m.symbol === position.symbol);
    const currentPrice = market?.price || position.markPrice;

    // Calculate price from percentage
    useEffect(() => {
        if (takeProfitPercent && tpInputMode === 'percent') {
            const percent = parseFloat(takeProfitPercent);
            if (!isNaN(percent)) {
                const multiplier = position.side === 'long' ? (1 + percent / 100) : (1 - percent / 100);
                setTakeProfitPrice((currentPrice * multiplier).toFixed(2));
            }
        }
    }, [takeProfitPercent, currentPrice, position.side, tpInputMode]);

    useEffect(() => {
        if (stopLossPercent && slInputMode === 'percent') {
            const percent = parseFloat(stopLossPercent);
            if (!isNaN(percent)) {
                const multiplier = position.side === 'long' ? (1 - percent / 100) : (1 + percent / 100);
                setStopLossPrice((currentPrice * multiplier).toFixed(2));
            }
        }
    }, [stopLossPercent, currentPrice, position.side, slInputMode]);

    // Calculate percentage from price
    useEffect(() => {
        if (takeProfitPrice && tpInputMode === 'price') {
            const price = parseFloat(takeProfitPrice);
            if (!isNaN(price)) {
                const percentChange = position.side === 'long'
                    ? ((price - currentPrice) / currentPrice) * 100
                    : ((currentPrice - price) / currentPrice) * 100;
                setTakeProfitPercent(Math.abs(percentChange).toFixed(2));
            }
        }
    }, [takeProfitPrice, currentPrice, position.side, tpInputMode]);

    useEffect(() => {
        if (stopLossPrice && slInputMode === 'price') {
            const price = parseFloat(stopLossPrice);
            if (!isNaN(price)) {
                const percentChange = position.side === 'long'
                    ? ((currentPrice - price) / currentPrice) * 100
                    : ((price - currentPrice) / currentPrice) * 100;
                setStopLossPercent(Math.abs(percentChange).toFixed(2));
            }
        }
    }, [stopLossPrice, currentPrice, position.side, slInputMode]);

    const handleSetTP = async () => {
        const price = parseFloat(takeProfitPrice);

        if (!takeProfitPrice || isNaN(price) || price <= 0) {
            setError('Please enter a valid take profit target');
            return;
        }

        // Validate TP is in the right direction
        if (position.side === 'long' && price <= currentPrice) {
            setError('Take profit must be above current price for long positions');
            return;
        }
        if (position.side === 'short' && price >= currentPrice) {
            setError('Take profit must be below current price for short positions');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const result = await placeTriggerOrder(position.symbol, 'tp', price, position.size);
            setSuccess(result.message);
            setTakeProfitPrice('');
            setTakeProfitPercent('');
            setTimeout(() => {
                setSuccess(null);
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to set take profit');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSetSL = async () => {
        const price = parseFloat(stopLossPrice);

        if (!stopLossPrice || isNaN(price) || price <= 0) {
            setError('Please enter a valid stop loss target');
            return;
        }

        // Validate SL is in the right direction
        if (position.side === 'long' && price >= currentPrice) {
            setError('Stop loss must be below current price for long positions');
            return;
        }
        if (position.side === 'short' && price <= currentPrice) {
            setError('Stop loss must be above current price for short positions');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const result = await placeTriggerOrder(position.symbol, 'sl', price, position.size);
            setSuccess(result.message);
            setStopLossPrice('');
            setStopLossPercent('');
            setTimeout(() => {
                setSuccess(null);
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to set stop loss');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="fixed z-[111] w-full max-w-md rounded-2xl shadow-2xl"
                style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(20, 20, 20, 0.95))',
                    border: '2px solid rgba(255, 255, 0, 0.3)',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 255, 0, 0.2)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-white">Set SL/TP</h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {position.symbol.replace('-USD', '')} • {position.side === 'long' ? 'Long' : 'Short'} • {position.leverage}x
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-bg-elevated rounded-full transition-all"
                    >
                        <X className="w-5 h-5 text-gray-400 hover:text-white" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                    {/* Current Info */}
                    <div className="bg-bg-secondary rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Current Price:</span>
                            <span className="text-white font-mono font-bold">{formatCurrency(currentPrice)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Position Size:</span>
                            <span className="text-white font-mono">{position.size.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Entry Price:</span>
                            <span className="text-white font-mono">{formatCurrency(position.entryPrice)}</span>
                        </div>
                    </div>

                    {/* Take Profit */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Take Profit</h3>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl">
                            <button
                                onClick={() => setTpInputMode('percent')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                    tpInputMode === 'percent'
                                        ? 'bg-green-600 text-white shadow-lg'
                                        : 'bg-transparent text-gray-400 hover:text-white'
                                }`}
                                style={tpInputMode === 'percent' ? { boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)' } : {}}
                            >
                                <Percent className="w-4 h-4" />
                                Percent
                            </button>
                            <button
                                onClick={() => setTpInputMode('price')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                    tpInputMode === 'price'
                                        ? 'bg-green-600 text-white shadow-lg'
                                        : 'bg-transparent text-gray-400 hover:text-white'
                                }`}
                                style={tpInputMode === 'price' ? { boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)' } : {}}
                            >
                                <DollarSign className="w-4 h-4" />
                                Price
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Percentage Input */}
                            {tpInputMode === 'percent' && (
                                <>
                                    <div>
                                        <label className="text-xs text-gray-400 mb-1.5 block">Profit Target %</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={takeProfitPercent}
                                                onChange={(e) => {
                                                    setTakeProfitPercent(e.target.value);
                                                }}
                                                placeholder="e.g. 5"
                                                className="w-full bg-bg-secondary border-2 border-green-500/30 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-green-500/50 transition-all pr-8"
                                                step="0.1"
                                            />
                                            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>

                                    {/* Quick Presets */}
                                    <div className="flex gap-2">
                                        {[1, 2, 5, 10].map((percent) => (
                                            <button
                                                key={percent}
                                                onClick={() => setTakeProfitPercent(percent.toString())}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                                    takeProfitPercent === percent.toString()
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-bg-elevated text-gray-300 hover:bg-bg-hover'
                                                }`}
                                            >
                                                {percent}%
                                            </button>
                                        ))}
                                    </div>

                                    {takeProfitPrice && (
                                        <div className="text-xs text-gray-400 text-center">
                                            Target Price: <span className="text-white font-mono">{formatCurrency(parseFloat(takeProfitPrice))}</span>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Price Input */}
                            {tpInputMode === 'price' && (
                                <>
                                    <div>
                                        <label className="text-xs text-gray-400 mb-1.5 block">Target Price</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={takeProfitPrice}
                                                onChange={(e) => {
                                                    setTakeProfitPrice(e.target.value);
                                                }}
                                                placeholder={formatCurrency(currentPrice * 1.05)}
                                                className="w-full bg-bg-secondary border-2 border-green-500/30 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-green-500/50 transition-all pr-8"
                                                step="0.01"
                                            />
                                            <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>

                                    {takeProfitPercent && (
                                        <div className="text-xs text-gray-400 text-center">
                                            Profit: <span className="text-green-400 font-mono">+{takeProfitPercent}%</span>
                                        </div>
                                    )}
                                </>
                            )}

                            <button
                                onClick={handleSetTP}
                                disabled={isSubmitting || !takeProfitPrice}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                style={{ boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)' }}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Set Take Profit
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Stop Loss */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                                <TrendingDown className="w-4 h-4 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Stop Loss</h3>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl">
                            <button
                                onClick={() => setSlInputMode('percent')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                    slInputMode === 'percent'
                                        ? 'bg-red-600 text-white shadow-lg'
                                        : 'bg-transparent text-gray-400 hover:text-white'
                                }`}
                                style={slInputMode === 'percent' ? { boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' } : {}}
                            >
                                <Percent className="w-4 h-4" />
                                Percent
                            </button>
                            <button
                                onClick={() => setSlInputMode('price')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                    slInputMode === 'price'
                                        ? 'bg-red-600 text-white shadow-lg'
                                        : 'bg-transparent text-gray-400 hover:text-white'
                                }`}
                                style={slInputMode === 'price' ? { boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' } : {}}
                            >
                                <DollarSign className="w-4 h-4" />
                                Price
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Percentage Input */}
                            {slInputMode === 'percent' && (
                                <>
                                    <div>
                                        <label className="text-xs text-gray-400 mb-1.5 block">Stop Loss %</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={stopLossPercent}
                                                onChange={(e) => {
                                                    setStopLossPercent(e.target.value);
                                                }}
                                                placeholder="e.g. 2"
                                                className="w-full bg-bg-secondary border-2 border-red-500/30 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-red-500/50 transition-all pr-8"
                                                step="0.1"
                                            />
                                            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>

                                    {/* Quick Presets */}
                                    <div className="flex gap-2">
                                        {[1, 2, 5, 10].map((percent) => (
                                            <button
                                                key={percent}
                                                onClick={() => setStopLossPercent(percent.toString())}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                                    stopLossPercent === percent.toString()
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-bg-elevated text-gray-300 hover:bg-bg-hover'
                                                }`}
                                            >
                                                {percent}%
                                            </button>
                                        ))}
                                    </div>

                                    {stopLossPrice && (
                                        <div className="text-xs text-gray-400 text-center">
                                            Stop Price: <span className="text-white font-mono">{formatCurrency(parseFloat(stopLossPrice))}</span>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Price Input */}
                            {slInputMode === 'price' && (
                                <>
                                    <div>
                                        <label className="text-xs text-gray-400 mb-1.5 block">Stop Price</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={stopLossPrice}
                                                onChange={(e) => {
                                                    setStopLossPrice(e.target.value);
                                                }}
                                                placeholder={formatCurrency(currentPrice * 0.95)}
                                                className="w-full bg-bg-secondary border-2 border-red-500/30 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-red-500/50 transition-all pr-8"
                                                step="0.01"
                                            />
                                            <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>

                                    {stopLossPercent && (
                                        <div className="text-xs text-gray-400 text-center">
                                            Loss: <span className="text-red-400 font-mono">-{stopLossPercent}%</span>
                                        </div>
                                    )}
                                </>
                            )}

                            <button
                                onClick={handleSetSL}
                                disabled={isSubmitting || !stopLossPrice}
                                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                style={{ boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)' }}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Set Stop Loss
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Error/Success */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-sm text-green-400">
                            ✅ {success}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

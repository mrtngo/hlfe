'use client';

import React, { useState, useMemo } from 'react';
import { usePolymarket } from '@/hooks/usePolymarket';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrivy } from '@privy-io/react-auth';
import type { PolymarketMarket } from '@/types/polymarket';

function safeParseArray(val: any, fallback: any[] = []): any[] {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
    }
    return fallback;
}

interface PolymarketOrderPanelProps {
    market: PolymarketMarket;
    onClose?: () => void;
}

export default function PolymarketOrderPanel({ market, onClose }: PolymarketOrderPanelProps) {
    const { t, formatNumber } = useLanguage();
    const { authenticated, login } = usePrivy();
    const {
        isConnected,
        accountState,
        placeOrder,
        connectPolymarket,
        approveUsdc,
        isOnPolygon,
        switchToPolygon,
        prices,
        loading,
    } = usePolymarket();

    const [selectedOutcome, setSelectedOutcome] = useState<number>(0); // 0 = Yes, 1 = No
    const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
    const [amount, setAmount] = useState('');
    const [limitPrice, setLimitPrice] = useState('');
    const [orderMode, setOrderMode] = useState<'market' | 'limit'>('market');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const outcomes = safeParseArray(market.outcomes, ['Yes', 'No']);
    const outcomePrices = safeParseArray(market.outcomePrices, ['0.5', '0.5']).map((p: any) => parseFloat(p));
    const tokenIds = safeParseArray(market.clobTokenIds);

    const selectedTokenId = tokenIds[selectedOutcome] || '';
    const currentPrice = selectedTokenId && prices[selectedTokenId] !== undefined
        ? prices[selectedTokenId]
        : outcomePrices[selectedOutcome] || 0.5;

    const price = orderMode === 'limit' && limitPrice
        ? parseFloat(limitPrice)
        : currentPrice;

    const amountNum = parseFloat(amount) || 0;
    const shares = price > 0 ? amountNum / price : 0;
    const potentialPayout = shares; // Each share pays $1 if correct
    const potentialProfit = potentialPayout - amountNum;

    const canPlace = amountNum > 0 && price > 0 && price < 1 && isConnected && accountState.usdcApproved;

    const handlePlaceOrder = async () => {
        if (!canPlace || isSubmitting) return;

        setIsSubmitting(true);
        setFeedback(null);

        const result = await placeOrder({
            tokenId: selectedTokenId,
            side,
            price: orderMode === 'limit' ? parseFloat(limitPrice) : currentPrice,
            size: shares,
            orderType: orderMode === 'limit' ? 'GTC' : 'FOK',
        });

        setFeedback({
            type: result.success ? 'success' : 'error',
            message: result.message,
        });

        if (result.success) {
            setAmount('');
            setLimitPrice('');
        }

        setIsSubmitting(false);
    };

    return (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {t.polymarket?.placeOrder || 'Place Order'}
                </h3>
                {onClose && (
                    <button onClick={onClose} className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>✕</button>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Outcome selector */}
                <div className="flex gap-2">
                    {outcomes.map((outcome: string, i: number) => {
                        const isSelected = selectedOutcome === i;
                        const isYes = outcome.toLowerCase() === 'yes' || i === 0;
                        return (
                            <button
                                key={outcome}
                                onClick={() => setSelectedOutcome(i)}
                                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                style={{
                                    backgroundColor: isSelected
                                        ? (isYes ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)')
                                        : 'var(--color-bg-tertiary)',
                                    color: isSelected
                                        ? (isYes ? 'var(--color-positive)' : 'var(--color-negative)')
                                        : 'var(--color-text-secondary)',
                                    border: isSelected
                                        ? `1px solid ${isYes ? 'var(--color-positive)' : 'var(--color-negative)'}`
                                        : '1px solid transparent',
                                }}
                            >
                                {outcome} <span className="font-mono ml-1">{(outcomePrices[i] * 100).toFixed(0)}¢</span>
                            </button>
                        );
                    })}
                </div>

                {/* Buy/Sell toggle */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setSide('BUY')}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                        style={{
                            backgroundColor: side === 'BUY' ? 'rgba(34, 197, 94, 0.2)' : 'var(--color-bg-tertiary)',
                            color: side === 'BUY' ? 'var(--color-positive)' : 'var(--color-text-secondary)',
                            border: side === 'BUY' ? '1px solid var(--color-positive)' : '1px solid transparent',
                        }}
                    >
                        {t.order?.buy || 'Buy'}
                    </button>
                    <button
                        onClick={() => setSide('SELL')}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                        style={{
                            backgroundColor: side === 'SELL' ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-bg-tertiary)',
                            color: side === 'SELL' ? 'var(--color-negative)' : 'var(--color-text-secondary)',
                            border: side === 'SELL' ? '1px solid var(--color-negative)' : '1px solid transparent',
                        }}
                    >
                        {t.order?.sell || 'Sell'}
                    </button>
                </div>

                {/* Order mode */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setOrderMode('market')}
                        className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all"
                        style={{
                            backgroundColor: orderMode === 'market' ? 'var(--color-brand-primary-muted)' : 'var(--color-bg-tertiary)',
                            color: orderMode === 'market' ? 'var(--color-brand-primary)' : 'var(--color-text-tertiary)',
                        }}
                    >
                        {t.order?.market || 'Market'}
                    </button>
                    <button
                        onClick={() => setOrderMode('limit')}
                        className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all"
                        style={{
                            backgroundColor: orderMode === 'limit' ? 'var(--color-brand-primary-muted)' : 'var(--color-bg-tertiary)',
                            color: orderMode === 'limit' ? 'var(--color-brand-primary)' : 'var(--color-text-tertiary)',
                        }}
                    >
                        {t.order?.limit || 'Limit'}
                    </button>
                </div>

                {/* Limit price input */}
                {orderMode === 'limit' && (
                    <div>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-tertiary)' }}>
                            {t.order?.limitPrice || 'Limit Price'} (¢)
                        </label>
                        <input
                            type="number"
                            value={limitPrice}
                            onChange={(e) => setLimitPrice(e.target.value)}
                            placeholder={(currentPrice * 100).toFixed(1)}
                            step="0.1"
                            min="0.1"
                            max="99.9"
                            className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none"
                            style={{
                                backgroundColor: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-primary)',
                                border: '1px solid var(--color-border-default)',
                            }}
                        />
                    </div>
                )}

                {/* Amount input */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                            {t.order?.amount || 'Amount'} (USDC)
                        </label>
                        <span className="text-xs font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
                            {t.order?.balance || 'Balance'}: ${formatNumber(accountState.usdcBalance, 2)}
                        </span>
                    </div>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="1"
                        className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none"
                        style={{
                            backgroundColor: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border-default)',
                        }}
                    />

                    {/* Quick amount buttons */}
                    <div className="flex gap-2 mt-2">
                        {[5, 10, 25, 50].map(v => (
                            <button
                                key={v}
                                onClick={() => setAmount(String(v))}
                                className="flex-1 py-1 rounded text-xs font-mono"
                                style={{
                                    backgroundColor: 'var(--color-bg-tertiary)',
                                    color: 'var(--color-text-secondary)',
                                }}
                            >
                                ${v}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Order summary */}
                {amountNum > 0 && (
                    <div className="space-y-1.5 px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                        <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--color-text-tertiary)' }}>
                                {t.polymarket?.shares || 'Shares'}
                            </span>
                            <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>
                                {shares.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--color-text-tertiary)' }}>
                                {t.polymarket?.avgPrice || 'Avg Price'}
                            </span>
                            <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>
                                {(price * 100).toFixed(1)}¢
                            </span>
                        </div>
                        <div className="flex justify-between text-xs" style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '6px' }}>
                            <span style={{ color: 'var(--color-text-tertiary)' }}>
                                {t.polymarket?.potentialReturn || 'Potential Return'}
                            </span>
                            <span className="font-mono font-semibold" style={{ color: 'var(--color-positive)' }}>
                                +${potentialProfit.toFixed(2)} ({((potentialProfit / amountNum) * 100).toFixed(0)}%)
                            </span>
                        </div>
                    </div>
                )}

                {/* Feedback */}
                {feedback && (
                    <div
                        className="text-xs px-3 py-2 rounded-lg"
                        style={{
                            backgroundColor: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: feedback.type === 'success' ? 'var(--color-positive)' : 'var(--color-negative)',
                        }}
                    >
                        {feedback.message}
                    </div>
                )}

                {/* Action button */}
                {!authenticated ? (
                    <button
                        onClick={login}
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                        style={{
                            backgroundColor: 'var(--color-brand-primary)',
                            color: 'var(--color-text-on-brand)',
                        }}
                    >
                        {t.wallet?.connect || 'Connect Wallet'}
                    </button>
                ) : !isOnPolygon ? (
                    <button
                        onClick={switchToPolygon}
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                        style={{
                            backgroundColor: 'var(--color-brand-primary)',
                            color: 'var(--color-text-on-brand)',
                        }}
                    >
                        {t.polymarket?.switchToPolygon || 'Switch to Polygon'}
                    </button>
                ) : !isConnected ? (
                    <button
                        onClick={connectPolymarket}
                        disabled={loading}
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                        style={{
                            backgroundColor: 'var(--color-brand-primary)',
                            color: 'var(--color-text-on-brand)',
                        }}
                    >
                        {loading ? (t.common?.processing || 'Processing...') : (t.polymarket?.connectPolymarket || 'Connect to Polymarket')}
                    </button>
                ) : !accountState.usdcApproved ? (
                    <button
                        onClick={approveUsdc}
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                        style={{
                            backgroundColor: 'var(--color-brand-primary)',
                            color: 'var(--color-text-on-brand)',
                        }}
                    >
                        {t.polymarket?.approveUsdc || 'Approve USDC'}
                    </button>
                ) : (
                    <button
                        onClick={handlePlaceOrder}
                        disabled={!canPlace || isSubmitting}
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                        style={{
                            backgroundColor: side === 'BUY' ? 'var(--color-positive)' : 'var(--color-negative)',
                            color: '#FFFFFF',
                        }}
                    >
                        {isSubmitting
                            ? (t.common?.processing || 'Processing...')
                            : `${side === 'BUY' ? (t.order?.buy || 'Buy') : (t.order?.sell || 'Sell')} ${outcomes[selectedOutcome]}`
                        }
                    </button>
                )}
            </div>
        </div>
    );
}

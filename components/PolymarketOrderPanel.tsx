'use client';

import React, { useState } from 'react';
import { usePolymarket } from '@/hooks/usePolymarket';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrivy } from '@privy-io/react-auth';
import { Loader2, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
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

    const [selectedOutcome, setSelectedOutcome] = useState<number>(0);
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

    const price = orderMode === 'limit' && limitPrice ? parseFloat(limitPrice) / 100 : currentPrice;
    const amountNum = parseFloat(amount) || 0;
    const shares = price > 0 ? amountNum / price : 0;
    const potentialPayout = shares;
    const potentialProfit = potentialPayout - amountNum;
    const profitPct = amountNum > 0 ? (potentialProfit / amountNum) * 100 : 0;

    const canPlace = amountNum > 0 && price > 0 && price < 1 && isConnected && accountState.usdcApproved;

    const handlePlaceOrder = async () => {
        if (!canPlace || isSubmitting) return;
        setIsSubmitting(true);
        setFeedback(null);
        const result = await placeOrder({
            tokenId: selectedTokenId,
            side,
            price: orderMode === 'limit' ? (parseFloat(limitPrice) / 100) : currentPrice,
            size: shares,
            orderType: orderMode === 'limit' ? 'GTC' : 'FOK',
        });
        setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
        if (result.success) { setAmount(''); setLimitPrice(''); }
        setIsSubmitting(false);
    };

    const isYesSelected = outcomes[selectedOutcome]?.toLowerCase() === 'yes' || selectedOutcome === 0;
    const selectedColor = isYesSelected ? 'var(--color-positive)' : 'var(--color-negative)';
    const selectedBg = isYesSelected ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';

    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)' }}
        >
            {/* Outcome selector */}
            <div className="flex p-3 gap-2" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                {outcomes.map((outcome: string, i: number) => {
                    const isSelected = selectedOutcome === i;
                    const isYes = outcome.toLowerCase() === 'yes' || i === 0;
                    const col = isYes ? 'var(--color-positive)' : 'var(--color-negative)';
                    const bg = isYes ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
                    const pct = Math.round(outcomePrices[i] * 100);

                    return (
                        <button
                            key={outcome}
                            onClick={() => setSelectedOutcome(i)}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-0.5"
                            style={{
                                backgroundColor: isSelected ? bg : 'var(--color-bg-tertiary)',
                                color: isSelected ? col : 'var(--color-text-secondary)',
                                border: `1.5px solid ${isSelected ? col : 'transparent'}`,
                            }}
                        >
                            <span className="text-xs opacity-80">{outcome}</span>
                            <span className="font-mono text-base">{pct}¢</span>
                        </button>
                    );
                })}
            </div>

            <div className="p-4 space-y-3">
                {/* Buy / Sell toggle */}
                <div
                    className="flex rounded-xl p-1 gap-1"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                >
                    {(['BUY', 'SELL'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setSide(s)}
                            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                            style={{
                                backgroundColor: side === s
                                    ? (s === 'BUY' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)')
                                    : 'transparent',
                                color: side === s
                                    ? (s === 'BUY' ? 'var(--color-positive)' : 'var(--color-negative)')
                                    : 'var(--color-text-tertiary)',
                            }}
                        >
                            {s === 'BUY' ? (t.order?.buy || 'Buy') : (t.order?.sell || 'Sell')}
                        </button>
                    ))}
                </div>

                {/* Market / Limit */}
                <div className="flex gap-1.5">
                    {(['market', 'limit'] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => setOrderMode(m)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                            style={{
                                backgroundColor: orderMode === m ? 'var(--color-brand-primary-muted)' : 'transparent',
                                color: orderMode === m ? 'var(--color-brand-primary)' : 'var(--color-text-tertiary)',
                                border: `1px solid ${orderMode === m ? 'var(--color-brand-primary)' : 'transparent'}`,
                            }}
                        >
                            {m === 'market' ? (t.order?.market || 'Market') : (t.order?.limit || 'Limit')}
                        </button>
                    ))}
                </div>

                {/* Limit price */}
                {orderMode === 'limit' && (
                    <div>
                        <label className="text-xs mb-1.5 block" style={{ color: 'var(--color-text-tertiary)' }}>
                            {t.order?.limitPrice || 'Limit Price'} (¢)
                        </label>
                        <input
                            type="number"
                            value={limitPrice}
                            onChange={e => setLimitPrice(e.target.value)}
                            placeholder={`${(currentPrice * 100).toFixed(1)}`}
                            step="0.1" min="0.1" max="99.9"
                            className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none"
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
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                            {t.order?.amount || 'Amount'} (USDC)
                        </label>
                        <span
                            className="text-xs font-mono cursor-pointer"
                            style={{ color: 'var(--color-brand-primary)' }}
                            onClick={() => setAmount(accountState.usdcBalance.toFixed(2))}
                        >
                            Max: ${formatNumber(accountState.usdcBalance, 2)}
                        </span>
                    </div>
                    <div
                        className="flex items-center rounded-xl overflow-hidden"
                        style={{ border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-tertiary)' }}
                    >
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            min="1"
                            className="flex-1 px-4 py-3 text-sm font-mono outline-none bg-transparent"
                            style={{ color: 'var(--color-text-primary)' }}
                        />
                        <span className="pr-4 text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>USDC</span>
                    </div>

                    {/* Quick amounts */}
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                        {[5, 10, 25, 50].map(v => (
                            <button
                                key={v}
                                onClick={() => setAmount(String(v))}
                                className="py-1.5 rounded-lg text-xs font-mono font-semibold transition-all"
                                style={{
                                    backgroundColor: amount === String(v) ? 'var(--color-brand-primary-muted)' : 'var(--color-bg-elevated)',
                                    color: amount === String(v) ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                                    border: `1px solid ${amount === String(v) ? 'var(--color-brand-primary)' : 'var(--color-border-subtle)'}`,
                                }}
                            >
                                ${v}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Order summary */}
                {amountNum > 0 && (
                    <div
                        className="rounded-xl p-3 space-y-2"
                        style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)' }}
                    >
                        <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--color-text-tertiary)' }}>Shares</span>
                            <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>{shares.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--color-text-tertiary)' }}>Avg Price</span>
                            <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>{(price * 100).toFixed(1)}¢</span>
                        </div>
                        <div
                            className="flex justify-between text-xs pt-2"
                            style={{ borderTop: '1px solid var(--color-border-subtle)' }}
                        >
                            <span className="flex items-center gap-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                <TrendingUp className="w-3 h-3" />
                                {t.polymarket?.potentialReturn || 'If correct'}
                            </span>
                            <span className="font-mono font-bold" style={{ color: 'var(--color-positive)' }}>
                                +${potentialProfit.toFixed(2)}
                                <span className="opacity-70 text-[10px] ml-1">({profitPct.toFixed(0)}%)</span>
                            </span>
                        </div>
                    </div>
                )}

                {/* Feedback */}
                {feedback && (
                    <div
                        className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl"
                        style={{
                            backgroundColor: feedback.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            color: feedback.type === 'success' ? 'var(--color-positive)' : 'var(--color-negative)',
                        }}
                    >
                        {feedback.type === 'success'
                            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            : <XCircle className="w-4 h-4 flex-shrink-0" />
                        }
                        {feedback.message}
                    </div>
                )}

                {/* CTA */}
                {!authenticated ? (
                    <button
                        onClick={login}
                        className="w-full py-3.5 rounded-xl text-sm font-bold transition-all"
                        style={{ backgroundColor: 'var(--color-brand-primary)', color: 'var(--color-text-on-brand)' }}
                    >
                        {t.wallet?.connect || 'Connect Wallet'}
                    </button>
                ) : !isOnPolygon ? (
                    <button
                        onClick={switchToPolygon}
                        className="w-full py-3.5 rounded-xl text-sm font-bold transition-all"
                        style={{ backgroundColor: 'var(--color-brand-primary)', color: 'var(--color-text-on-brand)' }}
                    >
                        {t.polymarket?.switchToPolygon || 'Switch to Polygon'}
                    </button>
                ) : !isConnected ? (
                    <button
                        onClick={connectPolymarket}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ backgroundColor: 'var(--color-brand-primary)', color: 'var(--color-text-on-brand)' }}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? (t.common?.processing || 'Processing...') : (t.polymarket?.connectPolymarket || 'Connect to Polymarket')}
                    </button>
                ) : !accountState.usdcApproved ? (
                    <button
                        onClick={approveUsdc}
                        className="w-full py-3.5 rounded-xl text-sm font-bold transition-all"
                        style={{ backgroundColor: 'var(--color-brand-primary)', color: 'var(--color-text-on-brand)' }}
                    >
                        {t.polymarket?.approveUsdc || 'Approve USDC'}
                    </button>
                ) : (
                    <button
                        onClick={handlePlaceOrder}
                        disabled={!canPlace || isSubmitting}
                        className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{
                            backgroundColor: canPlace
                                ? (side === 'BUY' ? 'var(--color-positive)' : 'var(--color-negative)')
                                : 'var(--color-bg-hover)',
                            color: canPlace ? '#fff' : 'var(--color-text-tertiary)',
                        }}
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSubmitting
                            ? (t.common?.processing || 'Processing...')
                            : `${side === 'BUY' ? 'Buy' : 'Sell'} ${outcomes[selectedOutcome]}`
                        }
                    </button>
                )}
            </div>
        </div>
    );
}

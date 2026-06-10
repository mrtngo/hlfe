'use client';

// Compact bottom sheet for closing a position — slider for the amount
// (default 100%) + one confirm tap. Places a reduce-only market order;
// no detour through the trade screen.

import { useEffect, useState } from 'react';
import type { Position } from '@/types/hyperliquid';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { MIN_NOTIONAL_VALUE } from '@/lib/constants';
import { SliderRow, SlideToConfirm, V2 } from '@/components/V2Kit';
import TradeSuccessSheet from '@/components/TradeSuccessSheet';
import { haptic } from '@/lib/haptics';

interface ClosePositionSheetProps {
    open: boolean;
    onClose: () => void;
    position: Position;
    ticker: string;
    formatCurrency: (v: number, dp?: number) => string;
}

export default function ClosePositionSheet({
    open,
    onClose,
    position,
    ticker,
    formatCurrency,
}: ClosePositionSheetProps) {
    const { placeOrder, refreshAccountData, account } = useHyperliquid();

    const [pct, setPct] = useState(100);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    // Snapshot of the close at confirm time — the position refreshes under us.
    const [filled, setFilled] = useState({ token: 0, usd: 0, price: 0, side: 'sell' as 'buy' | 'sell' });

    // Fresh state every time the sheet opens.
    useEffect(() => {
        if (open) {
            setPct(100);
            setSubmitting(false);
            setError('');
            setDone(false);
        }
    }, [open]);

    if (!open) return null;

    const price = position.markPrice || position.entryPrice || 0;
    const closeSize = position.size * (pct / 100);
    const closeNotional = closeSize * price;
    const realizedPnl = position.unrealizedPnl * (pct / 100);
    const pnlUp = realizedPnl >= 0;

    // HL exempts full closes from the $10 minimum, but partial closes are
    // normal orders — block partials that would be rejected.
    const partialTooSmall = pct < 100 && closeNotional < MIN_NOTIONAL_VALUE;
    const canSubmit = !submitting && closeSize > 0 && !partialTooSmall;

    const handleConfirm = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setError('');
        const closeSide: 'buy' | 'sell' = position.side === 'long' ? 'sell' : 'buy';
        try {
            // Reduce-only market order on the opposite side. 100% sends the
            // exact position size so the close is full (and min-exempt).
            const result = await placeOrder(
                position.symbol,
                closeSide,
                'market',
                pct >= 100 ? position.size : closeSize,
                undefined,
                position.leverage,
                true,
            );
            if (result && result.filled === false) {
                haptic.error();
                setError(result.error || 'No se pudo cerrar la posición');
            } else {
                setFilled({ token: closeSize, usd: closeNotional, price, side: closeSide });
                setDone(true);
                setTimeout(() => refreshAccountData(), 500);
            }
        } catch (e) {
            haptic.error();
            setError(e instanceof Error ? e.message : 'No se pudo cerrar la posición');
        } finally {
            setSubmitting(false);
        }
    };

    // Same celebration as opening a position — full-screen bolt burst.
    if (done) {
        return (
            <TradeSuccessSheet
                open
                onClose={onClose}
                side={filled.side}
                symbol={position.symbol}
                ticker={ticker}
                tokenAmount={filled.token}
                usdAmount={filled.usd}
                avgPrice={filled.price}
                newBalance={account?.equity}
                formatCurrency={formatCurrency}
                resting={false}
            />
        );
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, fontFamily: V2.ui, color: V2.t1 }}>
            {/* Backdrop */}
            <div
                onClick={() => { if (!submitting) onClose(); }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            />

            {/* Sheet */}
            <div
                style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    maxWidth: 480, margin: '0 auto',
                    background: V2.cardSolid, border: `1px solid ${V2.hair}`, borderBottom: 'none',
                    borderTopLeftRadius: 26, borderTopRightRadius: 26,
                    padding: '14px 20px calc(24px + env(safe-area-inset-bottom))',
                    boxShadow: '0 -20px 50px -16px rgba(0,0,0,0.8)',
                }}
            >
                <div style={{ width: 42, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.16)', margin: '0 auto 18px' }} />

                <>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Cerrar posición</div>
                            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.04em', background: position.side === 'long' ? V2.posSoft : V2.negSoft, color: position.side === 'long' ? V2.pos : V2.neg }}>
                                {position.side === 'long' ? 'LONG' : 'SHORT'} {position.leverage}x · {ticker}
                            </span>
                        </div>

                        {/* PnL */}
                        <div style={{ marginTop: 18, textAlign: 'center' }}>
                            <div style={{ fontSize: 13, color: V2.t3, fontWeight: 600 }}>Resultado a cobrar</div>
                            <div style={{ marginTop: 4, fontSize: 34, fontWeight: 800, fontFamily: V2.mono, letterSpacing: '-0.02em', color: pnlUp ? V2.pos : V2.neg }}>
                                {pnlUp ? '+' : '-'}{formatCurrency(Math.abs(realizedPnl))}
                            </div>
                        </div>

                        {/* Amount slider */}
                        <div style={{ marginTop: 22 }}>
                            <SliderRow
                                label="Cantidad"
                                valueText={`${pct}%`}
                                pct={pct}
                                color={V2.neg}
                                min={1}
                                max={100}
                                step={1}
                                value={pct}
                                onChange={(v: number) => setPct(Math.round(v))}
                            />
                            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                                {[25, 50, 75, 100].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => { haptic.light(); setPct(p); }}
                                        style={{
                                            flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer', fontFamily: V2.ui,
                                            fontSize: 13, fontWeight: 700,
                                            border: pct === p ? `1.5px solid ${V2.neg}` : `1px solid ${V2.hair}`,
                                            background: pct === p ? V2.negSoft : 'transparent',
                                            color: pct === p ? V2.neg : V2.t2,
                                        }}
                                    >
                                        {p === 100 ? 'Todo' : `${p}%`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div style={{ marginTop: 18, padding: '14px 0', borderTop: `1px solid ${V2.hair}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 13.5, color: V2.t3, fontWeight: 600 }}>Vas a cerrar</span>
                                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: V2.mono }}>
                                    {closeSize.toLocaleString('en-US', { maximumFractionDigits: 5 })} {ticker} · {formatCurrency(closeNotional)}
                                </span>
                            </div>
                        </div>

                        {partialTooSmall && (
                            <div style={{ marginBottom: 12, fontSize: 12.5, color: V2.neg, fontWeight: 600, textAlign: 'center' }}>
                                Un cierre parcial necesita un mínimo de {formatCurrency(MIN_NOTIONAL_VALUE, 0)} — subí el porcentaje o cerrá todo.
                            </div>
                        )}

                        {error && (
                            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: V2.negSoft, border: '1px solid rgba(239,68,68,0.2)', color: V2.neg, fontSize: 12.5, fontWeight: 600, textAlign: 'center' }}>
                                {error}
                            </div>
                        )}

                        {/* Slide to confirm — same gesture as opening a position */}
                        <SlideToConfirm
                            color={V2.neg}
                            soft={V2.negSoft}
                            border="rgba(239,68,68,0.25)"
                            disabled={!canSubmit}
                            label={
                                submitting
                                    ? 'Cerrando…'
                                    : partialTooSmall
                                      ? `Mín. ${formatCurrency(MIN_NOTIONAL_VALUE, 0)} para cierre parcial`
                                      : pct >= 100
                                        ? 'Deslizá para cerrar todo'
                                        : `Deslizá para cerrar ${pct}%`
                            }
                            onConfirm={handleConfirm}
                        />
                        <button
                            onClick={() => { if (!submitting) onClose(); }}
                            style={{ ...ctaBtn, marginTop: 10, background: 'transparent', border: `1px solid ${V2.hair2}`, color: V2.t2 }}
                        >
                            Cancelar
                        </button>
                </>
            </div>
        </div>
    );
}

const ctaBtn: React.CSSProperties = {
    width: '100%', padding: 15, borderRadius: 16, border: 'none',
    fontWeight: 800, fontSize: 15.5, fontFamily: 'inherit', cursor: 'pointer',
};

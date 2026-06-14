'use client';

import { ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import TokenLogo from '@/components/TokenLogo';
import { ModalSheet, ModalHeader, ModalSticky } from '@/components/ModalSheet';

interface TradeConfirmSheetProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    submitting?: boolean;
    side: 'buy' | 'sell';
    symbol: string;
    ticker?: string;
    price: number;
    usdAmount: number;
    tokenAmount: number;
    leverage?: number;
    fee?: number;
    liqPrice?: number;
    /** 'market' (default) or 'limit' — adjusts the price label and fine print */
    orderType?: 'market' | 'limit';
    /** "Spot" | "Perp" | etc — shown as eyebrow */
    venueLabel?: string;
    /** Error message to display in the confirm sheet (e.g. from a failed submit) */
    error?: string;
}

export default function TradeConfirmSheet({
    open,
    onClose,
    onConfirm,
    submitting = false,
    side,
    symbol,
    ticker,
    price,
    usdAmount,
    tokenAmount,
    leverage,
    fee,
    liqPrice,
    orderType = 'market',
    venueLabel,
    error,
}: TradeConfirmSheetProps) {
    const isBuy = side === 'buy';
    const sideColor = isBuy ? '#22C55E' : '#EF4444';
    const sideLabel = isBuy ? 'Comprar' : 'Vender';
    const sideLabelLoud = isBuy ? 'COMPRA' : 'VENTA';
    const shownTicker = (ticker || symbol).replace(/-USD$/, '').replace(/-PERP$/, '');

    return (
        <ModalSheet open={open} onClose={onClose} dismissable={!submitting}>
            <ModalHeader
                sub={venueLabel ? `${sideLabelLoud} · ${venueLabel}` : sideLabelLoud}
                title="Revisá la orden."
                onClose={submitting ? undefined : onClose}
            />

            {/* Hero — what you're trading */}
            <div style={{ padding: '0 18px' }}>
                <div
                    style={{
                        padding: '20px 16px',
                        textAlign: 'center',
                        background:
                            'linear-gradient(165deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                        borderRadius: 18,
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <div
                        style={{
                            fontSize: 10,
                            color: 'rgba(255,255,255,0.5)',
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            marginBottom: 12,
                        }}
                    >
                        {isBuy ? 'Vas a recibir' : 'Vas a vender'}
                    </div>
                    <TokenLogo symbol={symbol} size={48} />
                    <div
                        className="font-display tabular-mono"
                        style={{
                            marginTop: 12,
                            fontSize: 32,
                            lineHeight: 1,
                            fontWeight: 500,
                            fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 500',
                            letterSpacing: '-0.03em',
                        }}
                    >
                        {tokenAmount > 0 ? tokenAmount.toFixed(6) : '0'}
                    </div>
                    <div
                        style={{
                            fontSize: 11,
                            color: 'var(--color-text-tertiary)',
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            marginTop: 6,
                        }}
                    >
                        {shownTicker}
                    </div>
                </div>
            </div>

            {/* Line items */}
            <div style={{ padding: '16px 18px 0' }}>
                <Line
                    label={isBuy ? 'Pagás' : 'Recibís'}
                    value={`$${usdAmount.toFixed(2)}`}
                />
                <Line
                    label={orderType === 'limit' ? 'Precio límite' : `Precio ${shownTicker}`}
                    value={`$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                />
                {leverage !== undefined && leverage > 1 && (
                    <Line
                        label="Apalancamiento"
                        value={`${leverage}×`}
                        valueColor="var(--color-brand-primary)"
                    />
                )}
                {fee !== undefined && (
                    <Line
                        label="Comisión estimada"
                        value={fee > 0 ? `$${fee.toFixed(2)}` : '$0'}
                        valueColor={fee > 0 ? '#fff' : 'var(--color-positive)'}
                    />
                )}
                {liqPrice !== undefined && liqPrice > 0 && (
                    <Line
                        label="Precio liquidación"
                        value={`$${liqPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                        valueColor="var(--color-negative)"
                    />
                )}
            </div>

            {/* Fine print */}
            <div
                style={{
                    margin: '14px 18px 0',
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    lineHeight: 1.5,
                    textAlign: 'center',
                }}
            >
                {orderType === 'limit'
                    ? 'Tu orden límite queda activa hasta ejecutarse a tu precio.'
                    : 'Orden al mejor precio disponible. Puede haber un pequeño deslizamiento.'}
            </div>

            {/* Risk disclosure — required for leveraged products. Shown whenever
                the position uses leverage, so the user sees it before every
                leveraged trade, not buried in T&Cs. */}
            {leverage !== undefined && leverage > 1 && (
                <div
                    style={{
                        margin: '10px 18px 0',
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(239,68,68,0.06)',
                        border: '1px solid rgba(239,68,68,0.18)',
                        fontSize: 11,
                        lineHeight: 1.5,
                        color: 'rgba(255,255,255,0.65)',
                        textAlign: 'center',
                    }}
                >
                    Producto apalancado de alto riesgo. Con {leverage}× una variación
                    de precio en tu contra puede liquidar tu posición y perder el monto
                    invertido. Opera solo con dinero que puedas permitirte perder.
                </div>
            )}

            {error && (
                <div
                    style={{
                        margin: '14px 18px 0',
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        color: 'var(--color-negative)',
                        fontSize: 12,
                        fontWeight: 600,
                    }}
                >
                    {error}
                </div>
            )}

            <ModalSticky>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        style={{
                            flex: 1,
                            padding: '16px',
                            borderRadius: 14,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.5 : 1,
                            fontFamily: 'inherit',
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={submitting}
                        style={{
                            flex: 2,
                            padding: '16px',
                            borderRadius: 14,
                            border: 'none',
                            background: submitting
                                ? 'rgba(255,255,255,0.06)'
                                : `linear-gradient(180deg, ${sideColor}EE 0%, ${sideColor} 100%)`,
                            color: submitting ? 'rgba(255,255,255,0.5)' : '#fff',
                            fontWeight: 800,
                            fontSize: 14,
                            cursor: submitting ? 'wait' : 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 8,
                            fontFamily: 'inherit',
                            boxShadow: submitting
                                ? 'none'
                                : `0 1px 0 rgba(255,255,255,0.25) inset, 0 14px 32px -10px ${sideColor}99`,
                        }}
                    >
                        {submitting ? (
                            <>
                                <Loader2
                                    className="animate-spin"
                                    style={{ width: 16, height: 16 }}
                                />
                                Procesando…
                            </>
                        ) : (
                            <>
                                {isBuy ? (
                                    <ArrowUpRight size={15} strokeWidth={2.6} />
                                ) : (
                                    <ArrowDownLeft size={15} strokeWidth={2.6} />
                                )}
                                Confirmar {sideLabel.toLowerCase()}
                            </>
                        )}
                    </button>
                </div>
            </ModalSticky>
        </ModalSheet>
    );
}

function Line({
    label,
    value,
    valueColor,
}: {
    label: string;
    value: string;
    valueColor?: string;
}) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
            <span
                className="tabular-mono"
                style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: valueColor || '#fff',
                }}
            >
                {value}
            </span>
        </div>
    );
}

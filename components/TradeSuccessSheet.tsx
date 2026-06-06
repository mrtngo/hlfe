'use client';

import { Check } from 'lucide-react';
import TokenLogo from '@/components/TokenLogo';
import { ModalSheet, ModalSticky } from '@/components/ModalSheet';

interface TradeSuccessSheetProps {
    open: boolean;
    onClose: () => void;
    side: 'buy' | 'sell';
    symbol: string;
    ticker?: string;
    /** Token amount filled */
    tokenAmount: number;
    /** USD value of the fill */
    usdAmount: number;
    /** Average fill price (optional) */
    avgPrice?: number;
    /** New account equity / balance to surface (optional) */
    newBalance?: number;
    /** Currency formatter for newBalance (optional, falls back to USD) */
    formatCurrency?: (v: number, dp?: number) => string;
    /** Order is a resting (unfilled) limit order rather than an immediate fill */
    resting?: boolean;
    /** CTA label override (default: "Listo") */
    ctaLabel?: string;
}

export default function TradeSuccessSheet({
    open,
    onClose,
    side,
    symbol,
    ticker,
    tokenAmount,
    usdAmount,
    avgPrice,
    newBalance,
    formatCurrency,
    resting,
    ctaLabel,
}: TradeSuccessSheetProps) {
    const isBuy = side === 'buy';
    const shownTicker = (ticker || symbol).replace(/-USD$/, '').replace(/-PERP$/, '');
    const verb = isBuy ? 'Compraste' : 'Vendiste';
    const headline = resting ? '¡Orden colocada!' : `¡${verb}!`;

    return (
        <ModalSheet open={open} onClose={onClose}>
            <div style={{ padding: '24px 18px 6px', textAlign: 'center' }}>
                {/* Success orb */}
                <div
                    style={{
                        width: 88,
                        height: 88,
                        margin: '0 auto 22px',
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle at 30% 30%, rgba(34,197,94,0.35), rgba(34,197,94,0.06))',
                        border: '1px solid rgba(34,197,94,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 40px -8px rgba(34,197,94,0.5)',
                    }}
                >
                    <Check size={40} strokeWidth={2.6} color="var(--color-positive)" />
                </div>

                {/* Big italic headline */}
                <div
                    className="font-display"
                    style={{
                        fontSize: 36,
                        fontStyle: 'italic',
                        fontWeight: 500,
                        fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 500',
                        color: 'var(--color-brand-primary)',
                        letterSpacing: '-0.03em',
                        lineHeight: 1.05,
                    }}
                >
                    {headline}
                </div>
                <div
                    className="tabular-mono"
                    style={{
                        marginTop: 10,
                        fontSize: 14,
                        color: '#fff',
                        fontWeight: 600,
                    }}
                >
                    {tokenAmount.toFixed(6)} {shownTicker} · ${usdAmount.toFixed(2)}
                </div>
            </div>

            {/* Card with details */}
            <div style={{ padding: '20px 18px 0' }}>
                <div
                    style={{
                        padding: 18,
                        borderRadius: 16,
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <Row
                        label="Activo"
                        value={
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <TokenLogo symbol={symbol} size={18} />
                                <span
                                    className="tabular-mono"
                                    style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}
                                >
                                    {shownTicker}
                                </span>
                            </span>
                        }
                    />
                    <Row
                        label="Cantidad"
                        value={
                            <span
                                className="tabular-mono"
                                style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}
                            >
                                {tokenAmount.toFixed(6)} {shownTicker}
                            </span>
                        }
                    />
                    {avgPrice !== undefined && avgPrice > 0 && (
                        <Row
                            label="Precio promedio"
                            value={
                                <span
                                    className="tabular-mono"
                                    style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}
                                >
                                    $
                                    {avgPrice.toLocaleString('en-US', {
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            }
                        />
                    )}
                    <Row
                        label={isBuy ? 'Total pagado' : 'Total recibido'}
                        value={
                            <span
                                className="tabular-mono"
                                style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}
                            >
                                ${usdAmount.toFixed(2)}
                            </span>
                        }
                        last
                    />
                </div>

                {newBalance !== undefined && (
                    <div
                        style={{
                            marginTop: 12,
                            padding: 18,
                            borderRadius: 16,
                            background: 'rgba(250,204,21,0.05)',
                            border: '1px solid rgba(250,204,21,0.15)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.55)',
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                marginBottom: 6,
                            }}
                        >
                            Nuevo balance
                        </div>
                        <div
                            className="font-display tabular-mono"
                            style={{
                                fontSize: 26,
                                fontWeight: 500,
                                fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 500',
                                letterSpacing: '-0.03em',
                            }}
                        >
                            {formatCurrency
                                ? formatCurrency(newBalance, 2)
                                : `$${newBalance.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                  })}`}
                        </div>
                    </div>
                )}
            </div>

            <ModalSticky>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: 16,
                        borderRadius: 14,
                        background:
                            'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                        border: 'none',
                        color: '#1A1304',
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    {ctaLabel || 'Listo'}
                </button>
            </ModalSticky>
        </ModalSheet>
    );
}

function Row({
    label,
    value,
    last,
}: {
    label: string;
    value: React.ReactNode;
    last?: boolean;
}) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
            }}
        >
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
            {value}
        </div>
    );
}

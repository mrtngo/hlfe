'use client';

import { useEffect } from 'react';
import { MarketLogo, Icon, V2 } from '@/components/V2Kit';
import { haptic } from '@/lib/haptics';

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

// Scattered bolts: { left%, top%, size, delay, rot }
const BOLTS = [
    { l: 8, t: 16, s: 26, d: 0.0, r: -18 },
    { l: 78, t: 12, s: 34, d: 0.5, r: 14 },
    { l: 16, t: 40, s: 20, d: 0.9, r: -8 },
    { l: 86, t: 44, s: 24, d: 0.3, r: 20 },
    { l: 6, t: 66, s: 30, d: 0.7, r: 10 },
    { l: 82, t: 70, s: 22, d: 1.1, r: -16 },
    { l: 34, t: 78, s: 18, d: 0.4, r: 8 },
    { l: 62, t: 82, s: 28, d: 0.8, r: -12 },
];

function Bolt({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={V2.accent} stroke={V2.accent} />
        </svg>
    );
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
    // Celebratory buzz the moment the success sheet appears.
    useEffect(() => {
        if (open) haptic.success();
    }, [open]);

    if (!open) return null;

    const isBuy = side === 'buy';
    const shownTicker = (ticker || symbol).replace(/-USD$/, '').replace(/-PERP$/, '');
    const verb = isBuy ? 'Compraste' : 'Vendiste';
    const eyebrow = resting ? '¡Orden colocada!' : '¡Operación realizada!';
    const [intPart, decPart] = usdAmount.toFixed(2).split('.');
    const fmt = (v: number) => (formatCurrency ? formatCurrency(v, 2) : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: V2.bg, fontFamily: V2.ui, color: V2.t1, overflow: 'hidden' }}>
            {/* central yellow burst */}
            <div
                className="v2-burst"
                aria-hidden
                style={{
                    position: 'absolute', top: 300, left: '50%', width: 460, height: 460,
                    transform: 'translate(-50%,-50%)',
                    background: 'radial-gradient(circle, rgba(250,204,21,0.22) 0%, rgba(250,204,21,0.06) 38%, transparent 66%)',
                    animation: 'v2-burst 700ms ease-out both', pointerEvents: 'none',
                }}
            />

            {/* scattered bolts */}
            {BOLTS.map((b, i) => (
                <div
                    key={i}
                    className="v2-bolt"
                    style={{
                        position: 'absolute', left: `${b.l}%`, top: `${b.t}%`,
                        ['--r' as string]: `${b.r}deg`,
                        animation: `v2-boltflash 1700ms ease-out ${b.d}s infinite`,
                        pointerEvents: 'none', filter: 'drop-shadow(0 0 10px rgba(250,204,21,0.6))',
                    } as React.CSSProperties}
                >
                    <Bolt size={b.s} />
                </div>
            ))}

            {/* content */}
            <div style={{ position: 'relative', minHeight: '76vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
                <div className="v2-rise">
                    <div style={{ fontSize: 18, fontWeight: 700, color: V2.accent, letterSpacing: '0.01em' }}>{eyebrow}</div>
                    <div style={{ marginTop: 18, fontSize: 84, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.9, fontFamily: V2.ui }}>
                        <span style={{ fontSize: 36, verticalAlign: 'top', color: V2.t2 }}>$</span>
                        {Number(intPart).toLocaleString('en-US')}
                        <span style={{ color: V2.t3 }}>.{decPart}</span>
                    </div>
                    <div style={{ marginTop: 22, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: `1px solid ${V2.hair}` }}>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{shownTicker}</span>
                        <MarketLogo sym={symbol} size={20} />
                        <Icon name={isBuy ? 'arrowUpRight' : 'arrowDownLeft'} size={15} color={isBuy ? V2.pos : V2.neg} strokeWidth={2.6} />
                    </div>
                </div>
            </div>

            {/* bottom: trade summary + CTA */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 20px calc(26px + env(safe-area-inset-bottom))' }}>
                <div className="v2-rise d2" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, background: V2.card, border: `1px solid ${V2.hair}`, marginBottom: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: V2.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="bolt" size={20} color={V2.accent} />
                    </div>
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>
                            {verb} {tokenAmount.toLocaleString('en-US', { maximumFractionDigits: 6 })} {shownTicker}
                        </div>
                        <div style={{ fontSize: 13, color: V2.t3, marginTop: 2, lineHeight: 1.35, fontFamily: V2.mono }}>
                            {avgPrice && avgPrice > 0 ? `Prom. $${avgPrice.toLocaleString('en-US', { maximumFractionDigits: avgPrice < 1 ? 4 : 2 })}` : `${fmt(usdAmount)}`}
                            {newBalance !== undefined ? ` · Saldo ${fmt(newBalance)}` : ''}
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="v2-rise d3"
                    style={{
                        width: '100%', padding: 18, borderRadius: 18, border: 'none', cursor: 'pointer', fontFamily: V2.ui,
                        background: V2.accent, color: V2.accentInk, fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 14px 32px -8px rgba(250,204,21,0.5)',
                    }}
                >
                    {ctaLabel || 'Listo'}
                </button>
            </div>
        </div>
    );
}

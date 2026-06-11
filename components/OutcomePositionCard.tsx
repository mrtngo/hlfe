'use client';

/**
 * OutcomePositionCard — a held HIP-4 outcome position, with manage actions.
 *
 * Shows the event/side, contracts, current market value and implied %, plus:
 *  - "Agregar" / tap → onManage (open the buy sheet for this outcome)
 *  - "Cerrar"  → sells the full position at market (two-tap confirm)
 *
 * Close is self-contained (placeOutcomeOrder side:'sell') so the card can be
 * dropped into both the predictions screen and the portfolio.
 */

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { V2 } from '@/components/V2Kit';
import { haptic } from '@/lib/haptics';
import type { OutcomePosition } from '@/hooks/useOutcomePositions';

const SIDE = {
    0: { color: V2.pos, soft: V2.posSoft, border: 'rgba(34,197,94,0.3)' },
    1: { color: V2.neg, soft: V2.negSoft, border: 'rgba(239,68,68,0.3)' },
} as const;

export default function OutcomePositionCard({
    position,
    onManage,
}: {
    position: OutcomePosition;
    /** Open the trade sheet for this outcome (see / add more). */
    onManage?: (p: OutcomePosition) => void;
}) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { placeOutcomeOrder } = useHyperliquid();
    const [confirming, setConfirming] = useState(false);
    const [closing, setClosing] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const palette = SIDE[position.sideIdx as 0 | 1] || SIDE[0];

    const close = async () => {
        haptic.medium();
        setClosing(true);
        setErr(null);
        const res = await placeOutcomeOrder({
            outcomeId: position.outcomeId,
            sideIdx: position.sideIdx,
            side: 'sell',
            type: 'market',
            size: position.contracts,
            marketSlippagePct: 0.05,
        });
        setClosing(false);
        if (!res.filled) {
            setErr(res.error || t.outcomeMarkets.errClose);
        } else {
            setConfirming(false);
        }
        // Provider polling refreshes spotBalances → the card drops out.
    };

    return (
        <div
            className="v2-card"
            style={{ padding: '14px 16px', fontFamily: V2.ui, color: V2.t1 }}
        >
            <button
                type="button"
                onClick={() => onManage?.(position)}
                style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: onManage ? 'pointer' : 'default', color: 'inherit', fontFamily: V2.ui }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: V2.t3, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {position.eventName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                            <span style={{ fontSize: 15.5, fontWeight: 800 }}>{position.marketName}</span>
                            <span
                                style={{
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: 6,
                                    background: palette.soft,
                                    border: `1px solid ${palette.border}`,
                                    color: palette.color,
                                }}
                            >
                                {position.sideName} {(position.mid * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div className="font-mono" style={{ fontSize: 17, fontWeight: 800 }}>
                            {formatCurrency(position.value, 2)}
                        </div>
                        <div className="font-mono" style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: position.pnl >= 0 ? V2.pos : V2.neg }}>
                            {position.pnl >= 0 ? '+' : '-'}{formatCurrency(Math.abs(position.pnl), 2)}
                        </div>
                    </div>
                </div>

                {/* Invested / contracts */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11.5 }}>
                    <span style={{ color: V2.t3 }}>
                        {t.outcomeMarkets.invested}{' '}
                        <span className="font-mono" style={{ color: V2.t2, fontWeight: 700 }}>{formatCurrency(position.cost, 2)}</span>
                    </span>
                    <span className="font-mono" style={{ color: V2.t3 }}>
                        {position.contracts.toFixed(0)} {t.outcomeMarkets.contracts}
                    </span>
                </div>
            </button>

            {err && <div style={{ fontSize: 11.5, color: V2.neg, marginTop: 10 }}>{err}</div>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${V2.hair}` }}>
                {onManage && (
                    <button
                        type="button"
                        onClick={() => {
                            haptic.light();
                            onManage(position);
                        }}
                        style={{
                            flex: 1,
                            padding: '9px 0',
                            borderRadius: 10,
                            border: `1px solid ${V2.hair2}`,
                            background: 'rgba(255,255,255,0.04)',
                            color: V2.t1,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                            fontFamily: V2.ui,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                        }}
                    >
                        <Plus style={{ width: 14, height: 14 }} />
                        {t.outcomeMarkets.addMore}
                    </button>
                )}
                {confirming ? (
                    <button
                        type="button"
                        onClick={close}
                        disabled={closing}
                        style={{
                            flex: 1,
                            padding: '9px 0',
                            borderRadius: 10,
                            border: 'none',
                            background: V2.neg,
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: 13,
                            cursor: closing ? 'wait' : 'pointer',
                            fontFamily: V2.ui,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        {closing ? (
                            <>
                                <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                                {t.outcomeMarkets.closing}
                            </>
                        ) : (
                            t.outcomeMarkets.confirmClose
                        )}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => {
                            haptic.light();
                            setConfirming(true);
                            setErr(null);
                        }}
                        style={{
                            flex: 1,
                            padding: '9px 0',
                            borderRadius: 10,
                            border: `1px solid rgba(239,68,68,0.3)`,
                            background: V2.negSoft,
                            color: V2.neg,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                            fontFamily: V2.ui,
                        }}
                    >
                        {t.outcomeMarkets.close}
                    </button>
                )}
            </div>
        </div>
    );
}

'use client';

/**
 * OutcomeMarketsScreen — HIP-4 prediction markets browser + trade flow.
 *
 * Mirrors the SpotScreen pattern: token-style picker + amount input +
 * confirm. Adapted for outcome markets:
 *  - prices live in (0,1) and represent implied probability
 *  - sizes are whole contracts (szDecimals=0)
 *  - settlement is in USDC or USDH per market.quoteToken
 *  - "you hold" derived from spotBalances entries with coin starting "#"
 *    (HL exposes outcome positions in the spot ledger)
 *
 * Two-pane layout: list on the left, selected market detail on the right.
 * Stacks vertically on narrow screens.
 */

import { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Check,
    ChevronRight,
    Loader2,
    TrendingUp,
    Zap,
} from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { useOutcomeMarkets } from '@/hooks/useOutcomeMarkets';
import {
    outcomeCoinRef,
    type OutcomeMarketView,
    type OutcomeSideView,
} from '@/lib/hyperliquid/outcome';
import { ModalSheet, ModalHeader } from '@/components/ModalSheet';
import ApproveAgentModal from '@/components/ApproveAgentModal';

// Side palette — green for the "positive" side (Yes / Change / first side),
// red for the "negative" (No / No-Change / second side). Polymarket-style.
const SIDE_COLOR = {
    0: {
        color: 'var(--color-positive)',
        soft: 'rgba(34,197,94,0.12)',
        border: 'rgba(34,197,94,0.3)',
    },
    1: {
        color: 'var(--color-negative)',
        soft: 'rgba(239,68,68,0.12)',
        border: 'rgba(239,68,68,0.3)',
    },
} as const;

export default function OutcomeMarketsScreen() {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { markets, loading } = useOutcomeMarkets();
    const { spotBalances, placeOutcomeOrder, buyUsdh } = useHyperliquid();

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [selectedSideIdx, setSelectedSideIdx] = useState<number>(0);
    const [contracts, setContracts] = useState<string>('1');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{
        kind: 'idle' | 'success' | 'error';
        message?: string;
    }>({ kind: 'idle' });
    /** When set, ApproveAgentModal pops; success retries the bet. */
    const [needsAgent, setNeedsAgent] = useState(false);

    // No auto-select — we open the sheet on user tap. Removing the prior
    // auto-select-first-market behavior so the sheet doesn't pop on mount.

    const selected = useMemo<OutcomeMarketView | null>(
        () => markets.find((m) => m.outcomeId === selectedId) || null,
        [markets, selectedId],
    );
    const selectedSide: OutcomeSideView | null =
        selected?.sides[selectedSideIdx] || null;

    /**
     * User's open positions across HIP-4 markets, derived from spotBalances
     * entries whose coin starts with "#" (HL stores outcome holdings in the
     * spot clearinghouse). Map back to {outcomeId, sideIdx, amount}.
     */
    const userPositions = useMemo(() => {
        const positions: Record<
            string,
            { outcomeId: number; sideIdx: number; amount: number }
        > = {};
        (spotBalances || []).forEach((b) => {
            if (!b.coin.startsWith('#')) return;
            const n = parseInt(b.coin.slice(1), 10);
            if (!Number.isFinite(n)) return;
            const amount = parseFloat(b.total) || 0;
            if (amount <= 0) return;
            positions[b.coin] = {
                outcomeId: Math.floor(n / 10),
                sideIdx: n % 10,
                amount,
            };
        });
        return positions;
    }, [spotBalances]);

    /** Quote-token balance for the selected market (USDC or USDH). */
    const quoteBalance = useMemo(() => {
        if (!selected) return 0;
        const b = (spotBalances || []).find((b) => b.coin === selected.quoteToken);
        return b ? parseFloat(b.total) || 0 : 0;
    }, [selected, spotBalances]);

    const contractsNum = parseInt(contracts || '0', 10) || 0;
    const totalCost = selectedSide ? contractsNum * selectedSide.mid : 0;
    const potentialPayout = contractsNum; // YES contract settles at $1 if it wins
    const potentialProfit = potentialPayout - totalCost;

    const validationError = (() => {
        if (!selected || !selectedSide) return null;
        if (contractsNum < 1) return t.outcomeMarkets.minContracts;
        if (totalCost < 10)
            return t.outcomeMarkets.minNotional.replace(
                '{amount}',
                '10',
            );
        if (totalCost > quoteBalance)
            return t.outcomeMarkets.insufficientQuote.replace(
                '{token}',
                selected.quoteToken,
            );
        return null;
    })();

    const canSubmit = !!selected && !!selectedSide && !validationError && !submitting;

    const placeBet = async () => {
        if (!selected || !selectedSide) return { ok: false } as const;
        const res = await placeOutcomeOrder({
            outcomeId: selected.outcomeId,
            sideIdx: selectedSideIdx,
            side: 'buy',
            type: 'market',
            size: contractsNum,
            marketSlippagePct: 0.05,
        });
        return { ok: !!res.filled, error: res.error } as const;
    };

    const handleBet = async () => {
        if (!selected || !selectedSide) return;
        setSubmitting(true);
        setResult({ kind: 'idle' });
        const res = await placeBet();
        if (res.ok) {
            setResult({ kind: 'success' });
            setContracts('1');
        } else if (res.error?.toLowerCase().includes('agent wallet not approved')) {
            // No on-device agent yet — open the approval modal and let
            // the user set one up. The modal's onSuccess will retry.
            setNeedsAgent(true);
        } else {
            setResult({
                kind: 'error',
                message: res.error || t.outcomeMarkets.errBet,
            });
        }
        setSubmitting(false);
    };

    const handleAgentSuccess = async () => {
        setNeedsAgent(false);
        // Retry the bet now that the agent is approved on-chain.
        setSubmitting(true);
        setResult({ kind: 'idle' });
        const res = await placeBet();
        if (res.ok) {
            setResult({ kind: 'success' });
            setContracts('1');
        } else {
            setResult({
                kind: 'error',
                message: res.error || t.outcomeMarkets.errBet,
            });
        }
        setSubmitting(false);
    };

    // Sort markets: those with non-default mids first (i.e. actively traded),
    // then alphabetically. Filter out markets without sides.
    const sortedMarkets = useMemo(() => {
        const score = (m: OutcomeMarketView) => {
            // Markets at exactly 50/50 have probably never traded — push down
            const mid = m.sides[0]?.mid ?? 0.5;
            return Math.abs(mid - 0.5);
        };
        return [...markets].sort((a, b) => score(b) - score(a));
    }, [markets]);

    if (loading && markets.length === 0) {
        return (
            <div
                style={{
                    padding: 80,
                    textAlign: 'center',
                    color: 'var(--color-text-tertiary)',
                }}
            >
                <Loader2
                    className="animate-spin inline-block mr-2"
                    style={{ width: 18, height: 18 }}
                />
                {t.outcomeMarkets.loading}
            </div>
        );
    }

    if (sortedMarkets.length === 0) {
        return (
            <div
                style={{
                    padding: '80px 22px',
                    textAlign: 'center',
                    color: 'var(--color-text-tertiary)',
                    fontSize: 14,
                }}
            >
                {t.outcomeMarkets.empty}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header chip showing zero-fee perk */}
            <div
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--color-positive)',
                    alignSelf: 'flex-start',
                }}
            >
                <Zap
                    style={{ width: 12, height: 12, strokeWidth: 2.4 }}
                />
                {t.outcomeMarkets.zeroFee}
            </div>

            {/* Market list */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}
            >
                {sortedMarkets.map((m) => {
                    const pos0 = userPositions[outcomeCoinRef(m.outcomeId, 0)];
                    const pos1 = userPositions[outcomeCoinRef(m.outcomeId, 1)];
                    const isSelected = m.outcomeId === selectedId;
                    return (
                        <MarketCard
                            key={m.outcomeId}
                            market={m}
                            selected={isSelected}
                            onClick={() => {
                                setSelectedId(m.outcomeId);
                                setSelectedSideIdx(0);
                                setContracts('1');
                                setResult({ kind: 'idle' });
                            }}
                            position={pos0 || pos1 || null}
                        />
                    );
                })}
            </div>

            {/* Trade panel for selected market — rendered as a bottom
                sheet so it appears in view regardless of list scroll. */}
            <ModalSheet
                open={!!selected && !!selectedSide}
                onClose={() => {
                    setSelectedId(null);
                    setResult({ kind: 'idle' });
                }}
            >
                {selected && selectedSide && (
                    <>
                        <ModalHeader
                            title={selected.name}
                            sub={selected.quoteToken}
                            onClose={() => {
                                setSelectedId(null);
                                setResult({ kind: 'idle' });
                            }}
                        />
                        <div style={{ padding: '4px 18px 28px' }}>
                    {/* Market header inside the trade panel */}
                    <div
                        style={{
                            fontSize: 'var(--text-base)',
                            fontWeight: 700,
                            marginBottom: 6,
                        }}
                    >
                        {selected.name}
                    </div>
                    {selected.description && (
                        <div
                            style={{
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-text-tertiary)',
                                marginBottom: 14,
                                lineHeight: 1.5,
                                maxHeight: 100,
                                overflow: 'hidden',
                            }}
                        >
                            {selected.description}
                        </div>
                    )}

                    {/* Side selector */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${selected.sides.length}, 1fr)`,
                            gap: 8,
                            marginBottom: 14,
                        }}
                    >
                        {selected.sides.map((s, idx) => {
                            const palette =
                                SIDE_COLOR[idx as 0 | 1] || SIDE_COLOR[0];
                            const active = selectedSideIdx === idx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedSideIdx(idx)}
                                    style={{
                                        padding: '12px 10px',
                                        borderRadius: 'var(--radius-md)',
                                        border: active
                                            ? `1px solid ${palette.color}`
                                            : '1px solid var(--color-border-subtle)',
                                        background: active
                                            ? palette.soft
                                            : 'var(--color-bg-tertiary)',
                                        color: active
                                            ? palette.color
                                            : 'var(--color-text-secondary)',
                                        fontWeight: 700,
                                        fontSize: 'var(--text-sm)',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <div>{s.name}</div>
                                    <div
                                        className="font-mono"
                                        style={{
                                            fontSize: 'var(--text-xs)',
                                            opacity: 0.8,
                                            marginTop: 2,
                                        }}
                                    >
                                        {(s.mid * 100).toFixed(1)}¢
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Contracts input */}
                    <div style={{ marginBottom: 14 }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-text-tertiary)',
                                marginBottom: 6,
                            }}
                        >
                            <span>{t.outcomeMarkets.amountLabel}</span>
                            <span className="font-mono">
                                {selected.quoteToken}: {formatCurrency(quoteBalance, 2)}
                            </span>
                        </div>
                        <input
                            type="number"
                            min={1}
                            step={1}
                            value={contracts}
                            onChange={(e) =>
                                setContracts(e.target.value.replace(/[^0-9]/g, ''))
                            }
                            className="font-mono"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: 'var(--color-bg-tertiary)',
                                border: '1px solid var(--color-border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--color-text-primary)',
                                fontSize: 'var(--text-xl)',
                                fontWeight: 700,
                                outline: 'none',
                            }}
                        />
                    </div>

                    {/* Preview */}
                    <div
                        style={{
                            background: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px 14px',
                            marginBottom: 14,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                        }}
                    >
                        <PreviewRow
                            label={t.outcomeMarkets.totalCost}
                            value={`${formatCurrency(totalCost, 2)} ${selected.quoteToken}`}
                        />
                        <PreviewRow
                            label={t.outcomeMarkets.potentialPayout}
                            value={`${formatCurrency(potentialPayout, 2)} ${selected.quoteToken}`}
                        />
                        <PreviewRow
                            label={t.outcomeMarkets.potentialProfit}
                            value={`${potentialProfit >= 0 ? '+' : ''}${formatCurrency(potentialProfit, 2)}`}
                            color={
                                potentialProfit >= 0
                                    ? 'var(--color-positive)'
                                    : 'var(--color-negative)'
                            }
                        />
                    </div>

                    {validationError && contractsNum > 0 && (
                        <div
                            style={{
                                display: 'flex',
                                gap: 6,
                                alignItems: 'center',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-negative)',
                                marginBottom: 10,
                            }}
                        >
                            <AlertCircle style={{ width: 12, height: 12 }} />
                            {validationError}
                        </div>
                    )}

                    {/* USDH onramp for USDH-quoted markets when balance is 0 */}
                    {selected.quoteToken === 'USDH' && quoteBalance < 10 && (
                        <UsdhOnramp
                            buyUsdh={buyUsdh}
                            needed={Math.max(20, Math.ceil(totalCost) + 5)}
                        />
                    )}

                    {result.kind === 'success' && (
                        <div
                            style={{
                                background: 'rgba(34,197,94,0.1)',
                                border: '1px solid rgba(34,197,94,0.3)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 12px',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--color-positive)',
                                display: 'flex',
                                gap: 8,
                                alignItems: 'center',
                                marginBottom: 10,
                            }}
                        >
                            <Check style={{ width: 14, height: 14 }} />
                            {t.outcomeMarkets.successBet}
                        </div>
                    )}
                    {result.kind === 'error' && (
                        <div
                            style={{
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 12px',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--color-negative)',
                                marginBottom: 10,
                            }}
                        >
                            {result.message}
                        </div>
                    )}

                    {/* CTA */}
                    <button
                        onClick={handleBet}
                        disabled={!canSubmit}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: canSubmit
                                ? (SIDE_COLOR[selectedSideIdx as 0 | 1] || SIDE_COLOR[0])
                                      .color
                                : 'var(--color-bg-tertiary)',
                            border: 'none',
                            borderRadius: 'var(--radius-full)',
                            color: canSubmit
                                ? '#fff'
                                : 'var(--color-text-tertiary)',
                            fontWeight: 800,
                            fontSize: 'var(--text-sm)',
                            cursor: canSubmit ? 'pointer' : 'not-allowed',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        {submitting ? (
                            <>
                                <Loader2
                                    className="animate-spin"
                                    style={{ width: 14, height: 14 }}
                                />
                                {t.outcomeMarkets.betting}
                            </>
                        ) : (
                            t.outcomeMarkets.placeBetCta
                                .replace(
                                    '{amount}',
                                    `${contractsNum || '?'} ${t.outcomeMarkets.contracts}`,
                                )
                                .replace('{side}', selectedSide.name)
                        )}
                    </button>
                        </div>
                    </>
                )}
            </ModalSheet>

            {/* User's open positions across all markets */}
            <YourBets positions={userPositions} markets={markets} />

            {/* Agent approval — auto-opened when an outcome order fails
                because no on-device agent exists. After success the bet
                retries automatically. */}
            <ApproveAgentModal
                open={needsAgent}
                onClose={() => setNeedsAgent(false)}
                onSuccess={handleAgentSuccess}
            />
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────────────
function MarketCard({
    market,
    selected,
    onClick,
    position,
}: {
    market: OutcomeMarketView;
    selected: boolean;
    onClick: () => void;
    position: { outcomeId: number; sideIdx: number; amount: number } | null;
}) {
    const sideYes = market.sides[0];
    const sideNo = market.sides[1];
    const yesPct = sideYes ? sideYes.mid * 100 : 50;

    return (
        <button
            onClick={onClick}
            style={{
                textAlign: 'left',
                padding: '14px 16px',
                background: selected
                    ? 'rgba(250,204,21,0.06)'
                    : 'var(--color-bg-secondary)',
                border: selected
                    ? '1px solid rgba(250,204,21,0.4)'
                    : '1px solid var(--color-border-subtle)',
                borderRadius: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: 'inherit',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
            }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {market.name}
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 6,
                        fontSize: 11,
                    }}
                >
                    <SidePill
                        label={sideYes?.name || 'Yes'}
                        pct={sideYes?.mid ?? 0.5}
                        sideIdx={0}
                    />
                    <SidePill
                        label={sideNo?.name || 'No'}
                        pct={sideNo?.mid ?? 0.5}
                        sideIdx={1}
                    />
                    <span
                        style={{
                            fontSize: 9,
                            color: 'var(--color-text-tertiary)',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                        }}
                    >
                        {market.quoteToken}
                    </span>
                </div>
                {position && (
                    <div
                        className="font-mono"
                        style={{
                            marginTop: 6,
                            fontSize: 10,
                            color:
                                position.sideIdx === 0
                                    ? 'var(--color-positive)'
                                    : 'var(--color-negative)',
                            fontWeight: 700,
                        }}
                    >
                        ▸ {position.amount.toFixed(0)}{' '}
                        {market.sides[position.sideIdx]?.name || ''}
                    </div>
                )}
            </div>
            <ChevronRight
                style={{
                    width: 16,
                    height: 16,
                    color: 'var(--color-text-tertiary)',
                    flexShrink: 0,
                }}
            />
        </button>
    );
}

function SidePill({
    label,
    pct,
    sideIdx,
}: {
    label: string;
    pct: number;
    sideIdx: number;
}) {
    const palette = SIDE_COLOR[sideIdx as 0 | 1] || SIDE_COLOR[0];
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                background: palette.soft,
                border: `1px solid ${palette.border}`,
                borderRadius: 99,
                color: palette.color,
                fontWeight: 700,
                fontSize: 11,
            }}
        >
            {label}
            <span className="font-mono" style={{ opacity: 0.8 }}>
                {(pct * 100).toFixed(0)}%
            </span>
        </span>
    );
}

function PreviewRow({
    label,
    value,
    color,
}: {
    label: string;
    value: string;
    color?: string;
}) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 'var(--text-xs)',
            }}
        >
            <span style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
            <span
                className="font-mono"
                style={{
                    fontWeight: 700,
                    color: color || 'var(--color-text-primary)',
                }}
            >
                {value}
            </span>
        </div>
    );
}

function UsdhOnramp({
    buyUsdh,
    needed,
}: {
    buyUsdh: (usdc: number) => Promise<{ filled: boolean; error?: string }>;
    needed: number;
}) {
    const { t } = useLanguage();
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    return (
        <div
            style={{
                background: 'rgba(250,204,21,0.05)',
                border: '1px solid rgba(250,204,21,0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: 10,
            }}
        >
            <div
                style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    marginBottom: 4,
                }}
            >
                {t.outcomeMarkets.buyUsdhTitle}
            </div>
            <div
                style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.4,
                    marginBottom: 10,
                }}
            >
                {t.outcomeMarkets.buyUsdhBody}
            </div>
            {err && (
                <div
                    style={{
                        fontSize: 11,
                        color: 'var(--color-negative)',
                        marginBottom: 8,
                    }}
                >
                    {err}
                </div>
            )}
            <button
                onClick={async () => {
                    setBusy(true);
                    setErr(null);
                    const r = await buyUsdh(needed);
                    if (!r.filled) setErr(r.error || 'Failed');
                    setBusy(false);
                }}
                disabled={busy}
                style={{
                    width: '100%',
                    padding: 10,
                    border: 'none',
                    background:
                        'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                    color: '#1A1304',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm)',
                    borderRadius: 'var(--radius-md)',
                    cursor: busy ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                }}
            >
                {busy ? (
                    <>
                        <Loader2
                            className="animate-spin"
                            style={{ width: 14, height: 14 }}
                        />
                        {t.outcomeMarkets.buying}
                    </>
                ) : (
                    <>
                        <TrendingUp style={{ width: 14, height: 14 }} />
                        {t.outcomeMarkets.buyUsdhAction.replace(
                            '{amount}',
                            needed.toString(),
                        )}
                    </>
                )}
            </button>
        </div>
    );
}

function YourBets({
    positions,
    markets,
}: {
    positions: Record<
        string,
        { outcomeId: number; sideIdx: number; amount: number }
    >;
    markets: OutcomeMarketView[];
}) {
    const { t } = useLanguage();
    const list = useMemo(() => {
        return Object.entries(positions).map(([coin, pos]) => {
            const m = markets.find((mm) => mm.outcomeId === pos.outcomeId);
            const sideName = m?.sides[pos.sideIdx]?.name || `Side ${pos.sideIdx}`;
            return { coin, pos, marketName: m?.name || `#${pos.outcomeId}`, sideName };
        });
    }, [positions, markets]);

    if (list.length === 0) return null;

    return (
        <div
            style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.16em',
                    fontWeight: 700,
                    marginBottom: 12,
                }}
            >
                {t.outcomeMarkets.yourBets}
            </div>
            <div
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
                {list.map(({ coin, pos, marketName, sideName }) => {
                    const palette =
                        SIDE_COLOR[pos.sideIdx as 0 | 1] || SIDE_COLOR[0];
                    return (
                        <div
                            key={coin}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 12px',
                                background: 'var(--color-bg-tertiary)',
                                borderRadius: 12,
                            }}
                        >
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {marketName}
                                </div>
                                <div
                                    style={{
                                        marginTop: 2,
                                        fontSize: 10,
                                        color: palette.color,
                                        fontWeight: 700,
                                    }}
                                >
                                    {sideName}
                                </div>
                            </div>
                            <div
                                className="font-mono"
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: palette.color,
                                }}
                            >
                                {pos.amount.toFixed(0)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

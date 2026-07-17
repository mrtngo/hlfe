'use client';

/**
 * BolsillosScreen — "pockets" overview.
 *
 * Maps Hyperliquid's perp + spot sub-accounts to a two-pocket mental model
 * for LATAM beginners. The perp pocket holds leverage trading margin; the
 * spot pocket holds outright-owned crypto. A swap FAB and big "Mover plata"
 * CTA both open the multi-step Mover flow.
 *
 * Built off the `design_handoff_bolsillos/screens/bolsillos.jsx` reference.
 * Lifts visual recipe verbatim where possible.
 */

import { useEffect, useMemo, useState } from 'react';
import {
    ChevronRight,
    Info,
    Repeat,
    Wallet,
    Zap,
} from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import ScreenHeader from '@/components/ScreenHeader';
import TokenLogo from '@/components/TokenLogo';
import MoverFlow from '@/components/MoverFlow';

interface BolsillosScreenProps {
    onBack?: () => void;
    onDeposit?: () => void;
}

// ─── Pocket palette ────────────────────────────────────────────
// Lifted from the design handoff so the Perps card stays "brand yellow"
// and the Spot card "soft purple." Used by every pocket-aware widget below.
const POCKET_COLORS = {
    perp: {
        color: '#E3B34C',
        soft: 'rgba(227,179,76,0.12)',
        softer: 'rgba(227,179,76,0.04)',
        border: 'rgba(227,179,76,0.25)',
    },
    spot: {
        color: '#A78BFA',
        soft: 'rgba(167,139,250,0.12)',
        softer: 'rgba(167,139,250,0.04)',
        border: 'rgba(167,139,250,0.25)',
    },
} as const;

type PocketId = 'perp' | 'spot';

interface PocketView {
    id: PocketId;
    name: string;
    short: string;
    desc: string;
    balance: number;
    available: number;
    /** Money sitting inside open positions / non-USDC tokens. */
    used: number;
    pnl: number;
    pnlPct: number;
}

const SEEN_INTRO_KEY = 'rayo:bolsillosIntroSeen';

export default function BolsillosScreen({
    onBack,
    onDeposit,
}: BolsillosScreenProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const {
        account,
        spotBalances,
        spotPrices,
        markets,
        positions,
    } = useHyperliquid();

    const [moverOpen, setMoverOpen] = useState(false);
    const [moverFromHint, setMoverFromHint] = useState<PocketId>('perp');
    const [showIntro, setShowIntro] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (localStorage.getItem(SEEN_INTRO_KEY) === '1') setShowIntro(false);
    }, []);

    const dismissIntro = () => {
        setShowIntro(false);
        if (typeof window !== 'undefined') {
            localStorage.setItem(SEEN_INTRO_KEY, '1');
        }
    };

    // ─── Derive pocket data from existing provider state ────────
    const perpPocket: PocketView = useMemo(() => {
        const balance = account.equity || account.balance || 0;
        const available = account.availableMargin || 0;
        const used = account.usedMargin || 0;
        const pnl = account.unrealizedPnl || 0;
        const pnlPct =
            balance > 0 ? (pnl / Math.max(balance - pnl, 1)) * 100 : 0;
        return {
            id: 'perp',
            name: t.bolsillos.perpName,
            short: t.bolsillos.perpShort,
            desc: t.bolsillos.perpDesc,
            balance,
            available,
            used,
            pnl,
            pnlPct,
        };
    }, [account, t]);

    /** Top non-USDC spot holdings, valued in USD via spotPrices/markets. */
    const spotHoldings = useMemo(() => {
        return (spotBalances || [])
            .filter((b) => b.coin !== 'USDC' && b.coin !== 'USDT')
            .map((b) => {
                const amount = parseFloat(b.total) || 0;
                if (amount <= 0) return null;
                const spotPx = spotPrices?.[b.coin] || 0;
                const perpPx =
                    markets.find((m) => m.name === b.coin)?.price || 0;
                const price = spotPx || perpPx;
                if (price <= 0) return null;
                return {
                    symbol: b.coin,
                    name: b.coin,
                    amount,
                    value: amount * price,
                };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);
    }, [spotBalances, spotPrices, markets]);

    /** Spot pocket totals — USDC in spot + value of non-USDC holdings. */
    const spotPocket: PocketView = useMemo(() => {
        const usdc =
            spotBalances?.find((b) => b.coin === 'USDC')?.total
                ? parseFloat(
                      spotBalances.find((b) => b.coin === 'USDC')!.total,
                  )
                : 0;
        const tokenValue = (spotBalances || [])
            .filter((b) => b.coin !== 'USDC' && b.coin !== 'USDT')
            .reduce((sum, b) => {
                const amount = parseFloat(b.total) || 0;
                const price =
                    spotPrices?.[b.coin] ||
                    markets.find((m) => m.name === b.coin)?.price ||
                    0;
                return sum + amount * price;
            }, 0);
        const balance = usdc + tokenValue;
        return {
            id: 'spot',
            name: t.bolsillos.spotName,
            short: t.bolsillos.spotShort,
            desc: t.bolsillos.spotDesc,
            balance,
            available: usdc,
            // "En cripto" — the non-USDC value
            used: tokenValue,
            // PnL for spot is hard to compute without entry tracking; show 0
            // for now. Could be wired up later from entryNtl deltas.
            pnl: 0,
            pnlPct: 0,
        };
    }, [spotBalances, spotPrices, markets, t]);

    const total = perpPocket.balance + spotPocket.balance;
    const totalPnl = perpPocket.pnl + spotPocket.pnl;

    const bothEmpty = total < 0.01;

    // ─── Empty state ────────────────────────────────────────────
    if (bothEmpty) {
        return (
            <div style={{ paddingBottom: 110 }}>
                <ScreenHeader
                    title={t.bolsillos.title}
                    sub="empezá acá"
                    onBack={onBack}
                />
                <div
                    style={{
                        padding: '60px 22px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 16,
                    }}
                >
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 20,
                            background: 'rgba(227,179,76,0.1)',
                            border: '1px solid rgba(227,179,76,0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Wallet style={{ width: 28, height: 28, color: '#E3B34C' }} />
                    </div>
                    <div
                        style={{
                            fontSize: 22,
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                        }}
                    >
                        {t.bolsillos.emptyTitle}
                    </div>
                    <div
                        style={{
                            fontSize: 13,
                            color: 'var(--color-text-secondary)',
                            maxWidth: 280,
                            lineHeight: 1.5,
                        }}
                    >
                        {t.bolsillos.emptyBody}
                    </div>
                    <button
                        onClick={onDeposit}
                        style={{
                            marginTop: 8,
                            padding: '14px 28px',
                            borderRadius: 14,
                            border: 'none',
                            background:
                                'linear-gradient(180deg, #F2D389 0%, #E3B34C 50%, #C8952E 100%)',
                            color: '#1C1608',
                            fontWeight: 800,
                            fontSize: 13,
                            cursor: 'pointer',
                            boxShadow:
                                '0 1px 0 rgba(255,255,255,0.4) inset, 0 14px 32px -8px rgba(227,179,76,0.45)',
                        }}
                    >
                        {t.bolsillos.emptyCta}
                    </button>
                </div>
            </div>
        );
    }

    // ─── Main render ────────────────────────────────────────────
    return (
        <>
            <div style={{ paddingBottom: 110 }}>
                <ScreenHeader
                    title={t.bolsillos.title}
                    sub={t.bolsillos.sub}
                    onBack={onBack}
                    right={
                        <button
                            onClick={() => setShowIntro((s) => !s)}
                            title={t.bolsillos.eduTitle}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.02)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <Info
                                style={{
                                    width: 15,
                                    height: 15,
                                    color: 'rgba(255,255,255,0.7)',
                                }}
                            />
                        </button>
                    }
                />

                {/* Total balance summary */}
                <div style={{ padding: '0 22px 16px' }}>
                    <div
                        style={{
                            fontSize: 10,
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.5)',
                            fontWeight: 700,
                            marginBottom: 6,
                        }}
                    >
                        {t.bolsillos.total}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 12,
                            flexWrap: 'wrap',
                        }}
                    >
                        <BigAmount value={total} large />
                        {Math.abs(totalPnl) > 0.005 && (
                            <div
                                className="font-mono"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '4px 9px',
                                    borderRadius: 99,
                                    background:
                                        totalPnl >= 0
                                            ? 'rgba(34,197,94,0.13)'
                                            : 'rgba(239,68,68,0.13)',
                                    color:
                                        totalPnl >= 0
                                            ? 'var(--color-positive)'
                                            : 'var(--color-negative)',
                                    fontWeight: 700,
                                    fontSize: 12,
                                }}
                            >
                                {totalPnl >= 0 ? '↗' : '↘'}{' '}
                                {totalPnl >= 0 ? '+' : ''}
                                {formatCurrency(totalPnl)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Two pocket cards stacked + swap FAB pinned to the seam */}
                <div style={{ padding: '0 22px 18px', position: 'relative' }}>
                    <PocketCard pocket={perpPocket} />

                    <div
                        style={{
                            position: 'relative',
                            height: 0,
                            zIndex: 5,
                            display: 'flex',
                            justifyContent: 'center',
                        }}
                    >
                        <button
                            onClick={() => {
                                setMoverFromHint('perp');
                                setMoverOpen(true);
                            }}
                            aria-label={t.bolsillos.cta}
                            style={{
                                position: 'absolute',
                                top: -22,
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                background:
                                    'linear-gradient(180deg, #F2D389 0%, #E3B34C 50%, #C8952E 100%)',
                                border: '3px solid #0A0907',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow:
                                    '0 8px 24px -6px rgba(227,179,76,0.55), 0 0 0 1px rgba(0,0,0,0.4)',
                                cursor: 'pointer',
                            }}
                        >
                            <Repeat
                                style={{
                                    width: 18,
                                    height: 18,
                                    color: '#1C1608',
                                    strokeWidth: 2.6,
                                }}
                            />
                        </button>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <PocketCard
                            pocket={spotPocket}
                            inlineContent={
                                spotHoldings.length > 0 ? (
                                    <SpotHoldingsPreview
                                        holdings={spotHoldings}
                                        label={t.bolsillos.yourCrypto}
                                    />
                                ) : null
                            }
                        />
                    </div>
                </div>

                {/* Big Mover CTA */}
                <div style={{ padding: '0 22px 24px' }}>
                    <button
                        onClick={() => setMoverOpen(true)}
                        style={{
                            width: '100%',
                            padding: 18,
                            background:
                                'linear-gradient(180deg, #F2D389 0%, #E3B34C 50%, #C8952E 100%)',
                            border: 'none',
                            borderRadius: 18,
                            color: '#1C1608',
                            fontWeight: 800,
                            fontSize: 14,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow:
                                '0 1px 0 rgba(255,255,255,0.4) inset, 0 18px 40px -10px rgba(227,179,76,0.45)',
                            letterSpacing: '0.01em',
                        }}
                    >
                        <Repeat
                            style={{
                                width: 16,
                                height: 16,
                                color: '#1C1608',
                                strokeWidth: 2.6,
                            }}
                        />
                        {t.bolsillos.cta}
                    </button>
                </div>

                {/* Recent transfers — empty for now until pocket_transfers
                    table ships. Renders an honest "no transfers yet" hint
                    instead of fake data. */}
                <div style={{ padding: '0 22px' }}>
                    <SectionRule label={t.bolsillos.recentTransfers} />
                    <div
                        style={{
                            marginTop: 14,
                            padding: '24px 14px',
                            textAlign: 'center',
                            color: 'var(--color-text-tertiary)',
                            fontSize: 12,
                            fontStyle: 'italic',
                            background: 'rgba(255,255,255,0.015)',
                            border: '1px dashed rgba(255,255,255,0.06)',
                            borderRadius: 14,
                        }}
                    >
                        {t.bolsillos.noTransfersYet}
                    </div>
                </div>

                {/* Educational moment (dismissible) */}
                {showIntro && (
                    <div style={{ padding: '24px 22px 0' }}>
                        <button
                            onClick={dismissIntro}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '16px 18px',
                                borderRadius: 18,
                                background: 'rgba(255,255,255,0.025)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 12,
                                cursor: 'pointer',
                                color: 'inherit',
                                fontFamily: 'inherit',
                            }}
                        >
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 10,
                                    flexShrink: 0,
                                    background: 'rgba(227,179,76,0.12)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Info
                                    style={{ width: 14, height: 14, color: '#E3B34C' }}
                                />
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        marginBottom: 4,
                                    }}
                                >
                                    {t.bolsillos.eduTitle}
                                </div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: 'rgba(255,255,255,0.6)',
                                        lineHeight: 1.45,
                                    }}
                                >
                                    {t.bolsillos.eduBody}
                                </div>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {moverOpen && (
                <MoverFlow
                    open={moverOpen}
                    initialFrom={moverFromHint}
                    perpAvailable={perpPocket.available}
                    spotAvailable={spotPocket.available}
                    onClose={() => setMoverOpen(false)}
                />
            )}
        </>
    );
}

// ─── PocketCard ────────────────────────────────────────────────
function PocketCard({
    pocket,
    inlineContent,
}: {
    pocket: PocketView;
    inlineContent?: React.ReactNode;
}) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const palette = POCKET_COLORS[pocket.id];
    const Icon = pocket.id === 'perp' ? Zap : Wallet;
    const allocPct =
        pocket.used > 0 && pocket.balance > 0
            ? (pocket.used / pocket.balance) * 100
            : 0;

    return (
        <div
            style={{
                position: 'relative',
                borderRadius: 24,
                overflow: 'hidden',
                background: `linear-gradient(165deg, ${palette.softer} 0%, rgba(0,0,0,0.4) 100%), #131110`,
                border: `1px solid ${palette.border}`,
                boxShadow:
                    '0 16px 40px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
                padding: 18,
            }}
        >
            {/* Header row */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: palette.soft,
                            border: `1px solid ${palette.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Icon
                            style={{
                                width: 18,
                                height: 18,
                                color: palette.color,
                                strokeWidth: 2.2,
                            }}
                        />
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: 20,
                                fontWeight: 600,
                                lineHeight: 1,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            {pocket.name}
                        </div>
                        <div
                            style={{
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.45)',
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                marginTop: 4,
                                maxWidth: 200,
                                lineHeight: 1.3,
                            }}
                        >
                            {pocket.desc}
                        </div>
                    </div>
                </div>
                <ChevronRight
                    style={{
                        width: 18,
                        height: 18,
                        color: 'rgba(255,255,255,0.4)',
                    }}
                />
            </div>

            {/* Big balance */}
            <div
                style={{
                    marginTop: 16,
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 8,
                }}
            >
                <BigAmount value={pocket.balance} />
                {Math.abs(pocket.pnlPct) > 0.005 && (
                    <div
                        className="font-mono"
                        style={{
                            fontWeight: 700,
                            fontSize: 12,
                            color:
                                pocket.pnl >= 0
                                    ? 'var(--color-positive)'
                                    : 'var(--color-negative)',
                        }}
                    >
                        {pocket.pnl >= 0 ? '+' : ''}
                        {pocket.pnlPct.toFixed(2)}%
                    </div>
                )}
            </div>

            {/* Sub-stat strip */}
            <div
                style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                }}
            >
                <Stat
                    label={t.bolsillos.available}
                    value={formatCurrency(pocket.available, 0)}
                />
                <Stat
                    label={
                        pocket.id === 'perp'
                            ? t.bolsillos.inPosition
                            : t.bolsillos.inCrypto
                    }
                    value={formatCurrency(pocket.used, 0)}
                />
                <Stat
                    label={t.bolsillos.pnl30d}
                    value={
                        (pocket.pnl >= 0 ? '+' : '') +
                        formatCurrency(pocket.pnl, 0)
                    }
                    color={
                        pocket.pnl >= 0
                            ? 'var(--color-positive)'
                            : 'var(--color-negative)'
                    }
                />
            </div>

            {/* Inline content (spot holdings preview) */}
            {inlineContent && (
                <div
                    style={{
                        marginTop: 14,
                        paddingTop: 14,
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    {inlineContent}
                </div>
            )}

            {/* Perp margin allocation bar */}
            {pocket.id === 'perp' && allocPct > 0 && (
                <div
                    style={{
                        marginTop: 14,
                        paddingTop: 14,
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: 6,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.5)',
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                            }}
                        >
                            {t.bolsillos.marginUsed}
                        </span>
                        <span
                            className="font-mono"
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#E3B34C',
                            }}
                        >
                            {allocPct.toFixed(1)}%
                        </span>
                    </div>
                    <div
                        style={{
                            height: 4,
                            borderRadius: 99,
                            background: 'rgba(255,255,255,0.06)',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: `${Math.min(100, allocPct)}%`,
                                background:
                                    'linear-gradient(90deg, rgba(227,179,76,0.4), #E3B34C)',
                                borderRadius: 99,
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function Stat({
    label,
    value,
    color,
}: {
    label: string;
    value: string;
    color?: string;
}) {
    return (
        <div>
            <div
                style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.45)',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                }}
            >
                {label}
            </div>
            <div
                className="font-mono"
                style={{
                    fontWeight: 700,
                    fontSize: 12,
                    marginTop: 3,
                    color: color || 'var(--color-text-primary)',
                }}
            >
                {value}
            </div>
        </div>
    );
}

function SpotHoldingsPreview({
    holdings,
    label,
}: {
    holdings: { symbol: string; name: string; amount: number; value: number }[];
    label: string;
}) {
    const { formatCurrency } = useCurrency();
    return (
        <div>
            <div
                style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    marginBottom: 10,
                }}
            >
                {label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {holdings.map((h) => (
                    <div
                        key={h.symbol}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <TokenLogo symbol={h.symbol} size={26} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#fff',
                                }}
                            >
                                {h.name}
                            </div>
                            <div
                                className="font-mono"
                                style={{
                                    fontSize: 10,
                                    color: 'rgba(255,255,255,0.5)',
                                    marginTop: 1,
                                }}
                            >
                                {h.amount.toLocaleString('en-US', {
                                    maximumFractionDigits: 6,
                                })}{' '}
                                {h.symbol}
                            </div>
                        </div>
                        <div
                            className="font-mono"
                            style={{ fontSize: 12, fontWeight: 700 }}
                        >
                            {formatCurrency(h.value)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Big tabular-numerals dollar amount with dimmed `$` and `.cents`. Two size
 * variants — `large` for the header total, default for pocket cards.
 */
function BigAmount({ value, large = false }: { value: number; large?: boolean }) {
    const safe = Number.isFinite(value) ? value : 0;
    const sign = safe < 0 ? '-' : '';
    const abs = Math.abs(safe);
    const whole = Math.floor(abs).toLocaleString('en-US');
    const dec = abs.toFixed(2).split('.')[1];
    const big = large ? 44 : 36;
    const small = large ? 22 : 18;
    return (
        <div
            className="font-mono"
            style={{
                fontSize: big,
                lineHeight: 0.95,
                fontWeight: 600,
                letterSpacing: '-0.04em',
                color: 'var(--color-text-primary)',
            }}
        >
            <span style={{ fontSize: small, opacity: 0.4 }}>{sign}$</span>
            {whole}
            <span style={{ fontSize: small, color: 'rgba(255,255,255,0.4)' }}>
                .{dec}
            </span>
        </div>
    );
}

function SectionRule({ label }: { label: string }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                paddingTop: 28,
                paddingBottom: 8,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            <span
                style={{
                    fontSize: 12,
                    fontStyle: 'italic',
                    color: 'var(--color-text-secondary)',
                    letterSpacing: '0.02em',
                }}
            >
                {label}
            </span>
        </div>
    );
}

'use client';

/**
 * OutcomeMarketsScreen — HIP-4 prediction markets browser + trade flow (v2).
 *
 * HIP-4 markets are binary outcomes (Yes/No, Change/No-Change, …):
 *  - prices live in (0,1) and represent implied probability
 *  - sizes are whole contracts (szDecimals=0)
 *  - settlement is in USDC or USDH per market.quoteToken
 *  - "you hold" derived from spotBalances entries whose coin starts "#"
 *    (HL exposes outcome positions in the spot ledger)
 *
 * Markets are grouped by their parent event (question) and filterable by
 * category. Internal "Fallback" outcomes are dropped in buildMarketViews.
 * Styled with the v2 design kit (Hanken, #0A0C0E, bolt accent).
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeftRight, ChevronRight, Loader2, TrendingUp } from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { useOutcomeMarkets } from '@/hooks/useOutcomeMarkets';
import {
    outcomeCoinRef,
    type OutcomeCategory,
    type OutcomeMarketView,
    type OutcomeSideView,
} from '@/lib/hyperliquid/outcome';
import { API_URL } from '@/lib/hyperliquid/client';
import { useOutcomePositions, type OutcomePosition } from '@/hooks/useOutcomePositions';
import { ModalSheet, ModalHeader } from '@/components/ModalSheet';
import ApproveAgentModal from '@/components/ApproveAgentModal';
import TransferModal from '@/components/TransferModal';
import TokenCandleChart from '@/components/TokenCandleChart';
import OrderBook from '@/components/OrderBook';
import OutcomePositionCard from '@/components/OutcomePositionCard';
import TradeSuccessSheet from '@/components/TradeSuccessSheet';
import { Icon, SliderRow, V2 } from '@/components/V2Kit';
import { haptic } from '@/lib/haptics';

// Side palette — green for the "positive" side (Yes / Change / first side),
// red for the "negative" (No / No-Change / second side).
const SIDE_COLOR = {
    0: { color: V2.pos, soft: V2.posSoft, border: 'rgba(34,197,94,0.3)' },
    1: { color: V2.neg, soft: V2.negSoft, border: 'rgba(239,68,68,0.3)' },
} as const;

const CATS: OutcomeCategory[] = ['sports', 'economy', 'politics', 'crypto', 'other'];

export default function OutcomeMarketsScreen() {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { markets, loading } = useOutcomeMarkets();
    const { spotBalances, placeOutcomeOrder, buyUsdh, account } = useHyperliquid();
    /** Perp ↔ spot transfer modal. HIP-4 settles from the SPOT balance. */
    const [showTransfer, setShowTransfer] = useState(false);

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [selectedSideIdx, setSelectedSideIdx] = useState<number>(0);
    /** Buy (open / add) vs sell (reduce / close). */
    const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
    /** Size as a % of the relevant balance (quote for buy, held for sell). */
    const [pct, setPct] = useState<number>(50);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ kind: 'idle' | 'success' | 'error'; message?: string }>({
        kind: 'idle',
    });
    /** Drives the full-screen confirmation animation on a filled bet/sell. */
    const [success, setSuccess] = useState<{
        side: 'buy' | 'sell';
        usd: number;
        contracts: number;
        sideName: string;
        marketName: string;
    } | null>(null);
    /** When set, ApproveAgentModal pops; success retries the bet. */
    const [needsAgent, setNeedsAgent] = useState(false);
    const [activeTab, setActiveTab] = useState<'trade' | 'chart' | 'book'>('trade');
    /** Category filter — null = all. */
    const [cat, setCat] = useState<OutcomeCategory | null>(null);

    const selected = useMemo<OutcomeMarketView | null>(
        () => markets.find((m) => m.outcomeId === selectedId) || null,
        [markets, selectedId],
    );
    const selectedSide: OutcomeSideView | null = selected?.sides[selectedSideIdx] || null;

    /**
     * User's open positions across HIP-4 markets, derived from spotBalances
     * entries whose coin starts with "+" (HL stores outcome holdings in the
     * spot clearinghouse as "+{10*outcome+side}"). Keyed by the "#" market
     * ref (outcomeCoinRef) so the lookups below stay consistent.
     */
    const userPositions = useMemo(() => {
        const positions: Record<string, { outcomeId: number; sideIdx: number; amount: number }> = {};
        (spotBalances || []).forEach((b) => {
            if (!b.coin.startsWith('+')) return;
            const n = parseInt(b.coin.slice(1), 10);
            if (!Number.isFinite(n)) return;
            const amount = parseFloat(b.total) || 0;
            if (amount <= 0) return;
            const outcomeId = Math.floor(n / 10);
            const sideIdx = n % 10;
            positions[outcomeCoinRef(outcomeId, sideIdx)] = { outcomeId, sideIdx, amount };
        });
        return positions;
    }, [spotBalances]);

    /** Quote-token balance for the selected market (USDC or USDH). */
    const quoteBalance = useMemo(() => {
        if (!selected) return 0;
        const b = (spotBalances || []).find((b) => b.coin === selected.quoteToken);
        return b ? parseFloat(b.total) || 0 : 0;
    }, [selected, spotBalances]);

    /** Spot USDC balance (the default settlement token) + perp available. */
    const spotUsdc = useMemo(() => {
        const b = (spotBalances || []).find((b) => b.coin === 'USDC');
        return b ? parseFloat(b.total) || 0 : 0;
    }, [spotBalances]);
    const perpAvailable = account?.availableMargin || 0;

    /** Contracts held on the currently-selected side (for sell/close). */
    const heldContracts = useMemo(() => {
        if (!selected) return 0;
        const p = userPositions[outcomeCoinRef(selected.outcomeId, selectedSideIdx)];
        return p ? Math.floor(p.amount) : 0;
    }, [selected, selectedSideIdx, userPositions]);

    const price = selectedSide?.mid ?? 0;

    // Derive whole contracts from the % slider: buy spends a % of the quote
    // balance; sell unwinds a % of the held contracts.
    const contractsNum = useMemo(() => {
        if (tradeSide === 'sell') return Math.floor((heldContracts * pct) / 100);
        if (price <= 0) return 0;
        return Math.floor((quoteBalance * pct) / 100 / price);
    }, [tradeSide, pct, heldContracts, quoteBalance, price]);

    const totalCost = contractsNum * price; // buy: spend; sell: proceeds
    const potentialPayout = contractsNum; // a winning contract settles at $1
    const potentialProfit = potentialPayout - totalCost;

    const validationError = (() => {
        if (!selected || !selectedSide) return null;
        if (tradeSide === 'sell') {
            if (heldContracts < 1) return t.outcomeMarkets.noToSell;
            if (contractsNum < 1) return t.outcomeMarkets.minContracts;
            return null;
        }
        if (contractsNum < 1) return t.outcomeMarkets.minContracts;
        if (totalCost < 10) return t.outcomeMarkets.minNotional.replace('{amount}', '10');
        if (totalCost > quoteBalance)
            return t.outcomeMarkets.insufficientQuote.replace('{token}', selected.quoteToken);
        return null;
    })();

    const canSubmit = !!selected && !!selectedSide && !validationError && !submitting;

    const placeBet = async () => {
        if (!selected || !selectedSide) return { ok: false } as const;
        const res = await placeOutcomeOrder({
            outcomeId: selected.outcomeId,
            sideIdx: selectedSideIdx,
            side: tradeSide,
            type: 'market',
            size: contractsNum,
            marketSlippagePct: 0.05,
        });
        return { ok: !!res.filled, filledSize: res.filledSize, filledPrice: res.filledPrice, error: res.error } as const;
    };

    /** Fire the confirmation animation, reset the slider, close the trade sheet. */
    const onFilled = (res: { filledSize?: number; filledPrice?: number }) => {
        if (!selected || !selectedSide) return;
        const filledSz = res.filledSize && res.filledSize > 0 ? res.filledSize : contractsNum;
        const filledPx = res.filledPrice && res.filledPrice > 0 ? res.filledPrice : price;
        setSuccess({
            side: tradeSide,
            usd: filledSz * filledPx,
            contracts: filledSz,
            sideName: selectedSide.name,
            marketName: selected.name,
        });
        setPct(50);
        setSelectedId(null);
    };

    const handleBet = async () => {
        if (!selected || !selectedSide) return;
        haptic.medium();
        setSubmitting(true);
        setResult({ kind: 'idle' });
        const res = await placeBet();
        if (res.ok) {
            onFilled(res);
        } else if (res.error?.toLowerCase().includes('agent wallet not approved')) {
            // No on-device agent yet — open the approval modal; its onSuccess retries.
            setNeedsAgent(true);
        } else {
            setResult({ kind: 'error', message: res.error || t.outcomeMarkets.errBet });
        }
        setSubmitting(false);
    };

    const handleAgentSuccess = async () => {
        setNeedsAgent(false);
        setSubmitting(true);
        setResult({ kind: 'idle' });
        const res = await placeBet();
        if (res.ok) {
            onFilled(res);
        } else {
            setResult({ kind: 'error', message: res.error || t.outcomeMarkets.errBet });
        }
        setSubmitting(false);
    };

    const { positions: outcomePositions } = useOutcomePositions();

    /** Open the trade sheet for a given outcome+side (used by position cards). */
    const openSheet = (outcomeId: number, sideIdx: number, side: 'buy' | 'sell' = 'buy') => {
        haptic.light();
        setSelectedId(outcomeId);
        setSelectedSideIdx(sideIdx);
        setTradeSide(side);
        setPct(50);
        setResult({ kind: 'idle' });
        setActiveTab('trade');
    };

    /** Which categories actually have markets — drives the filter chips. */
    const availableCats = useMemo(() => {
        const present = new Set(markets.map((m) => m.category));
        return CATS.filter((c) => present.has(c));
    }, [markets]);

    /**
     * Markets after category filter, sorted (actively-traded first), then
     * grouped by event. Groups appear in the order their best market scored.
     */
    const groups = useMemo(() => {
        // Rank by YES probability descending so favourites/most-likely lead
        // (e.g. World Cup contenders before 0% longshots).
        const score = (m: OutcomeMarketView) => m.sides[0]?.mid ?? 0;
        const filtered = markets
            .filter((m) => !cat || m.category === cat)
            .sort((a, b) => score(b) - score(a));
        const order: string[] = [];
        const byEvent = new Map<string, OutcomeMarketView[]>();
        for (const m of filtered) {
            if (!byEvent.has(m.eventName)) {
                byEvent.set(m.eventName, []);
                order.push(m.eventName);
            }
            byEvent.get(m.eventName)!.push(m);
        }
        return order.map((name) => ({ name, markets: byEvent.get(name)! }));
    }, [markets, cat]);

    if (loading && markets.length === 0) {
        return (
            <div style={{ padding: 80, textAlign: 'center', color: V2.t3, fontFamily: V2.ui }}>
                <Loader2 className="animate-spin inline-block mr-2" style={{ width: 18, height: 18 }} />
                {t.outcomeMarkets.loading}
            </div>
        );
    }

    if (markets.length === 0) {
        return (
            <div style={{ padding: '80px 22px', textAlign: 'center', color: V2.t3, fontSize: 14, fontFamily: V2.ui }}>
                {t.outcomeMarkets.empty}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: V2.ui, color: V2.t1 }}>
            {/* Balance + perp↔spot transfer bar — HIP-4 settles from Spot. */}
            <BalanceBar
                spot={spotUsdc}
                perp={perpAvailable}
                onTransfer={() => {
                    haptic.light();
                    setShowTransfer(true);
                }}
            />

            {/* Zero-fee perk chip */}
            <div
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '6px 12px',
                    background: V2.posSoft,
                    border: '1px solid rgba(34,197,94,0.22)',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 700,
                    color: V2.pos,
                    alignSelf: 'flex-start',
                }}
            >
                <Icon name="bolt" size={12} color={V2.pos} />
                {t.outcomeMarkets.zeroFee}
            </div>

            {/* Category filter */}
            {availableCats.length > 1 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }} className="v2-noscroll">
                    <CatChip label={t.outcomeMarkets.cat.all} active={cat === null} onClick={() => setCat(null)} />
                    {availableCats.map((c) => (
                        <CatChip
                            key={c}
                            label={t.outcomeMarkets.cat[c]}
                            active={cat === c}
                            onClick={() => setCat(c)}
                        />
                    ))}
                </div>
            )}

            {/* User's open positions — manage cards (see / add more / close), at top */}
            {outcomePositions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <EventHeader name={t.outcomeMarkets.positionsTitle} count={outcomePositions.length} />
                    {outcomePositions.map((p) => (
                        <OutcomePositionCard
                            key={p.coinRef}
                            position={p}
                            onManage={(pos) => openSheet(pos.outcomeId, pos.sideIdx, 'buy')}
                        />
                    ))}
                </div>
            )}

            {/* Grouped market list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {groups.map((g) => (
                    <div key={g.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {g.markets.length > 1 && <EventHeader name={g.name} count={g.markets.length} />}
                        {g.markets.map((m) => {
                            const pos0 = userPositions[outcomeCoinRef(m.outcomeId, 0)];
                            const pos1 = userPositions[outcomeCoinRef(m.outcomeId, 1)];
                            // For grouped multi-outcome events, the card title is the
                            // outcome (e.g. team) name; for standalones, its own name.
                            const grouped = g.markets.length > 1;
                            return (
                                <MarketCard
                                    key={m.outcomeId}
                                    market={m}
                                    grouped={grouped}
                                    selected={m.outcomeId === selectedId}
                                    onClick={() => {
                                        haptic.light();
                                        setSelectedId(m.outcomeId);
                                        setSelectedSideIdx(0);
                                        setTradeSide('buy');
                                        setPct(50);
                                        setResult({ kind: 'idle' });
                                        setActiveTab('trade');
                                    }}
                                    position={pos0 || pos1 || null}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Trade panel for the selected market (bottom sheet) */}
            <ModalSheet
                open={!!selected && !!selectedSide}
                onClose={() => {
                    setSelectedId(null);
                    setResult({ kind: 'idle' });
                    setActiveTab('trade');
                }}
            >
                {selected && selectedSide && (
                    <>
                        <ModalHeader
                            title={selected.eventName}
                            sub={selected.quoteToken}
                            onClose={() => {
                                setSelectedId(null);
                                setResult({ kind: 'idle' });
                                setActiveTab('trade');
                            }}
                        />
                        <div style={{ padding: '4px 18px 28px', fontFamily: V2.ui, color: V2.t1 }}>
                            {/* Market title inside the sheet */}
                            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 6 }}>
                                {selected.name}
                            </div>
                            {selected.description && (
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: V2.t3,
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
                                    const palette = SIDE_COLOR[idx as 0 | 1] || SIDE_COLOR[0];
                                    const active = selectedSideIdx === idx;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                haptic.light();
                                                setSelectedSideIdx(idx);
                                            }}
                                            style={{
                                                padding: '12px 10px',
                                                borderRadius: 12,
                                                border: active ? `1px solid ${palette.color}` : `1px solid ${V2.hair}`,
                                                background: active ? palette.soft : V2.card,
                                                color: active ? palette.color : V2.t2,
                                                fontWeight: 800,
                                                fontSize: 14,
                                                cursor: 'pointer',
                                                fontFamily: V2.ui,
                                            }}
                                        >
                                            <div>{s.name}</div>
                                            <div className="font-mono" style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                                                {(s.mid * 100).toFixed(1)}¢
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* At-a-glance spread / liquidity for the chosen side */}
                            <OutcomeSpread coinRef={selectedSide.coinRef} />

                            {/* Tab selector */}
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 4,
                                    padding: 4,
                                    borderRadius: 12,
                                    background: V2.card,
                                    marginBottom: 16,
                                }}
                            >
                                {(
                                    [
                                        { key: 'trade', label: t.outcomeMarkets.tabTrade },
                                        { key: 'chart', label: t.outcomeMarkets.tabChart },
                                        { key: 'book', label: t.outcomeMarkets.tabBook },
                                    ] as const
                                ).map((tab) => {
                                    const on = activeTab === tab.key;
                                    return (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            style={{
                                                flex: 1,
                                                padding: '8px 0',
                                                borderRadius: 9,
                                                fontSize: 12.5,
                                                fontWeight: 700,
                                                background: on ? V2.cardSolid : 'transparent',
                                                color: on ? V2.t1 : V2.t3,
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontFamily: V2.ui,
                                                transition: 'all 120ms ease',
                                            }}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {activeTab === 'trade' && (
                                <>
                                    {/* Buy / Sell toggle */}
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                                        {([
                                            ['buy', t.outcomeMarkets.buyTab, V2.pos, V2.posSoft] as const,
                                            ['sell', t.outcomeMarkets.sellTab, V2.neg, V2.negSoft] as const,
                                        ]).map(([k, label, c, soft]) => {
                                            const on = tradeSide === k;
                                            return (
                                                <button
                                                    key={k}
                                                    onClick={() => {
                                                        haptic.light();
                                                        setTradeSide(k);
                                                        setPct(50);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px 0',
                                                        borderRadius: 11,
                                                        border: on ? `1px solid ${c}` : `1px solid ${V2.hair}`,
                                                        background: on ? soft : V2.card,
                                                        color: on ? c : V2.t2,
                                                        fontWeight: 800,
                                                        fontSize: 14,
                                                        cursor: 'pointer',
                                                        fontFamily: V2.ui,
                                                    }}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Amount slider (% of balance for buy, % of held for sell) */}
                                    <div style={{ marginBottom: 18 }}>
                                        <SliderRow
                                            label={t.outcomeMarkets.amountLabel}
                                            valueText={`${Math.round(pct)}%`}
                                            pct={pct}
                                            min={0}
                                            max={100}
                                            step={1}
                                            value={pct}
                                            onChange={setPct}
                                            color={tradeSide === 'buy' ? V2.pos : V2.neg}
                                        />
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginTop: 14,
                                                fontSize: 12.5,
                                            }}
                                        >
                                            <span className="font-mono" style={{ color: V2.t2, fontWeight: 700 }}>
                                                {tradeSide === 'sell'
                                                    ? `${t.outcomeMarkets.value}: ${formatCurrency(totalCost, 2)}`
                                                    : `${t.outcomeMarkets.betAmountLabel}: ${formatCurrency(totalCost, 2)}`}
                                            </span>
                                            <span className="font-mono" style={{ color: V2.t3 }}>
                                                {tradeSide === 'sell'
                                                    ? t.outcomeMarkets.sellMax.replace('{n}', formatCurrency(heldContracts * price, 2))
                                                    : `${selected.quoteToken}: ${formatCurrency(quoteBalance, 2)}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div
                                        style={{
                                            background: V2.card,
                                            border: `1px solid ${V2.hair}`,
                                            borderRadius: 12,
                                            padding: '12px 14px',
                                            marginBottom: 14,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                        }}
                                    >
                                        {tradeSide === 'buy' ? (
                                            <>
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
                                                    color={potentialProfit >= 0 ? V2.pos : V2.neg}
                                                />
                                            </>
                                        ) : (
                                            <PreviewRow
                                                label={t.outcomeMarkets.value}
                                                value={`~${formatCurrency(totalCost, 2)} ${selected.quoteToken}`}
                                                color={V2.pos}
                                            />
                                        )}
                                    </div>

                                    {validationError && contractsNum > 0 && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 6,
                                                alignItems: 'center',
                                                fontSize: 12,
                                                color: V2.neg,
                                                marginBottom: 10,
                                            }}
                                        >
                                            <AlertCircle style={{ width: 12, height: 12 }} />
                                            {validationError}
                                        </div>
                                    )}

                                    {/* USDH onramp for USDH-quoted markets when balance is short */}
                                    {tradeSide === 'buy' && selected.quoteToken === 'USDH' && quoteBalance < 10 && (
                                        <UsdhOnramp buyUsdh={buyUsdh} needed={Math.max(20, Math.ceil(totalCost) + 5)} />
                                    )}

                                    {/* USDC markets: if Spot is short but funds sit in Perp,
                                        offer a one-tap move into the Spot balance. */}
                                    {tradeSide === 'buy' &&
                                        selected.quoteToken === 'USDC' &&
                                        totalCost > quoteBalance &&
                                        perpAvailable > 0 && (
                                            <button
                                                onClick={() => {
                                                    haptic.light();
                                                    setShowTransfer(true);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    marginBottom: 10,
                                                    padding: '11px 14px',
                                                    background: V2.accentSoft,
                                                    border: '1px solid rgba(250,204,21,0.22)',
                                                    borderRadius: 12,
                                                    color: V2.t1,
                                                    fontWeight: 700,
                                                    fontSize: 13.5,
                                                    cursor: 'pointer',
                                                    fontFamily: V2.ui,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 8,
                                                }}
                                            >
                                                <ArrowLeftRight style={{ width: 14, height: 14, color: V2.accent }} />
                                                {t.outcomeMarkets.transferFromPerp}
                                            </button>
                                        )}

                                    {result.kind === 'error' && (
                                        <div
                                            style={{
                                                background: V2.negSoft,
                                                border: '1px solid rgba(239,68,68,0.3)',
                                                borderRadius: 12,
                                                padding: '10px 12px',
                                                fontSize: 14,
                                                color: V2.neg,
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
                                            padding: 15,
                                            background: canSubmit
                                                ? tradeSide === 'sell'
                                                    ? V2.neg
                                                    : (SIDE_COLOR[selectedSideIdx as 0 | 1] || SIDE_COLOR[0]).color
                                                : V2.card,
                                            border: 'none',
                                            borderRadius: 14,
                                            color: canSubmit ? '#fff' : V2.t3,
                                            fontWeight: 800,
                                            fontSize: 15,
                                            cursor: canSubmit ? 'pointer' : 'not-allowed',
                                            fontFamily: V2.ui,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                                                {t.outcomeMarkets.betting}
                                            </>
                                        ) : tradeSide === 'sell' ? (
                                            `${t.outcomeMarkets.sellTab} (${formatCurrency(totalCost, 2)})`
                                        ) : (
                                            t.outcomeMarkets.placeBetCta
                                                .replace('{amount}', formatCurrency(totalCost, 2))
                                                .replace('{side}', selectedSide.name)
                                        )}
                                    </button>
                                </>
                            )}

                            {activeTab === 'chart' && (
                                <div style={{ marginTop: 4 }}>
                                    <TokenCandleChart symbol={selectedSide.coinRef} height={220} />
                                </div>
                            )}

                            {activeTab === 'book' && (
                                <div
                                    style={{
                                        height: 280,
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        border: `1px solid ${V2.hair}`,
                                        background: V2.card,
                                        marginTop: 4,
                                    }}
                                >
                                    <OrderBook symbol={selectedSide.coinRef} levels={5} />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </ModalSheet>

            {/* Agent approval — auto-opened when an outcome order fails because
                no on-device agent exists. After success the bet retries. */}
            <ApproveAgentModal open={needsAgent} onClose={() => setNeedsAgent(false)} onSuccess={handleAgentSuccess} />

            {/* Perp ↔ spot USDC transfer. Defaults to Trade → Predicción
                (perp → spot) — the direction users need to fund bets — and
                uses retail-friendly pocket names instead of perp/spot jargon. */}
            <TransferModal
                isOpen={showTransfer}
                onClose={() => setShowTransfer(false)}
                defaultToPerp={false}
                spotLabel={t.outcomeMarkets.spotBalanceLabel}
                perpLabel={t.outcomeMarkets.perpBalanceLabel}
                helpText={t.outcomeMarkets.transferHelp}
            />

            {/* Full-screen confirmation animation (shared with perps). */}
            <TradeSuccessSheet
                open={!!success}
                onClose={() => setSuccess(null)}
                side={success?.side || 'buy'}
                symbol=""
                tokenAmount={success?.contracts || 0}
                usdAmount={success?.usd || 0}
                formatCurrency={formatCurrency}
                eyebrow={success?.side === 'sell' ? t.outcomeMarkets.successSell : t.outcomeMarkets.successBet}
                pillText={success ? `${success.marketName} · ${success.sideName}` : undefined}
                summaryTitle={
                    success?.side === 'sell'
                        ? t.outcomeMarkets.sheetSellTitle
                        : t.outcomeMarkets.sheetBetTitle.replace('{side}', success?.sideName || '')
                }
                summarySub={
                    success?.side === 'sell'
                        ? t.outcomeMarkets.sheetSellSub
                              .replace('{side}', success?.sideName || '')
                              .replace('{amount}', formatCurrency(success?.usd || 0, 2))
                        : t.outcomeMarkets.sheetBetSub.replace('{amount}', formatCurrency(success?.contracts || 0, 2))
                }
            />
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────────────
function CatChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                flexShrink: 0,
                padding: '7px 14px',
                borderRadius: 99,
                border: active ? 'none' : `1px solid ${V2.hair}`,
                background: active ? V2.accent : V2.card,
                color: active ? '#1A1304' : V2.t2,
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
                fontFamily: V2.ui,
                whiteSpace: 'nowrap',
            }}
        >
            {label}
        </button>
    );
}

function BalanceBar({ spot, perp, onTransfer }: { spot: number; perp: number; onTransfer: () => void }) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                background: V2.card,
                border: `1px solid ${V2.hair}`,
                borderRadius: 14,
            }}
        >
            <div style={{ flex: 1, display: 'flex', gap: 20 }}>
                <div>
                    <div style={{ fontSize: 10.5, color: V2.t3, fontWeight: 600 }}>{t.outcomeMarkets.spotBalanceLabel}</div>
                    <div className="font-mono" style={{ fontSize: 16, fontWeight: 800, color: V2.t1 }}>
                        {formatCurrency(spot, 2)}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 10.5, color: V2.t3, fontWeight: 600 }}>{t.outcomeMarkets.perpBalanceLabel}</div>
                    <div className="font-mono" style={{ fontSize: 16, fontWeight: 800, color: V2.t2 }}>
                        {formatCurrency(perp, 2)}
                    </div>
                </div>
            </div>
            <button
                onClick={onTransfer}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 14px',
                    background: V2.accent,
                    color: V2.accentInk,
                    border: 'none',
                    borderRadius: 11,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: V2.ui,
                    flexShrink: 0,
                }}
            >
                <ArrowLeftRight style={{ width: 14, height: 14 }} />
                {t.outcomeMarkets.transferCta}
            </button>
        </div>
    );
}

/**
 * At-a-glance best bid/ask + spread + top-of-book size for an outcome side.
 * Polls l2Book directly (5s) so users see the spread without opening the
 * full order-book tab.
 */
function OutcomeSpread({ coinRef }: { coinRef: string }) {
    const { t } = useLanguage();
    const [book, setBook] = useState<{ bid: number; ask: number; bidSz: number; askSz: number } | null>(null);

    useEffect(() => {
        let alive = true;
        const fetchBook = async () => {
            try {
                const res = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'l2Book', coin: coinRef }),
                });
                const data = await res.json();
                const bids = data?.levels?.[0] || [];
                const asks = data?.levels?.[1] || [];
                if (!alive) return;
                if (bids[0] && asks[0]) {
                    setBook({
                        bid: parseFloat(bids[0].px),
                        ask: parseFloat(asks[0].px),
                        bidSz: parseFloat(bids[0].sz),
                        askSz: parseFloat(asks[0].sz),
                    });
                } else {
                    setBook(null);
                }
            } catch {
                /* transient — keep last value */
            }
        };
        fetchBook();
        const id = setInterval(fetchBook, 5000);
        return () => {
            alive = false;
            clearInterval(id);
        };
    }, [coinRef]);

    if (!book) return null;
    const spread = book.ask - book.bid;
    const spreadPct = book.ask > 0 ? (spread / book.ask) * 100 : 0;
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: V2.card,
                border: `1px solid ${V2.hair}`,
                borderRadius: 12,
                marginBottom: 14,
            }}
        >
            <SpreadCell label={t.outcomeMarkets.bidLabel} value={`${(book.bid * 100).toFixed(1)}¢`} color={V2.pos} sub={book.bidSz.toFixed(0)} />
            <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: V2.t3, fontWeight: 600 }}>{t.outcomeMarkets.spreadLabel}</div>
                <div className="font-mono" style={{ fontSize: 13, fontWeight: 800, color: V2.t1 }}>
                    {(spread * 100).toFixed(1)}¢ · {spreadPct.toFixed(1)}%
                </div>
            </div>
            <SpreadCell label={t.outcomeMarkets.askLabel} value={`${(book.ask * 100).toFixed(1)}¢`} color={V2.neg} sub={book.askSz.toFixed(0)} align="right" />
        </div>
    );
}

function SpreadCell({
    label,
    value,
    color,
    sub,
    align,
}: {
    label: string;
    value: string;
    color: string;
    sub: string;
    align?: 'right';
}) {
    return (
        <div style={{ textAlign: align || 'left', minWidth: 52 }}>
            <div style={{ fontSize: 10, color: V2.t3, fontWeight: 600 }}>{label}</div>
            <div className="font-mono" style={{ fontSize: 14, fontWeight: 800, color }}>
                {value}
            </div>
            <div className="font-mono" style={{ fontSize: 9.5, color: V2.t3 }}>{sub}</div>
        </div>
    );
}

function EventHeader({ name, count }: { name: string; count: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 2 }}>
            <span style={{ width: 3, height: 15, borderRadius: 99, background: V2.accent, flexShrink: 0 }} />
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', color: V2.t1, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {name}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: V2.t3, flexShrink: 0 }}>{count}</span>
        </div>
    );
}

function MarketCard({
    market,
    grouped,
    selected,
    onClick,
    position,
}: {
    market: OutcomeMarketView;
    grouped: boolean;
    selected: boolean;
    onClick: () => void;
    position: { outcomeId: number; sideIdx: number; amount: number } | null;
}) {
    const sideYes = market.sides[0];
    const sideNo = market.sides[1];

    return (
        <button
            onClick={onClick}
            style={{
                textAlign: 'left',
                padding: '14px 16px',
                background: selected ? V2.accentSoft : V2.card,
                border: selected ? `1px solid rgba(250,204,21,0.4)` : `1px solid ${V2.hair}`,
                borderRadius: 14,
                cursor: 'pointer',
                fontFamily: V2.ui,
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
                        fontSize: 14,
                        fontWeight: 700,
                        color: V2.t1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {market.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 11 }}>
                    <SidePill label={sideYes?.name || 'Yes'} pct={sideYes?.mid ?? 0.5} sideIdx={0} />
                    <SidePill label={sideNo?.name || 'No'} pct={sideNo?.mid ?? 0.5} sideIdx={1} />
                    {!grouped && (
                        <span
                            style={{
                                fontSize: 9,
                                color: V2.t3,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                            }}
                        >
                            {market.quoteToken}
                        </span>
                    )}
                </div>
                {position && (
                    <div
                        className="font-mono"
                        style={{
                            marginTop: 6,
                            fontSize: 10,
                            color: position.sideIdx === 0 ? V2.pos : V2.neg,
                            fontWeight: 700,
                        }}
                    >
                        ▸ {position.amount.toFixed(0)} {market.sides[position.sideIdx]?.name || ''}
                    </div>
                )}
            </div>
            <ChevronRight style={{ width: 16, height: 16, color: V2.t3, flexShrink: 0 }} />
        </button>
    );
}

function SidePill({ label, pct, sideIdx }: { label: string; pct: number; sideIdx: number }) {
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
            <span className="font-mono" style={{ opacity: 0.85 }}>
                {(pct * 100).toFixed(0)}%
            </span>
        </span>
    );
}

function PreviewRow({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: V2.t3 }}>{label}</span>
            <span className="font-mono" style={{ fontWeight: 700, color: color || V2.t1 }}>
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
                background: V2.accentSoft,
                border: '1px solid rgba(250,204,21,0.22)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 10,
            }}
        >
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{t.outcomeMarkets.buyUsdhTitle}</div>
            <div style={{ fontSize: 12, color: V2.t2, lineHeight: 1.4, marginBottom: 10 }}>
                {t.outcomeMarkets.buyUsdhBody}
            </div>
            {err && <div style={{ fontSize: 11, color: V2.neg, marginBottom: 8 }}>{err}</div>}
            <button
                onClick={async () => {
                    haptic.light();
                    setBusy(true);
                    setErr(null);
                    const r = await buyUsdh(needed);
                    if (!r.filled) setErr(r.error || 'Failed');
                    setBusy(false);
                }}
                disabled={busy}
                style={{
                    width: '100%',
                    padding: 11,
                    border: 'none',
                    background: V2.accent,
                    color: '#1A1304',
                    fontWeight: 800,
                    fontSize: 14,
                    borderRadius: 12,
                    cursor: busy ? 'wait' : 'pointer',
                    fontFamily: V2.ui,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                }}
            >
                {busy ? (
                    <>
                        <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                        {t.outcomeMarkets.buying}
                    </>
                ) : (
                    <>
                        <TrendingUp style={{ width: 14, height: 14 }} />
                        {t.outcomeMarkets.buyUsdhAction.replace('{amount}', needed.toString())}
                    </>
                )}
            </button>
        </div>
    );
}

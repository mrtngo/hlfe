'use client';

/**
 * OutcomeMarketsScreen — HIP-4 prediction markets browser + bet flow (v2).
 *
 * HIP-4 markets are binary outcomes (Yes/No, or per-side labels like
 * Lions/Bills):
 *  - prices live in (0,1) and represent implied probability
 *  - sizes are whole contracts (szDecimals=0)
 *  - settlement is in market.quoteToken (USDC across mainnet today)
 *  - "you hold" derived from spotBalances entries whose coin starts "+"
 *    (HL exposes outcome positions in the spot ledger)
 *
 * Titles, side labels and detail lines are rendered from each market's
 * deployer template (see outcome-templates.ts) — HL ships template ids, not
 * prose. Markets are grouped by event — a parent question, or a price "ladder"
 * of rungs a deployer listed on one asset and expiry — and one event is one
 * card (PredictionEventCard).
 *
 * Board ordering
 * ──────────────
 * Ranking by probability, as this screen once did, floats dead 1% longshots to
 * the top and buries the BTC book doing $1M a day. The default sort is 24h
 * volume from /api/predictions/stats — the same choice Outcome.xyz makes —
 * with "closing soon" and "most likely" as alternates. When the stats route is
 * unreachable the board silently falls back to probability ordering.
 *
 * Betting
 * ───────
 * The amount control is money, not a percentage of balance: a beginner knows
 * they want to risk $10, not "37% of the Predicción pocket". Contracts are
 * derived from the amount, and the sheet always states what a win pays before
 * the confirm gesture.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeftRight, Loader2, TrendingUp } from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { useOutcomeMarkets } from '@/hooks/useOutcomeMarkets';
import { usePredictionInsights } from '@/hooks/usePredictionInsights';
import {
    oddsMultiplier,
    localizeSideName,
    type OutcomeCategory,
    type OutcomeMarketView,
    type OutcomeSideView,
} from '@/lib/hyperliquid/outcome';
import { API_URL } from '@/lib/hyperliquid/client';
import { useOutcomePositions } from '@/hooks/useOutcomePositions';
import { ModalSheet, ModalHeader } from '@/components/ModalSheet';
import ApproveAgentModal from '@/components/ApproveAgentModal';
import TransferModal from '@/components/TransferModal';
import TokenCandleChart from '@/components/TokenCandleChart';
import OrderBook from '@/components/OrderBook';
import OutcomePositionCard from '@/components/OutcomePositionCard';
import TradeSuccessSheet from '@/components/TradeSuccessSheet';
import PredictionEventCard, { type HeldSide, type PredictionGroup } from '@/components/PredictionEventCard';
import { Icon, SliderRow, SlideToConfirm, V2 } from '@/components/V2Kit';
import { haptic } from '@/lib/haptics';

// Side palette — green for the "positive" side (Yes / Change / first side),
// red for the "negative" (No / No-Change / second side).
const SIDE_COLOR = {
    0: { color: V2.pos, soft: V2.posSoft, border: 'rgba(34,197,94,0.3)' },
    1: { color: V2.neg, soft: V2.negSoft, border: 'rgba(239,68,68,0.3)' },
} as const;

const CATS: OutcomeCategory[] = ['sports', 'economy', 'politics', 'crypto', 'other'];

type SortMode = 'popular' | 'soon' | 'odds';

/** HL rejects outcome orders below this notional. */
const MIN_NOTIONAL = 10;
/** Starter bet the sheet opens on, when the balance covers it. */
const DEFAULT_BET = 25;
/** Quick-amount chips, in quote-token units. */
const QUICK_AMOUNTS = [10, 25, 50, 100];

const HELP_DISMISSED_KEY = 'rayo_predictions_help_v1';

/** Accent-insensitive contains, for the search box. */
function fold(s: string): string {
    return (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

export default function OutcomeMarketsScreen() {
    const { t, language } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { markets, loading } = useOutcomeMarkets();
    const { stats, poly, statsReady } = usePredictionInsights(markets);
    const { spotBalances, placeOutcomeOrder, buyUsdh, account } = useHyperliquid();
    /** Perp ↔ spot transfer modal. HIP-4 settles from the SPOT balance. */
    const [showTransfer, setShowTransfer] = useState(false);

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [selectedSideIdx, setSelectedSideIdx] = useState<number>(0);
    /** Buy (open / add) vs sell (reduce / close). */
    const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
    /** Stake in quote-token units — what the user is actually risking. */
    const [amount, setAmount] = useState<number>(DEFAULT_BET);
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

    // ── Board controls ──────────────────────────────────────────────
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortMode>('popular');
    /** Category filter — null = all. */
    const [cat, setCat] = useState<OutcomeCategory | null>(null);
    /** Deployer-venue filter (`out` / `txyz` / `skew`) — null = all. */
    const [venue, setVenue] = useState<string | null>(null);
    const [showVenues, setShowVenues] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    /** Ticks the countdowns. 30s is plenty — cards show minutes at finest. */
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        try {
            setShowHelp(localStorage.getItem(HELP_DISMISSED_KEY) !== '1');
        } catch {
            setShowHelp(true);
        }
    }, []);

    const dismissHelp = () => {
        haptic.light();
        setShowHelp(false);
        try {
            localStorage.setItem(HELP_DISMISSED_KEY, '1');
        } catch {
            /* private mode — the card just comes back next session */
        }
    };

    const selected = useMemo<OutcomeMarketView | null>(
        () => markets.find((m) => m.outcomeId === selectedId) || null,
        [markets, selectedId],
    );
    const selectedSide: OutcomeSideView | null = selected?.sides[selectedSideIdx] || null;

    /**
     * User's open positions across HIP-4 markets, derived from spotBalances
     * entries whose coin starts with "+" (HL stores outcome holdings in the
     * spot clearinghouse as "+{10*outcome+side}"). Keyed `outcomeId:sideIdx`
     * so cards can look up a specific side.
     */
    const held = useMemo(() => {
        const positions: Record<string, HeldSide> = {};
        (spotBalances || []).forEach((b) => {
            if (!b.coin.startsWith('+')) return;
            const n = parseInt(b.coin.slice(1), 10);
            if (!Number.isFinite(n)) return;
            const amount = parseFloat(b.total) || 0;
            if (amount <= 0) return;
            const outcomeId = Math.floor(n / 10);
            const sideIdx = n % 10;
            positions[`${outcomeId}:${sideIdx}`] = { outcomeId, sideIdx, amount };
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
        const p = held[`${selected.outcomeId}:${selectedSideIdx}`];
        return p ? Math.floor(p.amount) : 0;
    }, [selected, selectedSideIdx, held]);

    const price = selectedSide?.mid ?? 0;
    /** Live top of book for the chosen side — powers the spread row and the
     *  thin-liquidity warning below the amount. */
    const book = useOutcomeBook(selectedSide?.coinRef);

    /** Ceiling on the stake: the balance when buying, the position when selling. */
    const maxStake = tradeSide === 'sell' ? heldContracts * price : quoteBalance;

    // Whole contracts the stake buys. HIP-4 sizes are integers, so the real
    // spend is usually a little under the slider figure — every number shown
    // below is derived from the contracts, never from the raw amount.
    const contractsNum = useMemo(() => {
        if (price <= 0) return 0;
        const raw = Math.floor(amount / price);
        return tradeSide === 'sell' ? Math.min(raw, heldContracts) : raw;
    }, [amount, price, tradeSide, heldContracts]);

    const totalCost = contractsNum * price; // buy: spend; sell: proceeds
    const potentialPayout = contractsNum; // a winning contract settles at $1
    const potentialProfit = potentialPayout - totalCost;

    /** True when the resting book can't fill this size at the shown price. */
    const thinBook = useMemo(() => {
        if (!book || contractsNum <= 0) return false;
        const available = tradeSide === 'buy' ? book.askSz : book.bidSz;
        return available > 0 && available < contractsNum;
    }, [book, contractsNum, tradeSide]);

    const validationError = (() => {
        if (!selected || !selectedSide) return null;
        if (tradeSide === 'sell') {
            if (heldContracts < 1) return t.outcomeMarkets.noToSell;
            if (contractsNum < 1) return t.outcomeMarkets.minContracts;
            return null;
        }
        if (contractsNum < 1) return t.outcomeMarkets.minContracts;
        if (totalCost < MIN_NOTIONAL)
            return t.outcomeMarkets.minNotional.replace('{amount}', String(MIN_NOTIONAL));
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

    /** Fire the confirmation animation, reset the stake, close the trade sheet. */
    const onFilled = (res: { filledSize?: number; filledPrice?: number }) => {
        if (!selected || !selectedSide) return;
        const filledSz = res.filledSize && res.filledSize > 0 ? res.filledSize : contractsNum;
        const filledPx = res.filledPrice && res.filledPrice > 0 ? res.filledPrice : price;
        setSuccess({
            side: tradeSide,
            usd: filledSz * filledPx,
            contracts: filledSz,
            sideName: localizeSideName(selectedSide.name, language),
            marketName: selected.name,
        });
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

    /** Open the bet sheet for a given outcome+side. */
    const openSheet = useCallback(
        (outcomeId: number, sideIdx: number, side: 'buy' | 'sell' = 'buy') => {
            haptic.light();
            setSelectedId(outcomeId);
            setSelectedSideIdx(sideIdx);
            setTradeSide(side);
            setResult({ kind: 'idle' });
            setActiveTab('trade');
        },
        [],
    );

    // Opening the sheet (or flipping buy↔sell) reseeds the stake: a starter bet
    // the balance actually covers, or the whole position when selling.
    useEffect(() => {
        if (!selected) return;
        setAmount(
            tradeSide === 'sell'
                ? heldContracts * price
                : Math.max(0, Math.min(DEFAULT_BET, quoteBalance)),
        );
        // Reseed only on a new market/side/direction, not on every price tick.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, selectedSideIdx, tradeSide]);

    const closeSheet = () => {
        setSelectedId(null);
        setResult({ kind: 'idle' });
        setActiveTab('trade');
    };

    /** Which categories actually have markets — drives the filter chips. */
    const availableCats = useMemo(() => {
        const present = new Set(markets.map((m) => m.category));
        return CATS.filter((c) => present.has(c));
    }, [markets]);

    /**
     * Deployers with live markets, most-listed first. HIP-4 markets come from
     * independent venues (Outcome, Trade.xyz, Skew) and a bettor generally
     * wants to know — and sometimes to pick — whose book they're taking.
     */
    const availableVenues = useMemo(() => {
        const count = new Map<string, { venue: string; name: string; n: number }>();
        for (const m of markets) {
            if (!m.venue) continue;
            const e = count.get(m.venue) || { venue: m.venue, name: m.venueName, n: 0 };
            e.n += 1;
            count.set(m.venue, e);
        }
        return [...count.values()].sort((a, b) => b.n - a.n);
    }, [markets]);

    /**
     * Markets after the filters, grouped into events and ordered by the chosen
     * sort. Grouping keys on `groupKey`, not the display name — two events can
     * render the same label (same asset and deployer, different expiry) and
     * must stay separate.
     */
    const groups = useMemo<PredictionGroup[]>(() => {
        const q = fold(query.trim());
        const filtered = markets.filter((m) => {
            if (cat && m.category !== cat) return false;
            if (venue && m.venue !== venue) return false;
            if (!q) return true;
            const haystack = fold(
                [m.eventName, m.name, m.subject, m.venueName, ...m.sides.map((s) => s.name)].join(' '),
            );
            return haystack.includes(q);
        });

        const byEvent = new Map<string, OutcomeMarketView[]>();
        for (const m of filtered) {
            const bucket = byEvent.get(m.groupKey);
            if (bucket) bucket.push(m);
            else byEvent.set(m.groupKey, [m]);
        }

        const built: PredictionGroup[] = [...byEvent.entries()].map(([key, group]) => {
            // A price ladder reads as a ladder: order the rungs by threshold
            // rather than by probability. Everything else leads with favourites.
            if (group.length > 1 && group.every((m) => m.ladderValue !== null)) {
                group.sort((a, b) => a.ladderValue! - b.ladderValue!);
            } else if (group.length > 1) {
                group.sort((a, b) => (b.sides[0]?.mid ?? 0) - (a.sides[0]?.mid ?? 0));
            }
            const sameVenue = group.every((m) => m.venue === group[0].venue);
            return {
                key,
                name: group.length > 1 ? group[0].eventName : group[0].name,
                markets: group,
                venueName: sameVenue ? group[0].venueName : undefined,
            };
        });

        // An event's pull is what actually traded through it. Resting depth is
        // deliberately NOT part of this: one market parks tens of millions at
        // prices nobody will hit, and ranking on that puts a ghost on top.
        // Markets the stats sweep hasn't reached yet score 0 and fall back to
        // probability ordering below.
        const volumeOf = (g: PredictionGroup) =>
            g.markets.reduce((s, m) => s + (stats[m.outcomeId]?.v || 0), 0);
        const closesAt = (g: PredictionGroup) => {
            const times = g.markets
                .map((m) => m.closeTime?.getTime())
                .filter((t): t is number => typeof t === 'number' && t > now);
            return times.length > 0 ? Math.min(...times) : Infinity;
        };
        const bestOdds = (g: PredictionGroup) =>
            Math.max(...g.markets.map((m) => m.sides[0]?.mid ?? 0));

        if (sort === 'soon') {
            built.sort((a, b) => closesAt(a) - closesAt(b) || volumeOf(b) - volumeOf(a));
        } else if (sort === 'odds') {
            built.sort((a, b) => bestOdds(b) - bestOdds(a));
        } else {
            // Popular. Until the stats route answers, every figure is 0 and this
            // degrades to probability ordering rather than to random order.
            built.sort((a, b) => volumeOf(b) - volumeOf(a) || bestOdds(b) - bestOdds(a));
        }
        return built;
    }, [markets, cat, venue, query, sort, stats, now]);

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: V2.ui, color: V2.t1 }}>
            {/* Balance + perp↔spot transfer bar — HIP-4 settles from Spot. */}
            <BalanceBar
                spot={spotUsdc}
                perp={perpAvailable}
                onTransfer={() => {
                    haptic.light();
                    setShowTransfer(true);
                }}
            />

            {/* First-run explainer. Prediction markets are the one screen in the
                app whose mechanics aren't self-evident from the UI. */}
            {showHelp ? (
                <HowItWorks onDismiss={dismissHelp} />
            ) : (
                <button
                    onClick={() => {
                        haptic.light();
                        setShowHelp(true);
                    }}
                    style={{
                        alignSelf: 'flex-start',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: 0,
                        background: 'transparent',
                        border: 'none',
                        color: V2.t3,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: V2.ui,
                    }}
                >
                    <Icon name="info" size={13} color={V2.t3} />
                    {t.outcomeMarkets.helpTitle}
                </button>
            )}

            {/* Search */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '10px 13px',
                    background: V2.card,
                    border: `1px solid ${V2.hair}`,
                    borderRadius: 12,
                }}
            >
                <Icon name="search" size={15} color={V2.t3} />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.outcomeMarkets.searchPlaceholder}
                    style={{
                        flex: 1,
                        minWidth: 0,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: V2.t1,
                        fontSize: 14,
                        fontFamily: V2.ui,
                    }}
                />
                {query && (
                    <button
                        onClick={() => setQuery('')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: V2.t3,
                            fontSize: 16,
                            cursor: 'pointer',
                            lineHeight: 1,
                        }}
                        aria-label={t.outcomeMarkets.cancel}
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Sort */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }} className="v2-noscroll">
                {(
                    [
                        ['popular', t.outcomeMarkets.sortPopular],
                        ['soon', t.outcomeMarkets.sortSoon],
                        ['odds', t.outcomeMarkets.sortOdds],
                    ] as const
                ).map(([key, label]) => (
                    <CatChip
                        key={key}
                        label={label}
                        active={sort === key}
                        onClick={() => {
                            haptic.light();
                            setSort(key);
                        }}
                    />
                ))}
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
                    {availableVenues.length > 1 && (
                        <CatChip
                            label={venue ? venueNameOf(availableVenues, venue) : t.outcomeMarkets.venueLabel}
                            active={venue !== null}
                            onClick={() => {
                                haptic.light();
                                setShowVenues((v) => !v);
                            }}
                        />
                    )}
                </div>
            )}

            {/* Deployer filter — which venue launched the market. Tucked behind
                the "Casa" chip: useful, but not a first-glance decision. */}
            {showVenues && availableVenues.length > 1 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }} className="v2-noscroll">
                    <CatChip label={t.outcomeMarkets.cat.all} active={venue === null} onClick={() => setVenue(null)} />
                    {availableVenues.map((v) => (
                        <CatChip
                            key={v.venue}
                            label={`${v.name} (${v.n})`}
                            active={venue === v.venue}
                            onClick={() => setVenue(v.venue)}
                        />
                    ))}
                </div>
            )}

            {/* User's open positions — manage cards (see / add more / close), at top */}
            {outcomePositions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <SectionLabel text={t.outcomeMarkets.positionsTitle} count={outcomePositions.length} />
                    {outcomePositions.map((p) => (
                        <OutcomePositionCard
                            key={p.coinRef}
                            position={p}
                            onManage={(pos) => openSheet(pos.outcomeId, pos.sideIdx, 'buy')}
                        />
                    ))}
                </div>
            )}

            {/* The board */}
            {groups.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: V2.t3, fontSize: 13.5 }}>
                    {t.outcomeMarkets.noResults}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!statsReady && sort === 'popular' && (
                        <div style={{ fontSize: 11, color: V2.t3, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Loader2 className="animate-spin" style={{ width: 11, height: 11 }} />
                            {t.outcomeMarkets.rankingLoading}
                        </div>
                    )}
                    {groups.map((g) => (
                        <PredictionEventCard
                            key={g.key}
                            group={g}
                            stats={stats}
                            poly={poly}
                            held={held}
                            onBet={(outcomeId, sideIdx) => openSheet(outcomeId, sideIdx, 'buy')}
                            now={now}
                        />
                    ))}
                </div>
            )}

            {/* Bet panel for the selected market (bottom sheet) */}
            <ModalSheet open={!!selected && !!selectedSide} onClose={closeSheet}>
                {selected && selectedSide && (
                    <>
                        <ModalHeader
                            title={selected.eventName}
                            sub={[selected.venueName, selected.quoteToken].filter(Boolean).join(' · ')}
                            onClose={closeSheet}
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

                            {/* Side selector — probability leads, payout follows */}
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
                                    const p = s.mid > 0 && s.mid < 1 ? Math.round(s.mid * 100) : null;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                haptic.light();
                                                setSelectedSideIdx(idx);
                                            }}
                                            style={{
                                                padding: '11px 10px',
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
                                            <div>{localizeSideName(s.name, language)}</div>
                                            <div className="font-mono" style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>
                                                {p === null ? '—' : `${p}%`}
                                            </div>
                                            <div className="font-mono" style={{ fontSize: 10.5, opacity: 0.7, marginTop: 1 }}>
                                                {t.outcomeMarkets.paysMultiplier.replace('{x}', oddsMultiplier(s.mid))}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* At-a-glance spread / liquidity for the chosen side */}
                            <OutcomeSpread book={book} />

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

                                    {/* Stake — money first. Quick chips do the work; the
                                        slider is there for anything in between. */}
                                    <StakePicker
                                        label={
                                            tradeSide === 'sell'
                                                ? t.outcomeMarkets.sellAmountLabel
                                                : t.outcomeMarkets.amountLabel
                                        }
                                        amount={amount}
                                        onChange={setAmount}
                                        max={maxStake}
                                        color={tradeSide === 'buy' ? V2.pos : V2.neg}
                                        balanceNote={
                                            tradeSide === 'sell'
                                                ? t.outcomeMarkets.sellMax.replace(
                                                      '{n}',
                                                      formatCurrency(heldContracts * price, 2),
                                                  )
                                                : `${selected.quoteToken}: ${formatCurrency(quoteBalance, 2)}`
                                        }
                                        emptyHint={
                                            tradeSide === 'sell'
                                                ? t.outcomeMarkets.noToSell
                                                : t.outcomeMarkets.needFunds
                                        }
                                    />

                                    {/* What actually happens if they're right.
                                        Hidden with nothing to stake — a column
                                        of $0.00 rows under "you have no funds"
                                        says nothing the hint didn't. */}
                                    {maxStake > 0 && (
                                    <div
                                        style={{
                                            background: V2.card,
                                            border: `1px solid ${V2.hair}`,
                                            borderRadius: 12,
                                            padding: '12px 14px',
                                            margin: '14px 0',
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
                                                    label={t.outcomeMarkets.contractsLabel}
                                                    value={String(contractsNum)}
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
                                            <>
                                                <PreviewRow
                                                    label={t.outcomeMarkets.contractsLabel}
                                                    value={String(contractsNum)}
                                                />
                                                <PreviewRow
                                                    label={t.outcomeMarkets.value}
                                                    value={`~${formatCurrency(totalCost, 2)} ${selected.quoteToken}`}
                                                    color={V2.pos}
                                                />
                                            </>
                                        )}
                                    </div>
                                    )}

                                    {thinBook && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 6,
                                                alignItems: 'flex-start',
                                                fontSize: 11.5,
                                                lineHeight: 1.4,
                                                color: V2.accent,
                                                marginBottom: 10,
                                            }}
                                        >
                                            <AlertCircle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 2 }} />
                                            {t.outcomeMarkets.thinBook}
                                        </div>
                                    )}

                                    {validationError && maxStake > 0 && (
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
                                    {tradeSide === 'buy' && selected.quoteToken === 'USDH' && quoteBalance < MIN_NOTIONAL && (
                                        <UsdhOnramp buyUsdh={buyUsdh} needed={Math.max(20, Math.ceil(totalCost) + 5)} />
                                    )}

                                    {/* USDC markets: if Spot is short but funds sit in Perp,
                                        offer a one-tap move into the Spot balance. */}
                                    {tradeSide === 'buy' &&
                                        selected.quoteToken === 'USDC' &&
                                        (totalCost > quoteBalance || quoteBalance <= 0) &&
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
                                                    border: '1px solid rgba(227,179,76,0.22)',
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

                                    {/* CTA — swipe to confirm, same gesture as perps */}
                                    {(() => {
                                        const pal = tradeSide === 'sell'
                                            ? { color: V2.neg, soft: V2.negSoft, border: 'rgba(239,68,68,0.3)' }
                                            : (SIDE_COLOR[selectedSideIdx as 0 | 1] || SIDE_COLOR[0]);
                                        const label = submitting
                                            ? t.outcomeMarkets.betting
                                            : tradeSide === 'sell'
                                                ? `${t.outcomeMarkets.sellTab} (${formatCurrency(totalCost, 2)})`
                                                : t.outcomeMarkets.placeBetCta
                                                    .replace('{amount}', formatCurrency(totalCost, 2))
                                                    .replace('{side}', localizeSideName(selectedSide.name, language));
                                        return (
                                            <SlideToConfirm
                                                color={pal.color}
                                                soft={pal.soft}
                                                border={pal.border}
                                                label={label}
                                                disabled={!canSubmit}
                                                onConfirm={handleBet}
                                            />
                                        );
                                    })()}
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

function venueNameOf(venues: { venue: string; name: string }[], code: string): string {
    return venues.find((v) => v.venue === code)?.name || code;
}

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
                color: active ? V2.accentInk : V2.t2,
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

function SectionLabel({ text, count }: { text: string; count?: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 2 }}>
            <span style={{ width: 3, height: 15, borderRadius: 99, background: V2.accent, flexShrink: 0 }} />
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', color: V2.t1, flex: 1 }}>{text}</div>
            {count !== undefined && (
                <span style={{ fontSize: 11, fontWeight: 700, color: V2.t3 }}>{count}</span>
            )}
        </div>
    );
}

/**
 * First-run explainer. Three sentences covering the whole mental model:
 * a contract pays $1, its price IS the probability, and you can sell early.
 * Dismissed state lives in localStorage; the "¿Cómo funciona?" link brings it
 * back.
 */
function HowItWorks({ onDismiss }: { onDismiss: () => void }) {
    const { t } = useLanguage();
    const lines = [t.outcomeMarkets.helpLine1, t.outcomeMarkets.helpLine2, t.outcomeMarkets.helpLine3];
    return (
        <div
            style={{
                background: V2.accentSoft,
                border: '1px solid rgba(227,179,76,0.22)',
                borderRadius: 14,
                padding: '13px 15px',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Icon name="info" size={14} color={V2.accent} />
                <div style={{ fontSize: 13.5, fontWeight: 800, color: V2.t1, flex: 1 }}>
                    {t.outcomeMarkets.helpTitle}
                </div>
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: V2.pos,
                    }}
                >
                    <Icon name="bolt" size={11} color={V2.pos} />
                    {t.outcomeMarkets.zeroFee}
                </div>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {lines.map((line) => (
                    <li key={line} style={{ display: 'flex', gap: 7, fontSize: 12.5, color: V2.t2, lineHeight: 1.45 }}>
                        <span style={{ color: V2.accent }}>·</span>
                        <span>{line}</span>
                    </li>
                ))}
            </ul>
            <button
                onClick={onDismiss}
                style={{
                    marginTop: 10,
                    padding: '7px 14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: 'none',
                    borderRadius: 9,
                    color: V2.t1,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: V2.ui,
                }}
            >
                {t.outcomeMarkets.helpDismiss}
            </button>
        </div>
    );
}

/**
 * Stake control: a big number, quick amounts, and a slider for the gaps.
 *
 * Quick chips are labelled in the user's display currency, so a Colombian
 * sees "$42.000" rather than a "$10" that doesn't match anything else on
 * screen; the underlying value stays in the quote token.
 */
function StakePicker({
    label,
    amount,
    onChange,
    max,
    color,
    balanceNote,
    emptyHint,
}: {
    label: string;
    amount: number;
    onChange: (v: number) => void;
    max: number;
    color: string;
    balanceNote: string;
    /** Shown instead of the controls when there is nothing to stake. */
    emptyHint: string;
}) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0;

    // A slider and five chips over a zero balance is a dead control that
    // teaches nothing. Say what's missing instead — the funding CTAs below
    // the preview handle the fix.
    if (max <= 0) {
        return (
            <div
                style={{
                    padding: '14px 15px',
                    background: V2.card,
                    border: `1px solid ${V2.hair}`,
                    borderRadius: 12,
                    fontSize: 13,
                    color: V2.t2,
                    lineHeight: 1.45,
                }}
            >
                {emptyHint}
            </div>
        );
    }

    return (
        <div>
            <SliderRow
                label={label}
                valueText={formatCurrency(amount, 2)}
                pct={pct}
                min={0}
                max={max}
                step={Math.max(max / 100, 0.01)}
                value={Math.min(amount, max)}
                onChange={onChange}
                color={color}
            />
            <div style={{ display: 'flex', gap: 7, marginTop: 14, flexWrap: 'wrap' }}>
                {QUICK_AMOUNTS.map((q) => {
                    // Unaffordable chips stay visible but inert: the row keeps
                    // its shape, and the denominations read as a scale.
                    const affordable = q <= max;
                    const on = Math.abs(amount - q) < 0.01;
                    return (
                        <button
                            key={q}
                            disabled={!affordable}
                            onClick={() => {
                                haptic.light();
                                onChange(q);
                            }}
                            style={{
                                flex: '1 1 0',
                                minWidth: 56,
                                padding: '8px 4px',
                                borderRadius: 10,
                                border: `1px solid ${on ? color : V2.hair}`,
                                background: on ? V2.card : 'transparent',
                                color: !affordable ? V2.t3 : on ? color : V2.t2,
                                opacity: affordable ? 1 : 0.4,
                                fontWeight: 700,
                                fontSize: 12.5,
                                cursor: affordable ? 'pointer' : 'not-allowed',
                                fontFamily: V2.mono,
                            }}
                        >
                            {formatCurrency(q, 0)}
                        </button>
                    );
                })}
                <button
                    onClick={() => {
                        haptic.light();
                        onChange(max);
                    }}
                    style={{
                        flex: '1 1 0',
                        minWidth: 56,
                        padding: '8px 4px',
                        borderRadius: 10,
                        border: `1px solid ${V2.hair}`,
                        background: 'transparent',
                        color: V2.t2,
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: 'pointer',
                        fontFamily: V2.ui,
                    }}
                >
                    {t.outcomeMarkets.max}
                </button>
            </div>
            <div className="font-mono" style={{ marginTop: 9, fontSize: 11.5, color: V2.t3, textAlign: 'right' }}>
                {balanceNote}
            </div>
        </div>
    );
}

interface BookTop {
    bid: number;
    ask: number;
    bidSz: number;
    askSz: number;
}

/**
 * Top of book for an outcome side, polled every 5s.
 *
 * Lifted out of the spread widget because the bet panel needs the resting size
 * too: a market order for more contracts than the book holds walks the ladder,
 * and the user deserves to be told before they swipe.
 */
function useOutcomeBook(coinRef: string | undefined): BookTop | null {
    const [book, setBook] = useState<BookTop | null>(null);

    useEffect(() => {
        if (!coinRef) {
            setBook(null);
            return;
        }
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

    return book;
}

/** Best bid/ask + spread + top-of-book size for the selected side. */
function OutcomeSpread({ book }: { book: BookTop | null }) {
    const { t } = useLanguage();
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
                border: '1px solid rgba(227,179,76,0.22)',
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
                    color: V2.accentInk,
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

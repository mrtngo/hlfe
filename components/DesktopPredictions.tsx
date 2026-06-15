'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    ArrowLeftRight,
    BookOpen,
    History,
    LineChart,
    Loader2,
    Newspaper,
    Search,
    Settings,
    Sparkles,
    Trophy,
    Wallet,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useOutcomeMarkets } from '@/hooks/useOutcomeMarkets';
import { useOutcomePositions, type OutcomePosition } from '@/hooks/useOutcomePositions';
import {
    localizeSideName,
    oddsMultiplier,
    outcomeCoinRef,
    type OutcomeCategory,
    type OutcomeMarketView,
} from '@/lib/hyperliquid/outcome';
import ApproveAgentModal from '@/components/ApproveAgentModal';
import CandlestickChart from '@/components/CandlestickChart';
import OrderBook from '@/components/OrderBook';
import TradeSuccessSheet from '@/components/TradeSuccessSheet';
import TransferModal from '@/components/TransferModal';

type DesktopPredictionsProps = {
    onOpenDeposit: () => void;
    onOpenHistory: () => void;
    onOpenNews: () => void;
    onOpenProfile: () => void;
    onOpenSettings: () => void;
    onOpenTerminal: () => void;
};

type PredictionFilter = 'all' | OutcomeCategory;

const FILTERS: { id: PredictionFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'sports', label: 'Sports' },
    { id: 'economy', label: 'Economía' },
    { id: 'politics', label: 'Política' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'other', label: 'Otros' },
];

const SIDE_STYLES = [
    { tone: 'positive', label: 'Yes' },
    { tone: 'negative', label: 'No' },
] as const;

export default function DesktopPredictions({
    onOpenDeposit,
    onOpenHistory,
    onOpenNews,
    onOpenProfile,
    onOpenSettings,
    onOpenTerminal,
}: DesktopPredictionsProps) {
    const { t, language } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { account, address, buyUsdh, placeOutcomeOrder, spotBalances } = useHyperliquid();
    const { markets, loading } = useOutcomeMarkets();
    const { positions, totalValue } = useOutcomePositions();
    const [filter, setFilter] = useState<PredictionFilter>('all');
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [selectedSideIdx, setSelectedSideIdx] = useState(0);
    const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
    const [pct, setPct] = useState(50);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [needsAgent, setNeedsAgent] = useState(false);
    const [showTransfer, setShowTransfer] = useState(false);
    const [success, setSuccess] = useState<{
        side: 'buy' | 'sell';
        usd: number;
        contracts: number;
        sideName: string;
        marketName: string;
    } | null>(null);

    useEffect(() => {
        if (selectedId !== null || markets.length === 0) return;
        setSelectedId(markets[0].outcomeId);
    }, [markets, selectedId]);

    const selected = useMemo(
        () => markets.find((market) => market.outcomeId === selectedId) || markets[0] || null,
        [markets, selectedId],
    );
    const selectedSide = selected?.sides[selectedSideIdx] || selected?.sides[0] || null;

    useEffect(() => {
        if (!selected || selected.sides[selectedSideIdx]) return;
        setSelectedSideIdx(0);
    }, [selected, selectedSideIdx]);

    const filteredMarkets = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return [...markets]
            .filter((market) => filter === 'all' || market.category === filter)
            .filter((market) => {
                if (!normalized) return true;
                return (
                    market.name.toLowerCase().includes(normalized) ||
                    market.eventName.toLowerCase().includes(normalized) ||
                    market.quoteToken.toLowerCase().includes(normalized)
                );
            })
            .sort((a, b) => (b.sides[0]?.mid || 0) - (a.sides[0]?.mid || 0));
    }, [filter, markets, query]);

    const groupedMarkets = useMemo(() => {
        const order: string[] = [];
        const byEvent = new Map<string, OutcomeMarketView[]>();
        for (const market of filteredMarkets) {
            if (!byEvent.has(market.eventName)) {
                byEvent.set(market.eventName, []);
                order.push(market.eventName);
            }
            byEvent.get(market.eventName)!.push(market);
        }
        return order.map((name) => ({ name, markets: byEvent.get(name)! }));
    }, [filteredMarkets]);

    const quoteBalance = useMemo(() => {
        if (!selected) return 0;
        const balance = spotBalances.find((item) => item.coin === selected.quoteToken);
        return balance ? parseFloat(balance.total) || 0 : 0;
    }, [selected, spotBalances]);

    const spotUsdc = useMemo(() => {
        const balance = spotBalances.find((item) => item.coin === 'USDC');
        return balance ? parseFloat(balance.total) || 0 : 0;
    }, [spotBalances]);

    const heldPosition = useMemo(() => {
        if (!selected) return null;
        return positions.find((item) => item.outcomeId === selected.outcomeId && item.sideIdx === selectedSideIdx) || null;
    }, [positions, selected, selectedSideIdx]);

    const heldContracts = Math.floor(heldPosition?.contracts || 0);
    const price = selectedSide?.mid || 0;
    const contracts = useMemo(() => {
        if (tradeSide === 'sell') return Math.floor((heldContracts * pct) / 100);
        if (price <= 0) return 0;
        return Math.floor((quoteBalance * pct) / 100 / price);
    }, [heldContracts, pct, price, quoteBalance, tradeSide]);
    const totalCost = contracts * price;
    const payout = contracts;
    const profit = payout - totalCost;
    const addressLabel = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Sin wallet';

    const validationError = (() => {
        if (!selected || !selectedSide) return 'Selecciona un mercado';
        if (tradeSide === 'sell') {
            if (heldContracts < 1) return t.outcomeMarkets.noToSell;
            if (contracts < 1) return t.outcomeMarkets.minContracts;
            return null;
        }
        if (contracts < 1) return t.outcomeMarkets.minContracts;
        if (totalCost < 10) return t.outcomeMarkets.minNotional.replace('{amount}', '10');
        if (totalCost > quoteBalance) return t.outcomeMarkets.insufficientQuote.replace('{token}', selected.quoteToken);
        return null;
    })();

    const canSubmit = !!selected && !!selectedSide && !validationError && !submitting;

    const placeBet = async () => {
        if (!selected || !selectedSide) return { ok: false, error: 'No market' } as const;
        const response = await placeOutcomeOrder({
            outcomeId: selected.outcomeId,
            sideIdx: selectedSideIdx,
            side: tradeSide,
            type: 'market',
            size: contracts,
            marketSlippagePct: 0.05,
        });
        return {
            ok: !!response.filled,
            error: response.error,
            filledSize: response.filledSize,
            filledPrice: response.filledPrice,
        } as const;
    };

    const onFilled = (result: { filledSize?: number; filledPrice?: number }) => {
        if (!selected || !selectedSide) return;
        const filledSize = result.filledSize && result.filledSize > 0 ? result.filledSize : contracts;
        const filledPrice = result.filledPrice && result.filledPrice > 0 ? result.filledPrice : price;
        setSuccess({
            side: tradeSide,
            usd: filledSize * filledPrice,
            contracts: filledSize,
            sideName: localizeSideName(selectedSide.name, language),
            marketName: selected.name,
        });
        setPct(50);
        setError(null);
    };

    const submit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        const result = await placeBet();
        if (result.ok) {
            onFilled(result);
        } else if (result.error?.toLowerCase().includes('agent wallet not approved')) {
            setNeedsAgent(true);
        } else {
            setError(result.error || t.outcomeMarkets.errBet);
        }
        setSubmitting(false);
    };

    const retryAfterAgent = async () => {
        setNeedsAgent(false);
        setSubmitting(true);
        setError(null);
        const result = await placeBet();
        if (result.ok) onFilled(result);
        else setError(result.error || t.outcomeMarkets.errBet);
        setSubmitting(false);
    };

    const buyNeededUsdh = async () => {
        const needed = Math.max(20, Math.ceil(totalCost || 10) + 5);
        setSubmitting(true);
        setError(null);
        const result = await buyUsdh(needed);
        if (!result.filled) setError(result.error || t.outcomeMarkets.errBet);
        setSubmitting(false);
    };

    return (
        <div className="desktop-predictions">
            <header className="dp-topbar">
                <div className="dt-brand">
                    <div className="dt-brand-mark">R</div>
                    <div>
                        <div className="dt-brand-title">Rayo</div>
                        <div className="dt-brand-subtitle">Predicciones</div>
                    </div>
                </div>

                <nav className="dt-topnav" aria-label="Prediction desktop navigation">
                    <button className="dt-nav-button" type="button" onClick={onOpenTerminal}>
                        <LineChart size={16} />
                        Terminal
                    </button>
                    <button className="dt-nav-button dt-nav-button-active" type="button">
                        <Sparkles size={16} />
                        Predicciones
                    </button>
                    <button className="dt-nav-button" type="button" onClick={onOpenNews}>
                        <Newspaper size={16} />
                        Noticias
                    </button>
                    <button className="dt-nav-button" type="button" onClick={onOpenHistory}>
                        <History size={16} />
                        Historial
                    </button>
                </nav>

                <div className="dt-account-strip">
                    <Metric label={t.outcomeMarkets.spotBalanceLabel} value={`${spotUsdc.toFixed(2)} USDC`} />
                    <Metric label="Perp" value={`${(account.availableMargin || 0).toFixed(2)} USDC`} />
                    <button className="dt-wallet-button" type="button" onClick={onOpenProfile}>
                        <Wallet size={16} />
                        <span>{addressLabel}</span>
                    </button>
                    <button className="dt-primary-button" type="button" onClick={onOpenDeposit}>
                        Depositar
                    </button>
                    <button className="dt-icon-button" type="button" aria-label="Ajustes" onClick={onOpenSettings}>
                        <Settings size={16} />
                    </button>
                </div>
            </header>

            <main className="dp-main">
                <aside className="dt-panel dp-market-rail">
                    <div className="dt-panel-header">
                        <div>
                            <div className="dt-panel-kicker">HIP-4</div>
                            <h2 className="dt-panel-title">{t.outcomeMarkets.title}</h2>
                        </div>
                        <div className="dp-count">{filteredMarkets.length}</div>
                    </div>

                    <label className="dt-search">
                        <Search size={15} />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar eventos..."
                        />
                    </label>

                    <div className="dt-filter-row" role="tablist" aria-label="Prediction filters">
                        {FILTERS.map((item) => (
                            <button
                                key={item.id}
                                className={item.id === filter ? 'dt-filter-chip dt-filter-chip-active' : 'dt-filter-chip'}
                                type="button"
                                onClick={() => setFilter(item.id)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="dp-market-list">
                        {loading && markets.length === 0 ? (
                            <div className="dt-empty-state">
                                <Loader2 className="animate-spin" size={18} />
                                <span>{t.outcomeMarkets.loading}</span>
                            </div>
                        ) : groupedMarkets.map((group) => (
                            <section className="dp-event-group" key={group.name}>
                                <div className="dp-event-title">
                                    <span>{group.name}</span>
                                    <strong>{group.markets.length}</strong>
                                </div>
                                {group.markets.map((market) => (
                                    <PredictionMarketRow
                                        key={market.outcomeId}
                                        market={market}
                                        language={language}
                                        active={market.outcomeId === selected?.outcomeId}
                                        onSelect={() => {
                                            setSelectedId(market.outcomeId);
                                            setSelectedSideIdx(0);
                                            setTradeSide('buy');
                                            setPct(50);
                                            setError(null);
                                        }}
                                    />
                                ))}
                            </section>
                        ))}
                    </div>
                </aside>

                <section className="dp-center">
                    <div className="dt-panel dp-hero-panel">
                        <div className="dp-selected-header">
                            <div>
                                <div className="dt-panel-kicker">{selected?.quoteToken || 'USDC'} · Prediction market</div>
                                <h1>{selected?.eventName || t.outcomeMarkets.title}</h1>
                                <p>{selected?.name || t.outcomeMarkets.subtitle}</p>
                            </div>
                            <div className="dp-zero-fee">
                                <Sparkles size={15} />
                                {t.outcomeMarkets.zeroFee}
                            </div>
                        </div>

                        <div className="dp-side-grid">
                            {selected?.sides.map((side, index) => (
                                <button
                                    key={`${selected.outcomeId}-${index}`}
                                    className={selectedSideIdx === index ? 'dp-side-card dp-side-card-active' : 'dp-side-card'}
                                    type="button"
                                    data-tone={SIDE_STYLES[index as 0 | 1]?.tone || 'positive'}
                                    onClick={() => {
                                        setSelectedSideIdx(index);
                                        setPct(50);
                                        setError(null);
                                    }}
                                >
                                    <span>{localizeSideName(side.name, language)}</span>
                                    <strong>{Math.round((side.mid || 0) * 100)}%</strong>
                                    <small>{oddsMultiplier(side.mid || 0)}</small>
                                </button>
                            ))}
                        </div>

                        <div className="dp-chart-card">
                            {selectedSide ? (
                                <CandlestickChart symbol={selectedSide.coinRef} height={430} showVolume />
                            ) : (
                                <div className="dt-empty-state">
                                    <LineChart size={18} />
                                    <span>Selecciona un lado</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="dt-panel dp-positions-panel">
                        <div className="dp-section-header">
                            <div>
                                <span>Portfolio de predicciones</span>
                                <strong>{formatCurrency(totalValue, 2)}</strong>
                            </div>
                            <Activity size={16} />
                        </div>
                        <PredictionPositions positions={positions} language={language} onSelect={(position) => {
                            setSelectedId(position.outcomeId);
                            setSelectedSideIdx(position.sideIdx);
                            setTradeSide('sell');
                            setPct(50);
                        }} />
                    </div>
                </section>

                <aside className="dp-right-rail">
                    <section className="dt-panel dp-ticket">
                        <div className="dp-section-header">
                            <div>
                                <span>Ticket</span>
                                <strong>{selectedSide ? localizeSideName(selectedSide.name, language) : '--'}</strong>
                            </div>
                            <BookOpen size={16} />
                        </div>

                        <div className="dp-ticket-body">
                            <div className="dp-buy-sell">
                                <button
                                    className={tradeSide === 'buy' ? 'dp-toggle-active' : ''}
                                    type="button"
                                    onClick={() => {
                                        setTradeSide('buy');
                                        setPct(50);
                                    }}
                                >
                                    {t.outcomeMarkets.buyTab}
                                </button>
                                <button
                                    className={tradeSide === 'sell' ? 'dp-toggle-active dp-toggle-sell' : 'dp-toggle-sell'}
                                    type="button"
                                    onClick={() => {
                                        setTradeSide('sell');
                                        setPct(50);
                                    }}
                                >
                                    {t.outcomeMarkets.sellTab}
                                </button>
                            </div>

                            <div className="dp-probability">
                                <span>Probabilidad</span>
                                <strong>{selectedSide ? `${Math.round(price * 100)}%` : '--'}</strong>
                                <small>{selectedSide ? oddsMultiplier(price) : '--'}</small>
                            </div>

                            <label className="dp-range">
                                <span>{t.outcomeMarkets.amountLabel}</span>
                                <strong>{pct}%</strong>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={pct}
                                    onChange={(event) => setPct(Number(event.target.value))}
                                />
                            </label>

                            <div className="dp-preview">
                                <PreviewRow label={tradeSide === 'sell' ? 'Contratos' : t.outcomeMarkets.totalCost} value={tradeSide === 'sell' ? contracts.toString() : `${formatCurrency(totalCost, 2)} ${selected?.quoteToken || ''}`} />
                                <PreviewRow label={t.outcomeMarkets.potentialPayout} value={`${formatCurrency(payout, 2)} ${selected?.quoteToken || ''}`} />
                                <PreviewRow label={t.outcomeMarkets.potentialProfit} value={`${profit >= 0 ? '+' : ''}${formatCurrency(profit, 2)}`} tone={profit >= 0 ? 'positive' : 'negative'} />
                                <PreviewRow label={tradeSide === 'sell' ? 'Tenés' : selected?.quoteToken || 'Balance'} value={tradeSide === 'sell' ? heldContracts.toString() : formatCurrency(quoteBalance, 2)} />
                            </div>

                            {selected?.quoteToken === 'USDH' && tradeSide === 'buy' && quoteBalance < 10 && (
                                <button className="dp-secondary-action" type="button" onClick={buyNeededUsdh} disabled={submitting}>
                                    {t.outcomeMarkets.buyUsdhAction.replace('{amount}', String(Math.max(20, Math.ceil(totalCost || 10) + 5)))}
                                </button>
                            )}

                            {selected?.quoteToken === 'USDC' && tradeSide === 'buy' && totalCost > quoteBalance && account.availableMargin > 0 && (
                                <button className="dp-secondary-action" type="button" onClick={() => setShowTransfer(true)}>
                                    <ArrowLeftRight size={15} />
                                    {t.outcomeMarkets.transferFromPerp}
                                </button>
                            )}

                            {error && <div className="dp-error">{error}</div>}

                            <button className="dp-submit" type="button" disabled={!canSubmit} data-side={tradeSide} onClick={submit}>
                                {submitting ? t.outcomeMarkets.betting : validationError || (
                                    tradeSide === 'sell'
                                        ? `${t.outcomeMarkets.sellTab} ${formatCurrency(totalCost, 2)}`
                                        : t.outcomeMarkets.placeBetCta
                                            .replace('{amount}', formatCurrency(totalCost, 2))
                                            .replace('{side}', selectedSide ? localizeSideName(selectedSide.name, language) : '')
                                )}
                            </button>
                        </div>
                    </section>

                    <section className="dt-panel dp-orderbook">
                        {selectedSide ? <OrderBook symbol={selectedSide.coinRef} levels={10} /> : null}
                    </section>
                </aside>
            </main>

            <ApproveAgentModal open={needsAgent} onClose={() => setNeedsAgent(false)} onSuccess={retryAfterAgent} />
            <TransferModal
                isOpen={showTransfer}
                onClose={() => setShowTransfer(false)}
                defaultToPerp={false}
                spotLabel={t.outcomeMarkets.spotBalanceLabel}
                perpLabel={t.outcomeMarkets.perpBalanceLabel}
                helpText={t.outcomeMarkets.transferHelp}
            />
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

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="dt-metric">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function PredictionMarketRow({
    active,
    language,
    market,
    onSelect,
}: {
    active: boolean;
    language: string;
    market: OutcomeMarketView;
    onSelect: () => void;
}) {
    const yes = market.sides[0];
    const no = market.sides[1];

    return (
        <button className={active ? 'dp-market-row dp-market-row-active' : 'dp-market-row'} type="button" onClick={onSelect}>
            <span className="dp-market-main">
                <strong>{market.name}</strong>
                <small>{market.quoteToken} · #{market.outcomeId}</small>
            </span>
            <span className="dp-market-prices">
                <span className="dp-pill-positive">
                    {localizeSideName(yes?.name || 'Yes', language)} {Math.round((yes?.mid || 0) * 100)}%
                </span>
                <span className="dp-pill-negative">
                    {localizeSideName(no?.name || 'No', language)} {Math.round((no?.mid || 0) * 100)}%
                </span>
            </span>
        </button>
    );
}

function PredictionPositions({
    language,
    onSelect,
    positions,
}: {
    language: string;
    onSelect: (position: OutcomePosition) => void;
    positions: OutcomePosition[];
}) {
    if (positions.length === 0) {
        return (
            <div className="dt-empty-state">
                <Trophy size={18} />
                <span>Sin posiciones abiertas</span>
            </div>
        );
    }

    return (
        <div className="dp-position-list">
            {positions.slice(0, 8).map((position) => (
                <button className="dp-position-row" type="button" key={position.coinRef} onClick={() => onSelect(position)}>
                    <span>
                        <strong>{position.marketName}</strong>
                        <small>{localizeSideName(position.sideName, language)} · {position.contracts.toFixed(0)} contratos</small>
                    </span>
                    <span className={position.pnl >= 0 ? 'dt-positive' : 'dt-negative'}>
                        {position.pnl >= 0 ? '+' : ''}
                        ${position.pnl.toFixed(2)}
                    </span>
                </button>
            ))}
        </div>
    );
}

function PreviewRow({
    label,
    tone,
    value,
}: {
    label: string;
    tone?: 'positive' | 'negative';
    value: string;
}) {
    return (
        <div className="dp-preview-row">
            <span>{label}</span>
            <strong className={tone === 'positive' ? 'dt-positive' : tone === 'negative' ? 'dt-negative' : ''}>{value}</strong>
        </div>
    );
}


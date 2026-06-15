'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
    Activity,
    Bell,
    BookOpen,
    ChevronDown,
    History,
    LineChart,
    Newspaper,
    Search,
    Settings,
    ShieldCheck,
    Sparkles,
    Wallet,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { useHyperliquid, type Market, type Position } from '@/hooks/useHyperliquid';
import { DEFAULT_WATCHLIST, getTokenFullName } from '@/lib/constants';
import { isInCategory, type TokenCategory } from '@/lib/token-categories';
import { formatUsdPrice, priceDecimalsFromMarket } from '@/lib/format/price';
import AdvancedOrderPanel from '@/components/AdvancedOrderPanel';
import CandlestickChart from '@/components/CandlestickChart';
import MarketSelectModal from '@/components/MarketSelectModal';
import OrderBook from '@/components/OrderBook';
import TokenLogo from '@/components/TokenLogo';

type DesktopTerminalProps = {
    onOpenDeposit: () => void;
    onOpenHistory: () => void;
    onOpenNews: () => void;
    onOpenPredictions: () => void;
    onOpenProfile: () => void;
    onOpenSettings: () => void;
};

type MarketFilter = 'all' | TokenCategory;
type ActivityTab = 'positions' | 'orders' | 'fills';

const MARKET_FILTERS: { id: MarketFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'stocks', label: 'Acciones' },
    { id: 'commodities', label: 'Commodities' },
    { id: 'l1', label: 'L1' },
    { id: 'defi', label: 'DeFi' },
    { id: 'ai', label: 'AI' },
    { id: 'l2', label: 'L2' },
];

export default function DesktopTerminal({
    onOpenDeposit,
    onOpenHistory,
    onOpenNews,
    onOpenPredictions,
    onOpenProfile,
    onOpenSettings,
}: DesktopTerminalProps) {
    const { formatCurrency } = useCurrency();
    const {
        account,
        address,
        fills,
        funding,
        getMarket,
        markets,
        openOrders,
        positions,
        selectedMarket,
        setSelectedMarket,
        thirtyDayPnl,
    } = useHyperliquid();
    const [filter, setFilter] = useState<MarketFilter>('all');
    const [query, setQuery] = useState('');
    const [showMarketSearch, setShowMarketSearch] = useState(false);
    const [activityTab, setActivityTab] = useState<ActivityTab>('positions');

    const currentMarket = useMemo(() => {
        if (selectedMarket) return getMarket(selectedMarket);
        return markets[0];
    }, [getMarket, markets, selectedMarket]);

    const displayedMarkets = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return [...markets]
            .filter((market) => {
                if (filter === 'all') return true;
                const base = baseTicker(market);
                return isInCategory(base, filter);
            })
            .filter((market) => {
                if (!normalizedQuery) return true;
                return (
                    market.symbol.toLowerCase().includes(normalizedQuery) ||
                    market.name.toLowerCase().includes(normalizedQuery) ||
                    getTokenFullName(market.name).toLowerCase().includes(normalizedQuery)
                );
            })
            .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
            .slice(0, 80);
    }, [filter, markets, query]);

    const tickerMarkets = useMemo(() => {
        const watchlist = new Set(DEFAULT_WATCHLIST);
        const watched = markets.filter((market) => watchlist.has(market.name) || watchlist.has(market.symbol));
        const source = watched.length > 0 ? watched : markets;
        return [...source].sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0)).slice(0, 14);
    }, [markets]);

    const marketPrice = currentMarket?.price || 0;
    const change = currentMarket?.change24h || 0;
    const isUp = change >= 0;
    const displayTicker = currentMarket ? baseTicker(currentMarket) : 'BTC';
    const addressLabel = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Sin wallet';

    return (
        <div className="desktop-terminal">
            <header className="dt-topbar">
                <div className="dt-brand">
                    <div className="dt-brand-mark">R</div>
                    <div>
                        <div className="dt-brand-title">Rayo</div>
                        <div className="dt-brand-subtitle">Terminal</div>
                    </div>
                </div>

                <nav className="dt-topnav" aria-label="Desktop navigation">
                    <button className="dt-nav-button dt-nav-button-active" type="button">
                        <LineChart size={16} />
                        Terminal
                    </button>
                    <button className="dt-nav-button" type="button" onClick={onOpenPredictions}>
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
                    <Metric label="Equity" value={formatCurrency(account.equity || 0)} />
                    <Metric label="Disponible" value={`${(account.availableMargin || 0).toFixed(2)} USDC`} />
                    <button className="dt-icon-button" type="button" aria-label="Alertas">
                        <Bell size={16} />
                    </button>
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

            <div className="dt-ticker-tape" aria-label="Markets ticker">
                <div className="dt-ticker-track">
                    {[...tickerMarkets, ...tickerMarkets].map((market, index) => (
                        <button
                            className="dt-ticker-item"
                            type="button"
                            key={`${market.symbol}-${index}`}
                            onClick={() => setSelectedMarket(market.symbol)}
                        >
                            <span className="dt-ticker-symbol">{baseTicker(market)}</span>
                            <span className="dt-ticker-price">${formatUsdPrice(market.price || 0, market)}</span>
                            <span className={(market.change24h || 0) >= 0 ? 'dt-positive' : 'dt-negative'}>
                                {(market.change24h || 0) >= 0 ? '+' : ''}
                                {(market.change24h || 0).toFixed(2)}%
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <main className="dt-main">
                <aside className="dt-panel dt-market-panel" aria-label="Mercados">
                    <div className="dt-panel-header">
                        <div>
                            <div className="dt-panel-kicker">Mercados</div>
                            <h2 className="dt-panel-title">Activos</h2>
                        </div>
                        <button className="dt-icon-button" type="button" aria-label="Buscar mercado" onClick={() => setShowMarketSearch(true)}>
                            <Search size={16} />
                        </button>
                    </div>

                    <label className="dt-search">
                        <Search size={15} />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar BTC, TSLA, oro..."
                        />
                    </label>

                    <div className="dt-filter-row" role="tablist" aria-label="Market filters">
                        {MARKET_FILTERS.map((item) => (
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

                    <div className="dt-market-list">
                        {displayedMarkets.map((market) => (
                            <MarketRow
                                key={market.symbol}
                                market={market}
                                active={market.symbol === currentMarket?.symbol}
                                onSelect={() => setSelectedMarket(market.symbol)}
                            />
                        ))}
                    </div>
                </aside>

                <section className="dt-center">
                    <div className="dt-panel dt-chart-panel">
                        <div className="dt-market-header">
                            <div className="dt-market-identity">
                                <TokenLogo symbol={currentMarket?.symbol || displayTicker} size={42} />
                                <div>
                                    <button className="dt-market-switch" type="button" onClick={() => setShowMarketSearch(true)}>
                                        <span>{displayTicker}-USD</span>
                                        <ChevronDown size={16} />
                                    </button>
                                    <div className="dt-market-name">
                                        {currentMarket ? getTokenFullName(currentMarket.name) : 'Mercado perpetuo'}
                                        {currentMarket?.isStock ? <span className="dt-badge">xyz</span> : null}
                                    </div>
                                </div>
                            </div>

                            <div className="dt-price-cluster">
                                <div className="dt-last-price">
                                    ${currentMarket ? formatUsdPrice(marketPrice, currentMarket) : '0.00'}
                                </div>
                                <div className={isUp ? 'dt-change dt-positive' : 'dt-change dt-negative'}>
                                    {isUp ? '+' : ''}
                                    {change.toFixed(2)}%
                                </div>
                            </div>

                            <div className="dt-market-stats">
                                <Metric label="Vol 24h" value={compactUsd(currentMarket?.volume24h || 0)} />
                                <Metric label="Open interest" value={compactUsd(currentMarket?.openInterest || 0)} />
                                <Metric label="Funding" value={`${(((currentMarket?.fundingRate || 0) * 100)).toFixed(4)}%`} />
                                <Metric label="Max lev" value={`${currentMarket?.maxLeverage || 20}x`} />
                            </div>
                        </div>

                        <div className="dt-chart-wrap">
                            {currentMarket ? <CandlestickChart symbol={currentMarket.symbol} height={520} showVolume /> : null}
                        </div>
                    </div>

                    <div className="dt-panel dt-activity-panel">
                        <div className="dt-activity-tabs">
                            <ActivityButton
                                active={activityTab === 'positions'}
                                label={`Posiciones ${positions.length ? `(${positions.length})` : ''}`}
                                onClick={() => setActivityTab('positions')}
                            />
                            <ActivityButton
                                active={activityTab === 'orders'}
                                label={`Órdenes ${openOrders.length ? `(${openOrders.length})` : ''}`}
                                onClick={() => setActivityTab('orders')}
                            />
                            <ActivityButton
                                active={activityTab === 'fills'}
                                label="Fills"
                                onClick={() => setActivityTab('fills')}
                            />
                        </div>

                        {activityTab === 'positions' ? (
                            <PositionsTable positions={positions} onSelect={setSelectedMarket} />
                        ) : activityTab === 'orders' ? (
                            <OrdersTable orders={openOrders} />
                        ) : (
                            <FillsTable fills={fills} />
                        )}
                    </div>
                </section>

                <aside className="dt-right-rail">
                    <section className="dt-panel dt-health-panel">
                        <div className="dt-health-item">
                            <ShieldCheck size={16} />
                            <span>Sesión verificada</span>
                        </div>
                        <div className="dt-health-item">
                            <Activity size={16} />
                            <span>{funding.length} funding events</span>
                        </div>
                        <div className={thirtyDayPnl >= 0 ? 'dt-health-pnl dt-positive' : 'dt-health-pnl dt-negative'}>
                            {thirtyDayPnl >= 0 ? '+' : ''}
                            {formatCurrency(thirtyDayPnl)}
                        </div>
                    </section>

                    <section className="dt-panel dt-orderbook-panel">
                        {currentMarket ? <OrderBook symbol={currentMarket.symbol} levels={8} /> : null}
                    </section>

                    <section className="dt-panel dt-ticket-panel">
                        <div className="dt-ticket-header">
                            <BookOpen size={16} />
                            <span>Orden</span>
                        </div>
                        {currentMarket ? <AdvancedOrderPanel symbol={currentMarket.symbol} /> : null}
                    </section>
                </aside>
            </main>

            <MarketSelectModal
                isOpen={showMarketSearch}
                onClose={() => setShowMarketSearch(false)}
                onSelect={(market) => {
                    setSelectedMarket(market.symbol);
                    setShowMarketSearch(false);
                }}
                markets={markets}
                title="Cambiar mercado"
                subtitle="Busca crypto, acciones y commodities"
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

function MarketRow({ active, market, onSelect }: { active: boolean; market: Market; onSelect: () => void }) {
    const change = market.change24h || 0;
    const isUp = change >= 0;
    const ticker = baseTicker(market);
    const decimals = priceDecimalsFromMarket(market);

    return (
        <button className={active ? 'dt-market-row dt-market-row-active' : 'dt-market-row'} type="button" onClick={onSelect}>
            <span className="dt-market-row-logo">
                <TokenLogo symbol={market.symbol} size={28} />
            </span>
            <span className="dt-market-row-main">
                <span className="dt-market-row-symbol">{ticker}</span>
                <span className="dt-market-row-name">{market.isStock ? 'Trade.xyz' : getTokenFullName(market.name)}</span>
            </span>
            <span className="dt-market-row-values">
                <span className="dt-market-row-price">${(market.price || 0).toLocaleString('en-US', { maximumFractionDigits: decimals })}</span>
                <span className={isUp ? 'dt-positive' : 'dt-negative'}>
                    {isUp ? '+' : ''}
                    {change.toFixed(2)}%
                </span>
            </span>
        </button>
    );
}

function ActivityButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <button className={active ? 'dt-activity-tab dt-activity-tab-active' : 'dt-activity-tab'} type="button" onClick={onClick}>
            {label}
        </button>
    );
}

function PositionsTable({ positions, onSelect }: { positions: Position[]; onSelect: (symbol: string) => void }) {
    if (positions.length === 0) {
        return <EmptyTable icon={<LineChart size={18} />} title="Sin posiciones abiertas" />;
    }

    return (
        <div className="dt-table" role="table" aria-label="Posiciones abiertas">
            <div className="dt-table-row dt-table-head" role="row">
                <span>Mercado</span>
                <span>Lado</span>
                <span>Tamaño</span>
                <span>Entrada</span>
                <span>Mark</span>
                <span>PnL</span>
                <span>Liq.</span>
            </div>
            {positions.map((position) => (
                <button className="dt-table-row dt-table-button" type="button" key={position.symbol} onClick={() => onSelect(position.symbol)}>
                    <span>{baseSymbol(position.symbol)}</span>
                    <span className={position.side === 'long' ? 'dt-positive' : 'dt-negative'}>{position.side === 'long' ? 'Long' : 'Short'} {position.leverage}x</span>
                    <span>{Math.abs(position.size).toFixed(4)}</span>
                    <span>${position.entryPrice.toLocaleString('en-US')}</span>
                    <span>${position.markPrice.toLocaleString('en-US')}</span>
                    <span className={position.unrealizedPnl >= 0 ? 'dt-positive' : 'dt-negative'}>
                        {position.unrealizedPnl >= 0 ? '+' : ''}
                        ${position.unrealizedPnl.toFixed(2)}
                    </span>
                    <span>${position.liquidationPrice.toLocaleString('en-US')}</span>
                </button>
            ))}
        </div>
    );
}

function OrdersTable({ orders }: { orders: any[] }) {
    if (orders.length === 0) {
        return <EmptyTable icon={<BookOpen size={18} />} title="Sin órdenes abiertas" />;
    }

    return (
        <div className="dt-table" role="table" aria-label="Órdenes abiertas">
            <div className="dt-table-row dt-table-head" role="row">
                <span>Mercado</span>
                <span>Lado</span>
                <span>Tamaño</span>
                <span>Precio</span>
                <span>Tipo</span>
                <span>Estado</span>
            </div>
            {orders.slice(0, 12).map((order, index) => {
                const isBuy = order.side === 'B' || order.side === 'buy' || order.isBuy === true;
                const price = Number(order.limitPx || order.px || order.price || 0);
                const size = Number(order.sz || order.size || 0);
                const coin = baseSymbol(order.coin || order.symbol || '');
                return (
                    <div className="dt-table-row" key={`${order.oid || order.id || coin}-${index}`}>
                        <span>{coin}</span>
                        <span className={isBuy ? 'dt-positive' : 'dt-negative'}>{isBuy ? 'Buy' : 'Sell'}</span>
                        <span>{Number.isFinite(size) ? size.toFixed(4) : '--'}</span>
                        <span>{Number.isFinite(price) && price > 0 ? `$${price.toLocaleString('en-US')}` : 'Market'}</span>
                        <span>Limit</span>
                        <span>Abierta</span>
                    </div>
                );
            })}
        </div>
    );
}

function FillsTable({ fills }: { fills: any[] }) {
    if (fills.length === 0) {
        return <EmptyTable icon={<History size={18} />} title="Sin fills recientes" />;
    }

    return (
        <div className="dt-table" role="table" aria-label="Fills recientes">
            <div className="dt-table-row dt-table-head" role="row">
                <span>Hora</span>
                <span>Mercado</span>
                <span>Lado</span>
                <span>Tamaño</span>
                <span>Precio</span>
                <span>Fee</span>
            </div>
            {fills.slice(0, 14).map((fill, index) => {
                const time = typeof fill.time === 'number' ? new Date(fill.time) : null;
                const isBuy = fill.side === 'B' || fill.side === 'buy';
                return (
                    <div className="dt-table-row" key={`${fill.tid || fill.oid || index}`}>
                        <span>{time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                        <span>{baseSymbol(fill.coin || '')}</span>
                        <span className={isBuy ? 'dt-positive' : 'dt-negative'}>{isBuy ? 'Buy' : 'Sell'}</span>
                        <span>{Number(fill.sz || 0).toFixed(4)}</span>
                        <span>${Number(fill.px || 0).toLocaleString('en-US')}</span>
                        <span>{fill.fee ? `$${Math.abs(Number(fill.fee)).toFixed(4)}` : '--'}</span>
                    </div>
                );
            })}
        </div>
    );
}

function EmptyTable({ icon, title }: { icon: ReactNode; title: string }) {
    return (
        <div className="dt-empty-state">
            {icon}
            <span>{title}</span>
        </div>
    );
}

function baseTicker(market: Market) {
    return baseSymbol(market.name || market.symbol);
}

function baseSymbol(symbol: string) {
    return symbol.replace(/^xyz:/i, '').replace(/-USD$/i, '').replace(/-PERP$/i, '');
}

function compactUsd(value: number) {
    if (!Number.isFinite(value) || value <= 0) return '$0';
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
}

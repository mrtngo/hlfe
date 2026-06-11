'use client';

import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowUpRight, Settings } from 'lucide-react';
import { useHyperliquid, type Market } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { getTokenFullName, STORAGE_KEYS, DEFAULT_WATCHLIST } from '@/lib/constants';
import { isInCategory, type TokenCategory } from '@/lib/token-categories';
import TokenLogo from '@/components/TokenLogo';
import MiniChart from '@/components/MiniChart';
import DepositModal from '@/components/DepositModal';
import WithdrawModal from '@/components/WithdrawModal';
import ProToggle from '@/components/ProToggle';

interface HomeProProps {
    onTokenClick?: (symbol: string) => void;
    onBuyClick?: () => void;
    onToggleProMode: () => void;
}

function HomePro({ onTokenClick, onBuyClick, onToggleProMode }: HomeProProps) {
    const { t, language } = useLanguage();
    const { currency, toggleCurrency, formatCurrency } = useCurrency();
    const { account, positions, markets, thirtyDayPnl, address, setSelectedMarket } = useHyperliquid();
    const [now, setNow] = useState<Date | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<TokenCategory>('l1');
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);

    useEffect(() => {
        setNow(new Date());
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const [watchlist] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
        try {
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const watchlistToShow = (watchlist || []).length > 0 ? watchlist : DEFAULT_WATCHLIST;
    const watchlistMarkets = useMemo(
        () =>
            (markets || []).filter(
                (m) => watchlistToShow.includes(m.name) || watchlistToShow.includes(m.symbol),
            ),
        [markets, watchlistToShow],
    );

    const tickerSymbols = useMemo(() => {
        return [...(markets || [])]
            .filter((m) => !m.isStock)
            .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
            .slice(0, 10);
    }, [markets]);

    const portfolioValue = account.equity || 0;
    const intPart = Math.floor(Math.abs(portfolioValue));
    const decPart = Math.abs(portfolioValue).toFixed(2).split('.')[1];

    const change24h = account.unrealizedPnl || 0;
    const change24hPct = account.equity > 0 ? (change24h / account.equity) * 100 : 0;

    const truncatedAddress = address
        ? `${address.slice(0, 4)}…${address.slice(-4)}`
        : '0x0000…0000';

    const handleTokenClick = (symbol: string) => {
        setSelectedMarket(symbol);
        onTokenClick?.(symbol);
    };

    const sectorList: { id: TokenCategory; label: string }[] = [
        { id: 'l1', label: 'L1' },
        { id: 'defi', label: 'DEFI' },
        { id: 'ai', label: 'AI' },
        { id: 'meme', label: 'MEME' },
        { id: 'l2', label: 'L2' },
        { id: 'infra', label: 'INFRA' },
        { id: 'stocks', label: 'STOCKS' },
        { id: 'commodities', label: 'CMDTY' },
    ];

    const sectorCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        sectorList.forEach((s) => {
            counts[s.id] = (markets || []).filter((m) => {
                const baseSymbol = m.name.replace('-USD', '').replace('-PERP', '');
                return isInCategory(baseSymbol, s.id);
            }).length;
        });
        return counts;
    }, [markets]);

    return (
        <div
            className="atmosphere-grid"
            style={{
                minHeight: '100%',
                color: '#fff',
                fontFamily: 'var(--font-jetbrains), ui-monospace, monospace',
                position: 'relative',
                marginLeft: -16,
                marginRight: -16,
            }}
        >
            {/* Status strip */}
            <div
                style={{
                    position: 'relative',
                    padding: '12px 16px 10px',
                    borderBottom: '1px solid rgba(250,204,21,0.25)',
                    background: 'linear-gradient(180deg, rgba(250,204,21,0.04), transparent)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 9,
                                color: 'var(--color-brand-primary)',
                                letterSpacing: '0.3em',
                                fontWeight: 800,
                                marginBottom: 4,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <span className="dot-live-pulse" />
                            {t.homeRedesign.pro.eyebrow}
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: 'var(--color-text-secondary)',
                                fontWeight: 600,
                            }}
                            suppressHydrationWarning
                        >
                            {t.homeRedesign.pro.session} ·{' '}
                            {now
                                ? now.toLocaleTimeString(language === 'es' ? 'es-AR' : 'en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                  })
                                : '--:--:--'}{' '}
                            ART
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <ProToggle pro={true} onClick={onToggleProMode} />
                        <button
                            type="button"
                            onClick={toggleCurrency}
                            style={{
                                padding: '4px 8px',
                                border: '1px solid var(--color-border-default)',
                                borderRadius: 4,
                                fontSize: 10,
                                color: 'var(--color-text-secondary)',
                                fontWeight: 700,
                                background: 'transparent',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            {currency}
                        </button>
                        <button
                            type="button"
                            aria-label="Settings"
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: '1px solid var(--color-border-default)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'transparent',
                                cursor: 'pointer',
                            }}
                        >
                            <Settings size={13} color="var(--color-text-secondary)" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Ticker tape */}
            <div
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderBottom: '1px solid #1A1A1A',
                    background: '#000',
                    height: 30,
                }}
            >
                {tickerSymbols.length > 0 && (
                    <div className="ticker-track" style={{ height: 30 }}>
                        {[...tickerSymbols, ...tickerSymbols].map((m, i) => {
                            const up = (m.change24h || 0) >= 0;
                            const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';
                            return (
                                <button
                                    key={`${m.symbol}-${i}`}
                                    type="button"
                                    onClick={() => handleTokenClick(m.symbol)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '0 18px',
                                        height: 30,
                                        borderRight: '1px solid rgba(255,255,255,0.04)',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRightStyle: 'solid',
                                        borderRightWidth: 1,
                                        borderRightColor: 'rgba(255,255,255,0.04)',
                                        cursor: 'pointer',
                                        color: '#fff',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <span style={{ fontSize: 11, fontWeight: 700 }}>{m.name}</span>
                                    <span
                                        style={{
                                            fontSize: 11,
                                            color: 'var(--color-text-secondary)',
                                        }}
                                    >
                                        {formatCurrency(m.price || 0)}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 11,
                                            color: cl,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {up ? '▲' : '▼'} {Math.abs(m.change24h || 0).toFixed(2)}%
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Portfolio block */}
            <div style={{ position: 'relative', padding: '20px 16px 16px' }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 10,
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 9,
                                color: 'var(--color-text-tertiary)',
                                letterSpacing: '0.22em',
                                fontWeight: 800,
                            }}
                        >
                            {t.homeRedesign.pro.nav}
                        </div>
                        <div
                            style={{
                                fontSize: 10,
                                color: 'var(--color-text-muted)',
                                marginTop: 2,
                            }}
                        >
                            {truncatedAddress}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div
                            style={{
                                fontSize: 9,
                                color: 'var(--color-text-tertiary)',
                                letterSpacing: '0.22em',
                                fontWeight: 800,
                            }}
                        >
                            {t.homeRedesign.pro.delta24h}
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                color:
                                    change24hPct >= 0
                                        ? 'var(--color-positive)'
                                        : 'var(--color-negative)',
                                fontWeight: 700,
                                marginTop: 2,
                            }}
                        >
                            {change24hPct >= 0 ? '+' : ''}
                            {change24hPct.toFixed(2)}% · {change24h >= 0 ? '+' : '-'}
                            {formatCurrency(Math.abs(change24h))}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            fontSize: 14,
                            color: 'var(--color-text-tertiary)',
                            fontWeight: 700,
                        }}
                    >
                        {currency}
                    </div>
                    <div
                        className="tabular-mono"
                        style={{
                            fontSize: 48,
                            fontWeight: 700,
                            color: '#fff',
                            letterSpacing: '-0.04em',
                            lineHeight: 1,
                            textShadow: '0 0 30px rgba(250,204,21,0.15)',
                        }}
                    >
                        {intPart.toLocaleString('en-US')}
                        <span style={{ fontSize: 24, color: 'var(--color-text-tertiary)' }}>
                            .{decPart}
                        </span>
                    </div>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        border: '1px solid #1F1F1F',
                        borderRadius: 6,
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.015)',
                    }}
                >
                    <ProMetric label={t.homeRedesign.pro.equity} value={account.equity} formatCurrency={formatCurrency} />
                    <ProMetric label={t.homeRedesign.pro.avail} value={account.availableMargin} formatCurrency={formatCurrency} />
                    <ProMetric label={t.homeRedesign.pro.margin} value={account.usedMargin} formatCurrency={formatCurrency} />
                    <ProMetric
                        label={t.homeRedesign.pro.pnl30d}
                        value={thirtyDayPnl}
                        color={thirtyDayPnl >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'}
                        sign
                        last
                        formatCurrency={formatCurrency}
                    />
                </div>
            </div>

            {/* Action row */}
            <div
                style={{
                    padding: '0 16px 16px',
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr 1fr',
                    gap: 6,
                }}
            >
                <button
                    type="button"
                    onClick={onBuyClick}
                    style={{
                        padding: '14px 14px',
                        background:
                            'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                        border: 'none',
                        borderRadius: 6,
                        color: '#1A1304',
                        fontFamily: 'inherit',
                        fontWeight: 800,
                        fontSize: 13,
                        letterSpacing: '0.04em',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow:
                            '0 1px 0 rgba(255,255,255,0.4) inset, 0 8px 24px -8px rgba(250,204,21,0.5)',
                        cursor: 'pointer',
                    }}
                >
                    <span>{t.homeRedesign.pro.comprar}</span>
                    <ArrowUpRight size={15} strokeWidth={2.6} color="#1A1304" />
                </button>
                <button
                    type="button"
                    onClick={() => setShowWithdrawModal(true)}
                    style={{
                        padding: '14px 10px',
                        background: 'transparent',
                        border: '1px solid var(--color-brand-primary)',
                        borderRadius: 6,
                        color: 'var(--color-brand-primary)',
                        fontFamily: 'inherit',
                        fontWeight: 700,
                        fontSize: 11,
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                    }}
                >
                    {t.homeRedesign.pro.vender}
                </button>
                <button
                    type="button"
                    onClick={() => setShowDepositModal(true)}
                    style={{
                        padding: '14px 10px',
                        background: 'transparent',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: 6,
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'inherit',
                        fontWeight: 700,
                        fontSize: 11,
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                    }}
                >
                    {t.homeRedesign.pro.depositar}
                </button>
            </div>

            {/* Positions table */}
            {positions.length > 0 && (
                <DataBlock label={t.homeRedesign.pro.positions} count={positions.length} accent live={t.homeRedesign.pro.live}>
                    <div style={{ borderTop: '1px solid #1A1A1A' }}>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1.5fr 0.7fr 0.9fr 0.9fr',
                                padding: '6px 14px',
                                fontSize: 9,
                                color: 'var(--color-text-muted)',
                                letterSpacing: '0.18em',
                                fontWeight: 700,
                                borderBottom: '1px solid #1A1A1A',
                                background: 'rgba(255,255,255,0.01)',
                            }}
                        >
                            <div>{t.homeRedesign.pro.table.symbol}</div>
                            <div>{t.homeRedesign.pro.table.side}</div>
                            <div style={{ textAlign: 'right' }}>
                                {t.homeRedesign.pro.table.mark}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {t.homeRedesign.pro.table.pnl}
                            </div>
                        </div>
                        {positions.map((pos, i) => {
                            const up = pos.unrealizedPnl >= 0;
                            const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';
                            const isLong = pos.side === 'long';
                            return (
                                <div
                                    key={pos.symbol}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleTokenClick(pos.symbol)}
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' && handleTokenClick(pos.symbol)
                                    }
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1.5fr 0.7fr 0.9fr 0.9fr',
                                        padding: '12px 14px',
                                        fontSize: 12,
                                        alignItems: 'center',
                                        borderBottom:
                                            i < positions.length - 1
                                                ? '1px solid #1A1A1A'
                                                : 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <TokenLogo symbol={pos.symbol} size={22} />
                                        <div>
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    color: '#fff',
                                                    fontSize: 12,
                                                }}
                                            >
                                                {pos.name || pos.symbol}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 10,
                                                    color: 'var(--color-text-tertiary)',
                                                }}
                                            >
                                                {pos.size.toLocaleString('en-US', {
                                                    maximumFractionDigits: 4,
                                                })}{' '}
                                                · {formatCurrency(pos.entryPrice)}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                padding: '2px 6px',
                                                borderRadius: 3,
                                                fontSize: 9,
                                                fontWeight: 800,
                                                letterSpacing: '0.08em',
                                                background: isLong
                                                    ? 'rgba(34,197,94,0.12)'
                                                    : 'rgba(239,68,68,0.12)',
                                                color: isLong
                                                    ? 'var(--color-positive)'
                                                    : 'var(--color-negative)',
                                            }}
                                        >
                                            {isLong ? 'L' : 'S'}/{pos.leverage}×
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            textAlign: 'right',
                                            color: '#E5E5E5',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {formatCurrency(pos.markPrice)}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: cl, fontWeight: 700 }}>
                                            {up ? '+' : '-'}
                                            {formatCurrency(Math.abs(pos.unrealizedPnl))}
                                        </div>
                                        <div
                                            style={{
                                                color: cl,
                                                fontSize: 10,
                                                opacity: 0.85,
                                            }}
                                        >
                                            {up ? '+' : ''}
                                            {pos.unrealizedPnlPercent.toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DataBlock>
            )}

            {/* Watchlist */}
            <DataBlock label={t.homeRedesign.pro.watchlist} count={watchlistMarkets.length} live={t.homeRedesign.pro.live}>
                <div style={{ borderTop: '1px solid #1A1A1A' }}>
                    {watchlistMarkets.map((market, i) => {
                        const up = (market.change24h || 0) >= 0;
                        const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';
                        const cleanTicker = market.name
                            .replace(/-USD$/, '')
                            .replace(/-PERP$/, '');
                        return (
                            <div
                                key={market.name}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleTokenClick(market.symbol)}
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && handleTokenClick(market.symbol)
                                }
                                style={{
                                    padding: '12px 14px',
                                    borderBottom:
                                        i < watchlistMarkets.length - 1
                                            ? '1px solid #1A1A1A'
                                            : 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                    }}
                                >
                                    <TokenLogo symbol={market.symbol} size={26} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'baseline',
                                            }}
                                        >
                                            <div>
                                                <span
                                                    style={{
                                                        fontWeight: 700,
                                                        color: '#fff',
                                                        fontSize: 12,
                                                        marginRight: 6,
                                                    }}
                                                >
                                                    {cleanTicker}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        color: 'var(--color-text-tertiary)',
                                                    }}
                                                >
                                                    {getTokenFullName(cleanTicker)}
                                                </span>
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: 8,
                                                    alignItems: 'baseline',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        color: '#fff',
                                                        fontWeight: 700,
                                                        fontSize: 12,
                                                    }}
                                                >
                                                    {formatCurrency(market.price || 0)}
                                                </span>
                                                <span
                                                    style={{
                                                        color: cl,
                                                        fontWeight: 700,
                                                        fontSize: 11,
                                                    }}
                                                >
                                                    {up ? '+' : ''}
                                                    {(market.change24h || 0).toFixed(2)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 90px',
                                        gap: 8,
                                        alignItems: 'center',
                                        marginTop: 8,
                                    }}
                                >
                                    <div
                                        style={{
                                            height: 3,
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
                                                width: `${Math.max(4, Math.min(96, 50 + (market.change24h || 0)))}%`,
                                                background: cl,
                                            }}
                                        />
                                    </div>
                                    <div style={{ width: 90, height: 22 }}>
                                        <MiniChart
                                            symbol={market.symbol}
                                            isStock={market.isStock === true}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </DataBlock>

            {/* Sectors */}
            <div style={{ padding: '24px 16px 24px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                    }}
                >
                    <div
                        style={{
                            fontSize: 9,
                            color: 'var(--color-brand-primary)',
                            letterSpacing: '0.3em',
                            fontWeight: 800,
                        }}
                    >
                        {t.homeRedesign.pro.sectors}
                    </div>
                    <div
                        style={{
                            fontSize: 9,
                            color: 'var(--color-text-muted)',
                            letterSpacing: '0.18em',
                            fontWeight: 700,
                        }}
                    >
                        {t.homeRedesign.pro.groups.replace('{count}', sectorList.length.toString())}
                    </div>
                </div>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 6,
                    }}
                >
                    {sectorList.map((cat) => {
                        const active = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id)}
                                style={{
                                    padding: '12px 8px',
                                    border: active
                                        ? '1px solid var(--color-brand-primary)'
                                        : '1px solid #1F1F1F',
                                    background: active
                                        ? 'rgba(250,204,21,0.06)'
                                        : 'rgba(255,255,255,0.015)',
                                    borderRadius: 4,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 800,
                                        color: active ? 'var(--color-brand-primary)' : '#fff',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    {cat.label}
                                </div>
                                <div
                                    style={{
                                        fontSize: 9,
                                        color: 'var(--color-text-tertiary)',
                                        marginTop: 2,
                                        fontWeight: 600,
                                    }}
                                >
                                    {t.homeRedesign.pro.symbols.replace(
                                        '{count}',
                                        (sectorCounts[cat.id] || 0).toString(),
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <DepositModal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} />
            <WithdrawModal isOpen={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} />
        </div>
    );
}

export default memo(HomePro);

function ProMetric({
    label,
    value,
    color,
    sign,
    last,
    formatCurrency,
}: {
    label: string;
    value: number;
    color?: string;
    sign?: boolean;
    last?: boolean;
    formatCurrency: (v: number, dp?: number) => string;
}) {
    const prefix = sign ? (value >= 0 ? '+' : '-') : '';
    return (
        <div
            style={{
                padding: '10px 10px',
                borderRight: last ? 'none' : '1px solid #1F1F1F',
            }}
        >
            <div
                style={{
                    fontSize: 8.5,
                    color: 'var(--color-text-tertiary)',
                    letterSpacing: '0.22em',
                    fontWeight: 800,
                    marginBottom: 4,
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: color || '#fff',
                }}
            >
                {prefix}
                {formatCurrency(Math.abs(value || 0), 0)}
            </div>
        </div>
    );
}

function DataBlock({
    label,
    count,
    accent = false,
    live,
    children,
}: {
    label: string;
    count?: number;
    accent?: boolean;
    live: string;
    children: ReactNode;
}) {
    return (
        <div
            style={{
                marginTop: 18,
                marginLeft: 16,
                marginRight: 16,
                border: '1px solid #1A1A1A',
                background: 'rgba(255,255,255,0.012)',
                borderRadius: 8,
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: accent ? 'rgba(250,204,21,0.06)' : 'transparent',
                    borderBottom: accent
                        ? '1px solid rgba(250,204,21,0.2)'
                        : 'none',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                        style={{
                            width: 6,
                            height: 6,
                            background: accent
                                ? 'var(--color-brand-primary)'
                                : 'var(--color-text-secondary)',
                            borderRadius: 1,
                        }}
                    />
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: accent ? 'var(--color-brand-primary)' : '#E5E5E5',
                            letterSpacing: '0.22em',
                        }}
                    >
                        {label}
                    </div>
                    {count != null && (
                        <div
                            style={{
                                fontSize: 9,
                                color: 'var(--color-text-tertiary)',
                                fontWeight: 700,
                                marginLeft: 4,
                            }}
                        >
                            [{count}]
                        </div>
                    )}
                </div>
                <div
                    style={{
                        fontSize: 9,
                        color: 'var(--color-text-muted)',
                        letterSpacing: '0.18em',
                        fontWeight: 700,
                    }}
                >
                    {live}
                </div>
            </div>
            {children}
        </div>
    );
}

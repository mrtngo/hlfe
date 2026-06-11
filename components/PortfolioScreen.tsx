'use client';

import { useMemo } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { useOutcomePositions } from '@/hooks/useOutcomePositions';
import { getTokenFullName } from '@/lib/constants';
import EmptyState from '@/components/EmptyState';
import SkeletonRow from '@/components/SkeletonRow';
import OutcomePositionCard from '@/components/OutcomePositionCard';
import { ScreenV2, V2Header, BigMoney, PctBadge, SectionHead, IconBtn, MarketLogo, V2 } from '@/components/V2Kit';

interface PortfolioScreenProps {
    onBack?: () => void;
    onBuyClick?: () => void;
    onTokenClick?: (symbol: string) => void;
    /** Navigate to the predictions screen (to manage outcome positions). */
    onOpenPredictions?: () => void;
}

const ALLOC_COLORS = ['#FACC15', '#22C55E', '#60A5FA', '#A78BFA', '#FB7185', '#F97316', '#10B981'];

export default function PortfolioScreen({ onBack, onBuyClick, onTokenClick, onOpenPredictions }: PortfolioScreenProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { account, positions, userDataLoading } = useHyperliquid();
    const { positions: outcomePositions } = useOutcomePositions();

    const allocation = useMemo(() => {
        const list = positions || [];
        const total = list.reduce((sum, p) => sum + Math.abs(p.size * p.markPrice), 0);
        if (total === 0) return { total: 0, slices: [] as { symbol: string; ticker: string; value: number; pct: number; color: string }[] };
        const slices = list
            .map((p, i) => {
                const value = Math.abs(p.size * p.markPrice);
                return {
                    symbol: p.symbol,
                    ticker: (p.name || p.symbol).replace(/-USD$/, '').replace(/-PERP$/, ''),
                    value,
                    pct: (value / total) * 100,
                    color: ALLOC_COLORS[i % ALLOC_COLORS.length],
                };
            })
            .sort((a, b) => b.value - a.value);
        return { total, slices };
    }, [positions]);

    const isLoading = userDataLoading;
    const isEmpty = !isLoading && (positions || []).length === 0 && outcomePositions.length === 0;
    const totalPnl = account.unrealizedPnl || 0;
    const pnlPct = account.equity > 0 ? (totalPnl / account.equity) * 100 : 0;

    return (
        <ScreenV2 pad={0}>
            <V2Header title={t.screens.portafolio.title.replace(/\.$/, '')} onBack={onBack} right={<IconBtn name="pencil" />} />

            {/* Equity */}
            <div style={{ padding: '8px 20px 0' }}>
                <div style={{ fontSize: 13, color: V2.t3, fontWeight: 600 }}>{t.screens.portafolio.totalEquity}</div>
                <div style={{ marginTop: 8 }}><BigMoney value={account.equity || 0} size={48} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                    <span style={{ color: totalPnl >= 0 ? V2.pos : V2.neg, fontWeight: 700, fontSize: 16, fontFamily: V2.mono }}>
                        {totalPnl >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totalPnl))}
                    </span>
                    <PctBadge v={pnlPct} />
                    <span style={{ color: V2.t3, fontSize: 14, fontWeight: 600 }}>{t.screens.portafolio.stats.unrealizedPnl}</span>
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: '28px 20px 0' }}>
                    <SkeletonRow count={3} height={120} radius={18} />
                </div>
            ) : isEmpty ? (
                <div style={{ padding: '24px 20px' }}>
                    <EmptyState icon={ShoppingBag} title={t.screens.portafolio.empty.title} body={t.screens.portafolio.empty.body} cta={t.screens.portafolio.empty.cta} onCtaClick={onBuyClick} />
                </div>
            ) : (
                <>
                    {/* Allocation bar */}
                    {allocation.slices.length > 0 && (
                        <div style={{ padding: '22px 20px 0' }}>
                            <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', gap: 2 }}>
                                {allocation.slices.map((s) => (
                                    <div key={s.symbol} style={{ width: `${s.pct}%`, background: s.color }} />
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                                {allocation.slices.map((s) => (
                                    <div key={s.symbol} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} />
                                        <span style={{ fontSize: 13, fontWeight: 700 }}>{s.ticker}</span>
                                        <span style={{ fontSize: 13, color: V2.t3, fontFamily: V2.mono }}>{s.pct.toFixed(0)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Perp positions */}
                    {positions.length > 0 && (
                    <>
                    <SectionHead title={t.screens.portafolio.open} right={<span style={{ fontSize: 13, color: V2.t3, fontWeight: 600 }}>{positions.length}</span>} />
                    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {positions.map((p) => {
                            const up = p.unrealizedPnl >= 0;
                            const isLong = p.side === 'long';
                            const ticker = (p.name || p.symbol).replace(/-USD$/, '').replace(/-PERP$/, '');
                            const notional = Math.abs(p.size * p.markPrice);
                            return (
                                <button
                                    type="button"
                                    key={p.symbol}
                                    onClick={() => onTokenClick?.(p.symbol)}
                                    className="v2-card"
                                    style={{ padding: '15px 16px', cursor: 'pointer', textAlign: 'left', color: V2.t1, fontFamily: V2.ui }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                                        <MarketLogo sym={p.symbol} size={42} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                <span style={{ fontSize: 17, fontWeight: 700 }}>{getTokenFullName(ticker)}</span>
                                                <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 6px', borderRadius: 5, whiteSpace: 'nowrap', letterSpacing: '0.04em', background: isLong ? V2.posSoft : V2.negSoft, color: isLong ? V2.pos : V2.neg }}>
                                                    {isLong ? 'LONG' : 'SHORT'} {p.leverage}x
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 2, fontFamily: V2.mono }}>
                                                {p.size.toLocaleString('en-US', { maximumFractionDigits: 4 })} {ticker}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 17, fontWeight: 800, fontFamily: V2.mono, color: up ? V2.pos : V2.neg }}>
                                                {up ? '+' : '-'}{formatCurrency(Math.abs(p.unrealizedPnl))}
                                            </div>
                                            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end' }}>
                                                <PctBadge v={p.unrealizedPnlPercent} size="sm" />
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${V2.hair}` }}>
                                        <PosStat label={t.screens.portafolio.positionStats.notional} value={formatCurrency(notional, 0)} />
                                        <PosStat label={t.screens.portafolio.positionStats.entry} value={formatCurrency(p.entryPrice)} />
                                        <PosStat label={t.screens.portafolio.positionStats.mark} value={formatCurrency(p.markPrice)} />
                                        <PosStat label={t.screens.portafolio.positionStats.liq} value={p.liquidationPrice > 0 ? formatCurrency(p.liquidationPrice) : '—'} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    </>
                    )}

                    {/* Prediction (HIP-4 outcome) positions */}
                    {outcomePositions.length > 0 && (
                        <>
                            <SectionHead
                                title={t.outcomeMarkets.positionsTitle}
                                right={<span style={{ fontSize: 13, color: V2.t3, fontWeight: 600 }}>{outcomePositions.length}</span>}
                            />
                            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {outcomePositions.map((p) => (
                                    <OutcomePositionCard
                                        key={p.coinRef}
                                        position={p}
                                        onManage={onOpenPredictions ? () => onOpenPredictions() : undefined}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </ScreenV2>
    );
}

function PosStat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div style={{ fontSize: 10.5, color: V2.t3, fontWeight: 600, letterSpacing: '0.02em' }}>{label}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 2, fontFamily: V2.mono }}>{value}</div>
        </div>
    );
}

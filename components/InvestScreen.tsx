'use client';

// "Invertir" — spot assets you own outright (no leverage, no liquidation, no
// funding), grouped Cripto / Acciones / Materias primas, each with price, 24h
// change and 24h volume. Buying happens on SpotAssetScreen.

import { useMemo, useState } from 'react';
import TransferModal from '@/components/TransferModal';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { useInvestMarkets, type InvestMarket } from '@/hooks/useInvestMarkets';
import type { InvestCategory } from '@/lib/invest/assets';
import { haptic } from '@/lib/haptics';
import { ScreenV2, V2Header, MarketLogo, PctBadge, Icon, V2 } from '@/components/V2Kit';

function compactUsd(v: number): string {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1).replace('.', ',')} mil M`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1).replace('.', ',')} M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)} mil`;
    return `$${v.toFixed(0)}`;
}

export default function InvestScreen({
    onBack,
    onOpenAsset,
}: {
    onBack?: () => void;
    onOpenAsset: (key: string) => void;
}) {
    const { t } = useLanguage();
    const iv = t.invest;
    const { formatCurrency } = useCurrency();
    const { account, spotBalances, refreshAccountData } = useHyperliquid();
    // Trading (perp) → Spot transfer sheet.
    const [showMove, setShowMove] = useState(false);
    const { data: markets, isLoading, isError } = useInvestMarkets();

    // Spot USDC = the money available to invest; holdings valued at mark.
    const spotUsdc = parseFloat(spotBalances?.find((b) => b.coin === 'USDC')?.total || '0') || account?.spotBalance || 0;
    const holdingsValue = useMemo(() => {
        if (!markets) return 0;
        return markets.reduce((sum, m) => {
            const bal = spotBalances?.find((b) => b.token === m.tokenIndex);
            return sum + (bal ? parseFloat(bal.total) * m.price : 0);
        }, 0);
    }, [markets, spotBalances]);

    const groups: { cat: InvestCategory; label: string }[] = [
        { cat: 'crypto', label: iv.catCrypto },
        { cat: 'stocks', label: iv.catStocks },
        { cat: 'commodities', label: iv.catCommodities },
    ];

    return (
        <ScreenV2 pad={28}>
            <V2Header title={iv.title} sub={iv.sub} onBack={onBack} />

            <div style={{ padding: '0 20px' }}>
                {/* Pocket summary */}
                <div className="v2-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: V2.t3, fontWeight: 600 }}>{iv.invested}</div>
                        <div className="font-mono" style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{formatCurrency(holdingsValue)}</div>
                        <div style={{ fontSize: 12, color: V2.t3, marginTop: 4 }}>
                            {iv.available} <span className="font-mono" style={{ color: V2.t2 }}>{formatCurrency(spotUsdc)}</span>
                        </div>
                    </div>
                    {(
                        <button
                            onClick={() => { haptic.light(); setShowMove(true); }}
                            style={{ padding: '10px 14px', borderRadius: 12, border: `1px solid ${V2.hair2}`, background: 'transparent', color: V2.t1, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: V2.ui, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                            <Icon name="repeat" size={14} color={V2.t1} /> {iv.moveFunds}
                        </button>
                    )}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: V2.t3, lineHeight: 1.5 }}>{iv.explainer}</div>

                {isLoading && <div style={{ padding: '40px 0', textAlign: 'center', color: V2.t3, fontSize: 13 }}>{iv.loading}</div>}
                {isError && <div style={{ padding: '40px 0', textAlign: 'center', color: V2.t3, fontSize: 13 }}>{iv.error}</div>}

                {markets &&
                    groups.map(({ cat, label }) => {
                        const rows = markets.filter((m) => m.category === cat);
                        if (rows.length === 0) return null;
                        return (
                            <div key={cat} style={{ marginTop: 20 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: V2.t2, marginBottom: 8, letterSpacing: '0.02em' }}>{label}</div>
                                <div className="v2-card" style={{ overflow: 'hidden' }}>
                                    {rows.map((m, i) => (
                                        <AssetRow key={m.key} m={m} last={i === rows.length - 1} volLabel={iv.vol} onOpen={() => onOpenAsset(m.key)} formatCurrency={formatCurrency} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
            </div>
            <TransferModal
                isOpen={showMove}
                onClose={() => { setShowMove(false); refreshAccountData(); }}
                defaultToPerp={false}
                spotLabel={t.bolsillos.spotName}
                perpLabel={t.bolsillos.perpName}
            />
        </ScreenV2>
    );
}

function AssetRow({
    m,
    last,
    volLabel,
    onOpen,
    formatCurrency,
}: {
    m: InvestMarket;
    last: boolean;
    volLabel: string;
    onOpen: () => void;
    formatCurrency: (v: number, dp?: number) => string;
}) {
    const dp = m.price >= 100 ? 2 : m.price >= 1 ? 3 : 5;
    return (
        <button
            onClick={() => { haptic.light(); onOpen(); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: 'transparent', border: 'none', borderBottom: last ? 'none' : `1px solid ${V2.hair}`, cursor: 'pointer', color: V2.t1, fontFamily: V2.ui, textAlign: 'left' }}
        >
            <MarketLogo sym={m.logo} size={38} />
            <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{m.ticker}</span>
                <span style={{ display: 'block', fontSize: 12, color: V2.t3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.name} · {volLabel} <span className="font-mono">{compactUsd(m.volume24h)}</span>
                </span>
            </span>
            <span style={{ textAlign: 'right' }}>
                <span className="font-mono" style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{formatCurrency(m.price, dp)}</span>
                <span style={{ display: 'inline-block', marginTop: 3 }}><PctBadge v={m.change24h} size="sm" /></span>
            </span>
        </button>
    );
}

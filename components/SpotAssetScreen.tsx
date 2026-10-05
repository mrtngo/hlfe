'use client';

// One spot asset: price + chart, what you own, and buy / sell by dollar amount
// from the Inversiones (spot) pocket. Real Hyperliquid spot orders routed by
// exact pair id (see lib/invest/assets for why), slippage capped at 3%.

import { useMemo, useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { useInvestMarkets } from '@/hooks/useInvestMarkets';
import { INVEST_SLIPPAGE } from '@/lib/invest/assets';
import { MIN_NOTIONAL_VALUE } from '@/lib/constants/trading';
import { haptic } from '@/lib/haptics';
import TokenCandleChart from '@/components/TokenCandleChart';
import TransferModal from '@/components/TransferModal';
import { ScreenV2, V2Header, MarketLogo, BigMoney, PctBadge, V2 } from '@/components/V2Kit';

function roundDown(size: number, decimals: number): number {
    const f = Math.pow(10, decimals);
    return Math.floor(size * f) / f;
}

export default function SpotAssetScreen({
    assetKey,
    onBack,
    needsAccount,
    onSignIn,
}: {
    assetKey: string;
    onBack?: () => void;
    needsAccount?: boolean;
    onSignIn?: () => void;
}) {
    const { t } = useLanguage();
    const iv = t.invest;
    const { formatCurrency } = useCurrency();
    const { spotBalances, placeOrder, refreshAccountData } = useHyperliquid();
    const { data: markets } = useInvestMarkets();
    const m = useMemo(() => markets?.find((x) => x.key === assetKey), [markets, assetKey]);

    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [showMove, setShowMove] = useState(false);

    if (!m) {
        return (
            <ScreenV2 pad={28}>
                <V2Header title={iv.title} onBack={onBack} />
                <div style={{ padding: '40px 20px', textAlign: 'center', color: V2.t3, fontSize: 13 }}>{iv.loading}</div>
            </ScreenV2>
        );
    }

    const spotUsdc = parseFloat(spotBalances?.find((b) => b.coin === 'USDC')?.total || '0') || 0;
    const owned = parseFloat(spotBalances?.find((b) => b.token === m.tokenIndex)?.total || '0') || 0;
    const ownedUsd = owned * m.price;
    const usd = parseFloat(amount.replace(',', '.')) || 0;
    const maxUsd = side === 'buy' ? spotUsdc : ownedUsd;
    const size = m.price > 0 ? roundDown(usd / m.price, m.szDecimals) : 0;
    const belowMin = usd > 0 && usd < MIN_NOTIONAL_VALUE;
    const tooMuch = usd > maxUsd + 0.01;
    const canSubmit = usd >= MIN_NOTIONAL_VALUE && !tooMuch && size > 0 && !busy;
    const dp = m.price >= 100 ? 2 : m.price >= 1 ? 3 : 5;

    const submit = async () => {
        if (!canSubmit) return;
        haptic.medium();
        setBusy(true);
        setMsg(null);
        try {
            const res = await placeOrder(m.pair, side, 'market', size, undefined, undefined, false, INVEST_SLIPPAGE);
            if (res?.filled) {
                haptic.success();
                setAmount('');
                setMsg({ ok: true, text: side === 'buy' ? iv.bought.replace('{t}', m.ticker) : iv.sold.replace('{t}', m.ticker) });
                setTimeout(() => refreshAccountData(), 500);
                setTimeout(() => refreshAccountData(), 3000);
            } else {
                haptic.error();
                setMsg({ ok: false, text: res?.error || iv.failed });
            }
        } catch (e) {
            haptic.error();
            setMsg({ ok: false, text: e instanceof Error ? e.message : iv.failed });
        } finally {
            setBusy(false);
        }
    };

    return (
        <ScreenV2 pad={28}>
            <V2Header title={m.ticker} sub={m.name} onBack={onBack} />

            <div style={{ padding: '0 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <MarketLogo sym={m.logo} size={48} />
                    <div>
                        <BigMoney value={m.price} size={36} decimals={dp} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                            <PctBadge v={m.change24h} />
                            <span style={{ fontSize: 12, color: V2.t3 }}>{iv.vol} <span className="font-mono">${Math.round(m.volume24h).toLocaleString('es-CO')}</span></span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 12, padding: '0 8px' }}>
                <TokenCandleChart symbol={m.pair} isStock={false} height={170} />
            </div>

            <div style={{ padding: '0 20px' }}>
                {/* What you own */}
                <div className="v2-card" style={{ padding: 14, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13.5, color: V2.t2, fontWeight: 600 }}>{iv.youOwn}</span>
                    <span style={{ textAlign: 'right' }}>
                        <span className="font-mono" style={{ display: 'block', fontSize: 16, fontWeight: 800 }}>{formatCurrency(ownedUsd)}</span>
                        <span className="font-mono" style={{ display: 'block', fontSize: 11.5, color: V2.t3, marginTop: 2 }}>
                            {owned.toLocaleString('es-CO', { maximumFractionDigits: m.szDecimals })} {m.ticker}
                        </span>
                    </span>
                </div>

                {/* Buy / sell */}
                <div className="v2-card" style={{ padding: 16, marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
                        {(['buy', 'sell'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => { haptic.light(); setSide(s); setAmount(''); setMsg(null); }}
                                style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: V2.ui, fontWeight: 700, fontSize: 13.5, background: side === s ? V2.cardSolid : 'transparent', color: side === s ? (s === 'buy' ? V2.pos : V2.neg) : V2.t3 }}
                            >
                                {s === 'buy' ? iv.buy : iv.sell}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '12px 14px', borderRadius: 12, border: `1px solid ${tooMuch ? V2.neg : V2.hair2}` }}>
                        <span className="font-mono" style={{ color: V2.t3, fontSize: 18 }}>$</span>
                        <input
                            inputMode="decimal"
                            value={amount}
                            onChange={(ev) => { setAmount(ev.target.value.replace(/[^0-9.,]/g, '')); setMsg(null); }}
                            placeholder="0"
                            className="font-mono"
                            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: V2.t1, fontSize: 22, fontWeight: 700 }}
                        />
                        <span style={{ fontSize: 12, color: V2.t3 }}>USD</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        {[0.25, 0.5, 1].map((f) => (
                            <button
                                key={f}
                                disabled={maxUsd <= 0}
                                onClick={() => { haptic.light(); setAmount((Math.floor(maxUsd * f * 100) / 100).toString()); }}
                                style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: `1px solid ${V2.hair}`, background: 'transparent', color: V2.t2, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: V2.ui }}
                            >
                                {f === 1 ? iv.max : `${f * 100}%`}
                            </button>
                        ))}
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12.5, color: tooMuch || belowMin ? V2.neg : V2.t3, lineHeight: 1.5 }}>
                        {tooMuch
                            ? side === 'buy' ? iv.notEnoughCash : iv.notEnoughOwned
                            : belowMin
                              ? iv.min.replace('{min}', formatCurrency(MIN_NOTIONAL_VALUE, 0))
                              : size > 0
                                ? `${side === 'buy' ? iv.youGet : iv.youSell} ≈ ${size.toLocaleString('es-CO', { maximumFractionDigits: m.szDecimals })} ${m.ticker}`
                                : side === 'buy' ? `${iv.available} ${formatCurrency(spotUsdc)}` : `${iv.youOwn} ${formatCurrency(ownedUsd)}`}
                    </div>

                    {needsAccount ? (
                        <button onClick={onSignIn} style={{ ...cta, background: V2.accent, color: V2.accentInk }}>{iv.signIn}</button>
                    ) : side === 'buy' && spotUsdc < MIN_NOTIONAL_VALUE ? (
                        <button onClick={() => { haptic.light(); setShowMove(true); }} style={{ ...cta, background: V2.accent, color: V2.accentInk }}>{iv.moveToInvest}</button>
                    ) : (
                        <button onClick={submit} disabled={!canSubmit} style={{ ...cta, background: side === 'buy' ? V2.accent : V2.negSoft, color: side === 'buy' ? V2.accentInk : V2.neg, opacity: canSubmit ? 1 : 0.5 }}>
                            {busy ? iv.processing : side === 'buy' ? iv.buyCta.replace('{t}', m.ticker) : iv.sellCta.replace('{t}', m.ticker)}
                        </button>
                    )}

                    {msg && (
                        <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 12, fontSize: 13, lineHeight: 1.45, background: msg.ok ? V2.posSoft : V2.negSoft, color: msg.ok ? V2.pos : V2.t1 }}>
                            {msg.text}
                        </div>
                    )}
                    <div style={{ marginTop: 10, fontSize: 11.5, color: V2.t3, lineHeight: 1.5 }}>
                        {m.category === 'stocks' ? iv.stockNote : iv.spotNote}
                    </div>
                </div>
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

const cta: React.CSSProperties = {
    width: '100%', marginTop: 14, padding: 16, borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: V2.ui, fontWeight: 800, fontSize: 15.5,
};

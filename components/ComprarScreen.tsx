'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivy } from '@privy-io/react-auth';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import TokenLogo from '@/components/TokenLogo';
import MiniChart from '@/components/MiniChart';
import TradingSetupWizard from '@/components/TradingSetupWizard';
import DcaScheduleSheet from '@/components/DcaScheduleSheet';
import TransferModal from '@/components/TransferModal';
import { MIN_NOTIONAL_VALUE } from '@/lib/constants';
import { formatUsdPrice } from '@/lib/format/price';
import { Loader2, ArrowDown, ArrowUpRight, AlertCircle, CheckCircle2, Sliders, Repeat, ChevronRight, Zap } from 'lucide-react';

interface ComprarScreenProps {
    onOpenAdvanced: () => void;
    onDeposit?: () => void;
}

const QUICK_AMOUNTS = [25, 50, 100, 250];
const FEATURED_SYMBOLS = ['BTC', 'ETH', 'SOL', 'DOGE', 'AVAX', 'XRP', 'ADA', 'BNB'];

export default function ComprarScreen({ onOpenAdvanced, onDeposit }: ComprarScreenProps) {
    const { t } = useLanguage();
    const { ready, authenticated, login } = usePrivy();
    const {
        connected,
        markets,
        account,
        placeOrder,
        refreshAccountData,
        selectedMarket: globalSelectedMarket,
        setSelectedMarket,
    } = useHyperliquid();

    const initialSymbol = useMemo(() => {
        if (!globalSelectedMarket) return 'BTC';
        const name = globalSelectedMarket.replace(/-USD$/, '').replace(/-PERP$/, '');
        return name || 'BTC';
    }, [globalSelectedMarket]);

    const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);

    useEffect(() => {
        if (!globalSelectedMarket) return;
        const name = globalSelectedMarket.replace(/-USD$/, '').replace(/-PERP$/, '');
        if (name && markets.some(m => m.name === name)) setSelectedSymbol(name);
    }, [globalSelectedMarket, markets]);

    const [amountUsd, setAmountUsd] = useState<string>('');
    const [showAll, setShowAll] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [showDcaSheet, setShowDcaSheet] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    const featuredMarkets = useMemo(() => {
        if (showAll) {
            return [...markets]
                .filter(m => m.price && m.price > 0 && !m.isStock)
                .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
        }
        const map = new Map(markets.map(m => [m.name, m]));
        return FEATURED_SYMBOLS
            .map(s => map.get(s))
            .filter((m): m is NonNullable<typeof m> => !!m && (m.price ?? 0) > 0);
    }, [markets, showAll]);

    const selectedMarket = useMemo(
        () => markets.find(m => m.name === selectedSymbol),
        [markets, selectedSymbol]
    );

    const topMovers = useMemo(
        () => [...markets]
            .filter(m => !m.isStock && (m.price ?? 0) > 0 && m.change24h !== undefined)
            .sort((a, b) => Math.abs(b.change24h || 0) - Math.abs(a.change24h || 0))
            .slice(0, 5),
        [markets]
    );

    const availableUsd = account?.availableMargin ?? 0;
    const spotUsd = account?.spotBalance ?? 0;
    const amountNum = parseFloat(amountUsd || '0');
    const price = selectedMarket?.price || 0;
    const tokenAmount = price > 0 ? amountNum / price : 0;
    const change = selectedMarket?.change24h || 0;
    const positive = change >= 0;

    const isAmountValid = amountNum >= MIN_NOTIONAL_VALUE && amountNum <= availableUsd;
    const canSubmit = ready && authenticated && connected && !!selectedMarket && isAmountValid && !submitting;

    useEffect(() => {
        if (selectedMarket) setSelectedMarket(selectedMarket.symbol);
    }, [selectedMarket, setSelectedMarket]);

    const handleSubmit = async () => {
        if (!canSubmit || !selectedMarket) return;
        // Agent + builder-fee provisioning happens silently inside placeOrder.
        setSubmitting(true);
        setError('');
        setSuccess('');
        try {
            const result = await placeOrder(selectedMarket.symbol, 'buy', 'market', tokenAmount, undefined, 1);
            if (result.filled) {
                setSuccess(t.buy.successMessage);
                setAmountUsd('');
                setTimeout(() => refreshAccountData(), 500);
                setTimeout(() => setSuccess(''), 3500);
            } else {
                setError(t.buy.errorGeneric);
            }
        } catch (e: any) {
            console.error('Buy order error:', e);
            setError(e?.message || t.buy.errorGeneric);
        } finally {
            setSubmitting(false);
        }
    };

    if (markets.length === 0) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
            </div>
        );
    }

    const formatPrice = (p: number, market = selectedMarket) => formatUsdPrice(p, market);

    return (
        <div className="relative pb-12">
            {/* Atmospheric gradient mesh background */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 -z-10"
                style={{
                    background:
                        'radial-gradient(70% 50% at 50% 0%, rgba(227,179,76,0.08) 0%, transparent 55%), radial-gradient(60% 40% at 100% 30%, rgba(124, 58, 237, 0.05) 0%, transparent 50%), radial-gradient(50% 40% at 0% 70%, rgba(34, 197, 94, 0.04) 0%, transparent 50%), #000',
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-xl mx-auto px-4"
            >
                {/* Status bar — kicker + available balance chip */}
                <div className="flex items-center justify-between pt-2 pb-4">
                    <div
                        className="text-[10px] uppercase tracking-[0.22em] font-bold flex items-center gap-1.5"
                        style={{ color: 'var(--color-text-tertiary)' }}
                    >
                        <Zap className="w-3 h-3" style={{ color: 'var(--color-brand-primary)' }} />
                        Comprar
                    </div>
                    {ready && authenticated && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            <span className="dot-live" />
                            <span
                                className="tabular-mono text-[11px] font-semibold"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                Disponible
                            </span>
                            <span
                                className="tabular-mono text-[11px] font-bold"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                ${availableUsd.toFixed(2)}
                            </span>
                        </motion.div>
                    )}
                </div>

                {/* HERO ASSET CARD — selected asset shines */}
                <motion.section
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="surface-soft grain rounded-3xl overflow-hidden relative mb-3"
                    style={{ position: 'relative' }}
                >
                    {/* color glow behind hero, asset-specific */}
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            background: positive
                                ? 'radial-gradient(70% 50% at 100% 0%, rgba(34, 197, 94, 0.08) 0%, transparent 55%)'
                                : 'radial-gradient(70% 50% at 100% 0%, rgba(239, 68, 68, 0.06) 0%, transparent 55%)',
                        }}
                    />

                    <div className="relative px-5 pt-5 pb-3">
                        {/* asset header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <TokenLogo symbol={selectedSymbol} size={44} />
                                    <span
                                        className="absolute inset-0 rounded-full"
                                        style={{
                                            boxShadow: '0 0 24px -4px rgba(227, 179, 76, 0.3)',
                                            pointerEvents: 'none',
                                        }}
                                    />
                                </div>
                                <div>
                                    <div
                                        className="text-[10px] uppercase tracking-[0.18em] font-bold mb-0.5"
                                        style={{ color: 'var(--color-text-tertiary)' }}
                                    >
                                        Comprando
                                    </div>
                                    <div
                                        className="font-display"
                                        style={{
                                            fontSize: '1.5rem',
                                            lineHeight: 1,
                                            color: 'var(--color-text-primary)',
                                            fontVariationSettings: '"opsz" 144, "SOFT" 30, "wght" 600',
                                            letterSpacing: '-0.025em',
                                        }}
                                    >
                                        {selectedSymbol}
                                        <span
                                            className="font-display-italic"
                                            style={{
                                                fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 400',
                                                color: 'var(--color-text-tertiary)',
                                                fontSize: '0.95rem',
                                                marginLeft: '0.4rem',
                                            }}
                                        >
                                            a precio de mercado
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <span
                                className="tabular-mono text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
                                style={{
                                    backgroundColor: positive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                                    color: positive ? 'var(--color-positive)' : 'var(--color-negative)',
                                    border: positive ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)',
                                }}
                            >
                                {positive ? '↑' : '↓'} {Math.abs(change).toFixed(2)}%
                            </span>
                        </div>

                        {/* live price + sparkline */}
                        <div className="flex items-end justify-between mb-3 gap-3">
                            <div>
                                <div
                                    className="text-[10px] uppercase tracking-[0.18em] font-bold mb-1"
                                    style={{ color: 'var(--color-text-tertiary)' }}
                                >
                                    Precio · 24h
                                </div>
                                <div
                                    className="tabular-mono font-bold"
                                    style={{
                                        fontSize: '2rem',
                                        lineHeight: 1,
                                        color: 'var(--color-text-primary)',
                                        letterSpacing: '-0.025em',
                                    }}
                                >
                                    ${formatPrice(price)}
                                </div>
                            </div>
                            <div
                                style={{ width: 110, height: 44 }}
                                className="flex-shrink-0 opacity-90"
                            >
                                {selectedMarket && (
                                    <MiniChart symbol={selectedMarket.symbol} isStock={false} />
                                )}
                            </div>
                        </div>

                        {/* hairline */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="my-4" />

                        {/* AMOUNT input — integrated into hero */}
                        <div className="flex items-center justify-between mb-3">
                            <span
                                className="text-[10px] uppercase tracking-[0.18em] font-bold"
                                style={{ color: 'var(--color-text-tertiary)' }}
                            >
                                Cuánto querés invertir
                            </span>
                            {amountNum > 0 && (
                                <span className="text-[10px] tabular-mono" style={{ color: 'var(--color-text-tertiary)' }}>
                                    ≈ {tokenAmount.toLocaleString('en-US', { maximumFractionDigits: 6 })} {selectedSymbol}
                                </span>
                            )}
                        </div>

                        <div className="flex items-baseline justify-center gap-2 mb-4 py-2">
                            <span
                                className="font-display-italic"
                                style={{
                                    fontSize: '2.5rem',
                                    color: amountNum > 0 ? 'var(--color-brand-primary)' : 'var(--color-text-tertiary)',
                                    lineHeight: 1,
                                    fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 400',
                                    transition: 'color 0.3s',
                                }}
                            >
                                $
                            </span>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={amountUsd}
                                onChange={(e) => {
                                    const v = e.target.value.replace(/[^\d.]/g, '');
                                    const parts = v.split('.');
                                    if (parts.length > 2) return;
                                    setAmountUsd(v);
                                    setError('');
                                }}
                                className="input-clean text-center"
                                style={{
                                    fontSize: '4.5rem',
                                    fontWeight: 700,
                                    lineHeight: 1,
                                    letterSpacing: '-0.05em',
                                    maxWidth: '10ch',
                                    color: amountNum > 0 ? '#fff' : 'rgba(255,255,255,0.18)',
                                }}
                            />
                        </div>

                        {/* Quick chips */}
                        <div className="grid grid-cols-4 gap-2">
                            {QUICK_AMOUNTS.map((v) => {
                                const active = amountUsd === String(v);
                                return (
                                    <motion.button
                                        key={v}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => { setAmountUsd(String(v)); setError(''); }}
                                        className="py-2.5 rounded-xl text-[13px] tabular-mono font-bold border-none outline-none transition-colors"
                                        style={{
                                            backgroundColor: active ? 'rgba(227, 179, 76, 0.14)' : 'rgba(255,255,255,0.04)',
                                            color: active ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                                            border: active ? '1px solid rgba(227, 179, 76, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                                        }}
                                    >
                                        ${v}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                </motion.section>

                {/* Status messages */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            className="flex items-start gap-2 p-3 rounded-xl mb-3 text-sm"
                            style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: 'var(--color-negative)',
                            }}
                        >
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            className="flex items-center gap-2 p-3 rounded-xl mb-3 text-sm"
                            style={{
                                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                                border: '1px solid rgba(34, 197, 94, 0.25)',
                                color: 'var(--color-positive)',
                            }}
                        >
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            <span>{success}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* PRIMARY CTA */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }} className="mb-2">
                    {!ready ? (
                        <button disabled className="w-full py-4 rounded-2xl font-bold border-none outline-none"
                            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                            <Loader2 className="w-5 h-5 animate-spin inline" />
                        </button>
                    ) : !authenticated ? (
                        <button onClick={() => login()} className="cta-brand w-full py-4 rounded-2xl text-[15px] font-bold tracking-tight flex items-center justify-center gap-2">
                            {t.buy.connectWallet}
                            <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                    ) : availableUsd < MIN_NOTIONAL_VALUE ? (
                        <div>
                            <div className="flex items-start gap-2 p-3 rounded-xl mb-3 text-sm"
                                style={{
                                    backgroundColor: 'rgba(227, 179, 76, 0.06)',
                                    border: '1px solid rgba(227, 179, 76, 0.2)',
                                    color: 'var(--color-text-secondary)',
                                }}>
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                                <span>{t.buy.depositFirst}</span>
                            </div>
                            {spotUsd > 0 ? (
                                <button onClick={() => setShowTransferModal(true)}
                                    className="cta-brand w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 tracking-tight">
                                    <ArrowDown className="w-5 h-5" strokeWidth={2.5} />
                                    {t.buy.moveSpotToTradeCta.replace('{amount}', formatUsdPrice(spotUsd))}
                                </button>
                            ) : (
                                <button onClick={onDeposit}
                                className="cta-brand w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 tracking-tight">
                                    <ArrowDown className="w-5 h-5" strokeWidth={2.5} />
                                    {t.buy.noBalanceCta}
                                </button>
                            )}
                        </div>
                    ) : (
                        <button onClick={handleSubmit} disabled={!canSubmit}
                            className={canSubmit ? 'cta-brand w-full py-4 rounded-2xl text-[15px] font-bold tracking-tight flex items-center justify-center gap-2' : 'w-full py-4 rounded-2xl text-[15px] font-bold tracking-tight flex items-center justify-center gap-2 border-none outline-none'}
                            style={!canSubmit ? {
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                color: 'var(--color-text-tertiary)',
                                cursor: 'not-allowed',
                                border: '1px solid rgba(255,255,255,0.06)',
                            } : undefined}>
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {t.buy.loading}
                                </>
                            ) : amountNum > 0 && amountNum < MIN_NOTIONAL_VALUE ? `${t.buy.minAmount}` :
                                amountNum > availableUsd ? t.buy.insufficientBalance : (
                                    <>
                                        {t.buy.buyAction} {selectedSymbol}
                                        {amountNum >= MIN_NOTIONAL_VALUE && <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />}
                                    </>
                                )}
                        </button>
                    )}

                    {/* DCA accent */}
                    <AnimatePresence>
                        {ready && authenticated && selectedMarket && amountNum >= MIN_NOTIONAL_VALUE && (
                            <motion.button
                                initial={{ opacity: 0, y: -4, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -4, height: 0 }}
                                transition={{ duration: 0.25 }}
                                onClick={() => setShowDcaSheet(true)}
                                whileTap={{ scale: 0.98 }}
                                className="w-full mt-3 py-3 px-4 flex items-center justify-center gap-2.5 rounded-2xl border-none outline-none"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    border: '1px dashed rgba(227, 179, 76, 0.35)',
                                    color: 'var(--color-text-primary)',
                                }}>
                                <Repeat className="w-4 h-4" style={{ color: 'var(--color-brand-primary)' }} />
                                <span className="text-[13px] font-semibold">{t.dca.makeRecurring}</span>
                                <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--color-text-tertiary)' }} />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ASSET PICKER — bigger cards with sparklines */}
                <section className="mt-7 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2
                                className="font-display"
                                style={{
                                    fontSize: '1.125rem',
                                    color: 'var(--color-text-primary)',
                                    fontVariationSettings: '"opsz" 36, "SOFT" 50, "wght" 600',
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                Otros activos
                            </h2>
                            <div className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                                Cambiá lo que querés comprar
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="text-[11px] uppercase tracking-[0.12em] font-bold border-none outline-none bg-transparent flex items-center gap-0.5"
                            style={{ color: 'var(--color-brand-primary)' }}
                        >
                            {showAll ? 'Menos' : 'Ver todos'}
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        {featuredMarkets.slice(0, showAll ? 16 : 6).filter(m => m.name !== selectedSymbol).slice(0, showAll ? 14 : 6).map((m, idx) => {
                            const ch = m.change24h || 0;
                            const isUp = ch >= 0;
                            return (
                                <motion.button
                                    key={m.symbol}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 + idx * 0.03, duration: 0.3 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setSelectedSymbol(m.name)}
                                    className="text-left rounded-2xl p-3.5 border-none outline-none relative overflow-hidden grain"
                                    style={{
                                        backgroundColor: 'rgba(255,255,255,0.025)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <TokenLogo symbol={m.name} size={28} />
                                        <span
                                            className="tabular-mono text-[10px] font-bold"
                                            style={{ color: isUp ? 'var(--color-positive)' : 'var(--color-negative)' }}
                                        >
                                            {isUp ? '+' : ''}{ch.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className="flex items-baseline justify-between gap-1 mb-1.5">
                                        <span
                                            className="text-[14px] font-bold"
                                            style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}
                                        >
                                            {m.name}
                                        </span>
                                    </div>
                                    <div
                                        className="tabular-mono text-[12px] mb-2"
                                        style={{ color: 'var(--color-text-secondary)' }}
                                    >
                                        ${formatPrice(m.price || 0, m)}
                                    </div>
                                    <div style={{ height: 26 }}>
                                        <MiniChart symbol={m.symbol} isStock={false} />
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </section>

                {/* MERCADO HOY — packs the dead space, gives beginners a tour */}
                {topMovers.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="mb-6"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2
                                    className="font-display"
                                    style={{
                                        fontSize: '1.125rem',
                                        color: 'var(--color-text-primary)',
                                        fontVariationSettings: '"opsz" 36, "SOFT" 50, "wght" 600',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    Mercado{' '}
                                    <span
                                        className="font-display-italic"
                                        style={{
                                            fontVariationSettings: '"opsz" 36, "SOFT" 100, "wght" 500',
                                            color: 'var(--color-brand-primary)',
                                        }}
                                    >
                                        hoy
                                    </span>
                                </h2>
                                <div className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                                    Los que más se movieron en 24h
                                </div>
                            </div>
                            <span className="dot-live" />
                        </div>

                        <div className="surface-soft grain rounded-2xl overflow-hidden">
                            {topMovers.map((m, idx) => {
                                const ch = m.change24h || 0;
                                const isUp = ch >= 0;
                                return (
                                    <button
                                        key={m.symbol}
                                        onClick={() => setSelectedSymbol(m.name)}
                                        className="w-full flex items-center gap-3 px-4 py-3 border-none outline-none bg-transparent text-left transition-colors hover:bg-white/5"
                                        style={{
                                            borderBottom: idx < topMovers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                        }}
                                    >
                                        <TokenLogo symbol={m.name} size={32} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-bold text-[14px]" style={{ color: 'var(--color-text-primary)' }}>{m.name}</span>
                                                <span className="tabular-mono text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                                                    ${formatPrice(m.price || 0, m)}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ width: 70, height: 26 }} className="flex-shrink-0">
                                            <MiniChart symbol={m.symbol} isStock={false} />
                                        </div>
                                        <span
                                            className="tabular-mono text-[12px] font-bold w-14 text-right"
                                            style={{ color: isUp ? 'var(--color-positive)' : 'var(--color-negative)' }}
                                        >
                                            {isUp ? '+' : ''}{ch.toFixed(2)}%
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.section>
                )}

                {/* Modo avanzado — refined footer link */}
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    onClick={onOpenAdvanced}
                    className="w-full py-5 flex items-center justify-center gap-2 border-none outline-none bg-transparent"
                >
                    <Sliders className="w-3.5 h-3.5" style={{ color: 'var(--color-text-tertiary)' }} />
                    <span
                        className="text-[12px]"
                        style={{ color: 'var(--color-text-tertiary)' }}
                    >
                        {t.buy.advancedLink}
                    </span>
                    <span
                        className="text-[12px] font-bold flex items-center gap-1"
                        style={{ color: 'var(--color-brand-primary)' }}
                    >
                        {t.buy.advancedLinkCta}
                        <ArrowUpRight className="w-3 h-3" />
                    </span>
                </motion.button>

                <TransferModal
                    isOpen={showTransferModal}
                    onClose={() => {
                        setShowTransferModal(false);
                        refreshAccountData();
                    }}
                    defaultToPerp={true}
                    spotLabel={t.outcomeMarkets.spotBalanceLabel}
                    perpLabel={t.outcomeMarkets.perpBalanceLabel}
                    helpText={t.transfer.perpPrompt}
                />
                <TradingSetupWizard isOpen={showSetupWizard} onClose={() => setShowSetupWizard(false)} />
                {selectedMarket && (
                    <DcaScheduleSheet
                        isOpen={showDcaSheet}
                        onClose={() => setShowDcaSheet(false)}
                        symbol={selectedSymbol}
                        marketSymbol={selectedMarket.symbol}
                        amountUsd={amountNum}
                    />
                )}
            </motion.div>
        </div>
    );
}

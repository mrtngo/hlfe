'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import MiniChart from '@/components/MiniChart';
import TokenLogo from '@/components/TokenLogo';
import {
    BarChart3,
    Target,
    Trophy,
    AlertTriangle,
    ArrowUpRight,
    Coins,
    Zap,
    TrendingUp,
} from 'lucide-react';

interface AdvancedMenuProps {
    onSelectPerps: () => void;
    onSelectPredictions: () => void;
    onSelectLeaderboard: () => void;
    onSelectSpot: () => void;
    onSelectBolsillos?: () => void;
    onSelectMarkets?: () => void;
}

export default function AdvancedMenu({
    onSelectPerps,
    onSelectPredictions,
    onSelectLeaderboard,
    onSelectSpot,
    onSelectBolsillos,
    onSelectMarkets,
}: AdvancedMenuProps) {
    const { t } = useLanguage();
    const { markets } = useHyperliquid();

    // Featured perp for the Trading card
    const btcMarket = markets.find(m => m.name === 'BTC');
    const btcPrice = btcMarket?.price || 0;
    const btcChange = btcMarket?.change24h || 0;
    const btcUp = btcChange >= 0;

    return (
        <div className="relative pb-12">
            {/* Atmospheric gradient mesh */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 -z-10"
                style={{
                    background:
                        'radial-gradient(70% 50% at 0% 0%, rgba(250,204,21,0.06) 0%, transparent 55%), radial-gradient(60% 40% at 100% 20%, rgba(124, 58, 237, 0.06) 0%, transparent 50%), radial-gradient(50% 40% at 0% 70%, rgba(239, 68, 68, 0.04) 0%, transparent 50%), #000',
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-xl mx-auto px-4"
            >
                {/* Status bar */}
                <div className="flex items-center justify-between pt-2 pb-4">
                    <div
                        className="text-[10px] uppercase tracking-[0.22em] font-bold flex items-center gap-1.5"
                        style={{ color: 'var(--color-text-tertiary)' }}
                    >
                        <Zap className="w-3 h-3" style={{ color: 'var(--color-brand-primary)' }} />
                        Modo Avanzado
                    </div>
                    <div
                        className="text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-1 rounded-full"
                        style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            color: 'var(--color-negative)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                        }}
                    >
                        Pro
                    </div>
                </div>

                {/* Editorial header */}
                <header className="pb-5">
                    <h1
                        className="font-display"
                        style={{
                            fontSize: '2.5rem',
                            lineHeight: 1,
                            color: 'var(--color-text-primary)',
                            fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 600',
                            letterSpacing: '-0.035em',
                        }}
                    >
                        Para los que{' '}
                        <span
                            className="font-display-italic"
                            style={{
                                fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 500',
                                color: 'var(--color-brand-primary)',
                            }}
                        >
                            saben
                        </span>
                    </h1>
                    <p
                        className="mt-3 text-[14px] max-w-md"
                        style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}
                    >
                        {t.advanced.subtitle}
                    </p>
                </header>

                {/* PERPETUOS — featured rich card with live BTC chart */}
                <motion.button
                    whileTap={{ scale: 0.985 }}
                    onClick={onSelectPerps}
                    className="surface-soft grain text-left rounded-2xl border-none outline-none w-full mb-3 overflow-hidden"
                    style={{ position: 'relative' }}
                >
                    {/* yellow glow */}
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            background: 'radial-gradient(70% 50% at 100% 0%, rgba(250,204,21,0.08) 0%, transparent 55%)',
                        }}
                    />

                    <div className="relative p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{
                                        backgroundColor: 'rgba(250, 204, 21, 0.1)',
                                        border: '1px solid rgba(250, 204, 21, 0.25)',
                                        color: 'var(--color-brand-primary)',
                                    }}
                                >
                                    <BarChart3 className="w-5 h-5" strokeWidth={1.75} />
                                </div>
                                <div>
                                    <div
                                        className="text-[9px] uppercase tracking-[0.18em] font-bold mb-0.5"
                                        style={{ color: 'var(--color-brand-primary)' }}
                                    >
                                        Perpetuos · hasta 20×
                                    </div>
                                    <div
                                        className="font-display"
                                        style={{
                                            fontSize: '1.25rem',
                                            color: 'var(--color-text-primary)',
                                            fontVariationSettings: '"opsz" 36, "SOFT" 50, "wght" 600',
                                            letterSpacing: '-0.02em',
                                            lineHeight: 1,
                                        }}
                                    >
                                        Trading{' '}
                                        <span
                                            className="font-display-italic"
                                            style={{
                                                fontVariationSettings: '"opsz" 36, "SOFT" 100, "wght" 500',
                                                color: 'var(--color-text-secondary)',
                                            }}
                                        >
                                            apalancado
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ArrowUpRight
                                className="w-5 h-5"
                                style={{ color: 'var(--color-text-tertiary)' }}
                                strokeWidth={1.75}
                            />
                        </div>

                        {/* live BTC mini stats */}
                        {btcMarket && (
                            <div
                                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.025)',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                }}
                            >
                                <div className="flex items-center gap-2.5 flex-shrink-0">
                                    <TokenLogo symbol="BTC" size={22} />
                                    <div>
                                        <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--color-text-tertiary)' }}>
                                            BTC perp
                                        </div>
                                        <div
                                            className="tabular-mono text-[13px] font-bold"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        >
                                            ${btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ width: 80, height: 28 }} className="flex-1">
                                    <MiniChart symbol={btcMarket.symbol} isStock={false} />
                                </div>
                                <span
                                    className="tabular-mono text-[11px] font-bold w-14 text-right"
                                    style={{ color: btcUp ? 'var(--color-positive)' : 'var(--color-negative)' }}
                                >
                                    {btcUp ? '+' : ''}{btcChange.toFixed(2)}%
                                </span>
                            </div>
                        )}

                        <p
                            className="text-[12px] mt-3"
                            style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}
                        >
                            {t.advanced.perpsDescription}
                        </p>
                    </div>
                </motion.button>

                {/* BOLSILLOS — gold-tinted, the new "where's my money" hub */}
                {onSelectBolsillos && (
                    <motion.button
                        whileTap={{ scale: 0.985 }}
                        onClick={onSelectBolsillos}
                        className="surface-soft grain text-left rounded-2xl border-none outline-none w-full mb-3 overflow-hidden"
                        style={{ position: 'relative' }}
                    >
                        <div
                            aria-hidden
                            style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                background:
                                    'radial-gradient(70% 50% at 100% 0%, rgba(250,204,21,0.08) 0%, transparent 55%)',
                            }}
                        />
                        <div className="relative p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{
                                            backgroundColor: 'rgba(250,204,21,0.1)',
                                            border: '1px solid rgba(250,204,21,0.25)',
                                            color: 'var(--color-brand-primary)',
                                        }}
                                    >
                                        <Coins className="w-5 h-5" strokeWidth={1.75} />
                                    </div>
                                    <div>
                                        <div
                                            className="text-[9px] uppercase tracking-[0.18em] font-bold mb-0.5"
                                            style={{ color: 'var(--color-brand-primary)' }}
                                        >
                                            Bolsillos · Perps + Spot
                                        </div>
                                        <div
                                            className="font-display"
                                            style={{
                                                fontSize: '1.25rem',
                                                color: 'var(--color-text-primary)',
                                                fontVariationSettings:
                                                    '"opsz" 36, "SOFT" 50, "wght" 600',
                                                letterSpacing: '-0.02em',
                                                lineHeight: 1,
                                            }}
                                        >
                                            Tu plata,{' '}
                                            <span
                                                className="font-display-italic"
                                                style={{
                                                    fontVariationSettings:
                                                        '"opsz" 36, "SOFT" 100, "wght" 500',
                                                    color: 'var(--color-text-secondary)',
                                                }}
                                            >
                                                por uso
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <ArrowUpRight
                                    className="w-5 h-5"
                                    style={{ color: 'var(--color-text-tertiary)' }}
                                    strokeWidth={1.75}
                                />
                            </div>
                            <p
                                className="text-[12px]"
                                style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}
                            >
                                Separá tu plata de trading apalancado de tu cripto en propiedad.
                                Movés entre los dos bolsillos al instante, sin comisión.
                            </p>
                        </div>
                    </motion.button>
                )}

                {/* SPOT — cyan-themed card, real token ownership */}
                <motion.button
                    whileTap={{ scale: 0.985 }}
                    onClick={onSelectSpot}
                    className="surface-soft grain text-left rounded-2xl border-none outline-none w-full mb-3 overflow-hidden"
                    style={{ position: 'relative' }}
                >
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            background: 'radial-gradient(70% 50% at 100% 0%, rgba(56, 189, 248, 0.1) 0%, transparent 55%)',
                        }}
                    />

                    <div className="relative p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{
                                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                                        border: '1px solid rgba(56, 189, 248, 0.3)',
                                        color: '#38BDF8',
                                    }}
                                >
                                    <Coins className="w-5 h-5" strokeWidth={1.75} />
                                </div>
                                <div>
                                    <div
                                        className="text-[9px] uppercase tracking-[0.18em] font-bold mb-0.5"
                                        style={{ color: '#38BDF8' }}
                                    >
                                        Spot · Posees el token
                                    </div>
                                    <div
                                        className="font-display"
                                        style={{
                                            fontSize: '1.25rem',
                                            color: 'var(--color-text-primary)',
                                            fontVariationSettings: '"opsz" 36, "SOFT" 50, "wght" 600',
                                            letterSpacing: '-0.02em',
                                            lineHeight: 1,
                                        }}
                                    >
                                        Comprar{' '}
                                        <span
                                            className="font-display-italic"
                                            style={{
                                                fontVariationSettings: '"opsz" 36, "SOFT" 100, "wght" 500',
                                                color: 'var(--color-text-secondary)',
                                            }}
                                        >
                                            HYPE, PURR…
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ArrowUpRight
                                className="w-5 h-5"
                                style={{ color: 'var(--color-text-tertiary)' }}
                                strokeWidth={1.75}
                            />
                        </div>

                        <p
                            className="text-[12px]"
                            style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}
                        >
                            {t.advanced.spotDescription}
                        </p>
                    </div>
                </motion.button>

                {/* PREDICTIONS — purple-themed card */}
                <motion.button
                    whileTap={{ scale: 0.985 }}
                    onClick={onSelectPredictions}
                    className="surface-soft grain text-left rounded-2xl border-none outline-none w-full mb-3 overflow-hidden"
                    style={{ position: 'relative' }}
                >
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            background: 'radial-gradient(70% 50% at 100% 0%, rgba(124, 58, 237, 0.1) 0%, transparent 55%)',
                        }}
                    />

                    <div className="relative p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{
                                        backgroundColor: 'rgba(124, 58, 237, 0.12)',
                                        border: '1px solid rgba(124, 58, 237, 0.3)',
                                        color: '#A78BFA',
                                    }}
                                >
                                    <Target className="w-5 h-5" strokeWidth={1.75} />
                                </div>
                                <div>
                                    <div
                                        className="text-[9px] uppercase tracking-[0.18em] font-bold mb-0.5"
                                        style={{ color: '#A78BFA' }}
                                    >
                                        Polymarket · Eventos
                                    </div>
                                    <div
                                        className="font-display"
                                        style={{
                                            fontSize: '1.25rem',
                                            color: 'var(--color-text-primary)',
                                            fontVariationSettings: '"opsz" 36, "SOFT" 50, "wght" 600',
                                            letterSpacing: '-0.02em',
                                            lineHeight: 1,
                                        }}
                                    >
                                        Mercados de{' '}
                                        <span
                                            className="font-display-italic"
                                            style={{
                                                fontVariationSettings: '"opsz" 36, "SOFT" 100, "wght" 500',
                                                color: 'var(--color-text-secondary)',
                                            }}
                                        >
                                            predicción
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ArrowUpRight
                                className="w-5 h-5"
                                style={{ color: 'var(--color-text-tertiary)' }}
                                strokeWidth={1.75}
                            />
                        </div>

                        {/* fake-but-illustrative outcome bars */}
                        <div
                            className="px-3 py-2.5 rounded-xl"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.025)',
                                border: '1px solid rgba(255,255,255,0.04)',
                            }}
                        >
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] font-bold mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                                <span>¿Apostarías?</span>
                                <span style={{ color: '#A78BFA' }}>EJEMPLO</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                    <div style={{ width: '67%', height: '100%', background: 'linear-gradient(90deg, #22C55E 0%, #16A34A 100%)' }} />
                                </div>
                                <span className="tabular-mono text-[11px] font-bold" style={{ color: 'var(--color-positive)' }}>67¢</span>
                                <span className="text-[10px] font-bold" style={{ color: 'var(--color-positive)' }}>SÍ</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                    <div style={{ width: '33%', height: '100%', background: 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)' }} />
                                </div>
                                <span className="tabular-mono text-[11px] font-bold" style={{ color: 'var(--color-negative)' }}>33¢</span>
                                <span className="text-[10px] font-bold" style={{ color: 'var(--color-negative)' }}>NO</span>
                            </div>
                        </div>

                        <p
                            className="text-[12px] mt-3"
                            style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}
                        >
                            {t.advanced.predictionsDescription}
                        </p>
                    </div>
                </motion.button>

                {/* LEADERBOARD — green-themed card */}
                <motion.button
                    whileTap={{ scale: 0.985 }}
                    onClick={onSelectLeaderboard}
                    className="surface-soft grain text-left rounded-2xl border-none outline-none w-full mb-5 overflow-hidden"
                    style={{ position: 'relative' }}
                >
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            background: 'radial-gradient(70% 50% at 100% 0%, rgba(34, 197, 94, 0.08) 0%, transparent 55%)',
                        }}
                    />

                    <div className="relative p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{
                                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                        border: '1px solid rgba(34, 197, 94, 0.25)',
                                        color: 'var(--color-positive)',
                                    }}
                                >
                                    <Trophy className="w-5 h-5" strokeWidth={1.75} />
                                </div>
                                <div>
                                    <div
                                        className="text-[9px] uppercase tracking-[0.18em] font-bold mb-0.5"
                                        style={{ color: 'var(--color-positive)' }}
                                    >
                                        Top 100 · esta semana
                                    </div>
                                    <div
                                        className="font-display"
                                        style={{
                                            fontSize: '1.25rem',
                                            color: 'var(--color-text-primary)',
                                            fontVariationSettings: '"opsz" 36, "SOFT" 50, "wght" 600',
                                            letterSpacing: '-0.02em',
                                            lineHeight: 1,
                                        }}
                                    >
                                        Tabla de{' '}
                                        <span
                                            className="font-display-italic"
                                            style={{
                                                fontVariationSettings: '"opsz" 36, "SOFT" 100, "wght" 500',
                                                color: 'var(--color-text-secondary)',
                                            }}
                                        >
                                            líderes
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ArrowUpRight
                                className="w-5 h-5"
                                style={{ color: 'var(--color-text-tertiary)' }}
                                strokeWidth={1.75}
                            />
                        </div>

                        {/* podium stats */}
                        <div
                            className="flex items-end gap-2 px-3 py-2.5 rounded-xl"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.025)',
                                border: '1px solid rgba(255,255,255,0.04)',
                                height: 64,
                            }}
                        >
                            {[
                                { rank: '#2', pnl: '+312%', height: '55%', medal: '🥈' },
                                { rank: '#1', pnl: '+847%', height: '100%', medal: '🥇' },
                                { rank: '#3', pnl: '+184%', height: '38%', medal: '🥉' },
                            ].map((p, i) => (
                                <div key={i} className="flex-1 flex flex-col justify-end">
                                    <div className="text-center text-[14px] mb-1">{p.medal}</div>
                                    <div
                                        className="rounded-t-sm"
                                        style={{
                                            height: p.height,
                                            background:
                                                i === 1
                                                    ? 'linear-gradient(180deg, var(--color-brand-primary) 0%, rgba(250, 204, 21, 0.4) 100%)'
                                                    : 'linear-gradient(180deg, rgba(34, 197, 94, 0.6) 0%, rgba(34, 197, 94, 0.15) 100%)',
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between mt-2 px-1">
                            <span
                                className="text-[10px] uppercase tracking-[0.12em] font-bold flex items-center gap-1"
                                style={{ color: 'var(--color-positive)' }}
                            >
                                <TrendingUp className="w-2.5 h-2.5" />
                                +847% PnL líder
                            </span>
                            <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                                últimos 7 días
                            </span>
                        </div>
                    </div>
                </motion.button>

                {/* MERCADOS — explore all markets */}
                {onSelectMarkets && (
                    <motion.button
                        whileTap={{ scale: 0.985 }}
                        onClick={onSelectMarkets}
                        className="surface-soft grain text-left rounded-2xl border-none outline-none w-full mb-5 overflow-hidden"
                        style={{ position: 'relative' }}
                    >
                        <div className="relative p-5 flex items-center gap-4">
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{
                                    backgroundColor: 'rgba(250,204,21,0.1)',
                                    border: '1px solid rgba(250,204,21,0.22)',
                                    color: 'var(--color-brand-primary)',
                                }}
                            >
                                <BarChart3 className="w-5 h-5" strokeWidth={1.75} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    className="text-[9px] uppercase tracking-[0.18em] font-bold mb-0.5"
                                    style={{ color: 'var(--color-brand-primary)' }}
                                >
                                    Explorar · todos los activos
                                </div>
                                <div
                                    className="font-display"
                                    style={{
                                        fontSize: '1.25rem',
                                        color: 'var(--color-text-primary)',
                                        fontVariationSettings: '"opsz" 36, "SOFT" 50, "wght" 600',
                                        letterSpacing: '-0.02em',
                                        lineHeight: 1,
                                    }}
                                >
                                    Mercados
                                </div>
                            </div>
                            <ArrowUpRight
                                className="w-5 h-5"
                                style={{ color: 'var(--color-text-tertiary)' }}
                                strokeWidth={1.75}
                            />
                        </div>
                    </motion.button>
                )}

                {/* Risk notice — refined */}
                <div
                    className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
                    style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.04)',
                        border: '1px solid rgba(239, 68, 68, 0.12)',
                    }}
                >
                    <AlertTriangle
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                        style={{ color: 'var(--color-negative)' }}
                        strokeWidth={1.75}
                    />
                    <p
                        className="text-[12px] leading-relaxed"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {t.advanced.riskNotice}
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

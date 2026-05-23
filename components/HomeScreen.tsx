'use client';

import { useState, useEffect } from 'react';

import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrivy } from '@privy-io/react-auth';
import { usePreferences } from '@/hooks/usePreferences';
import { BYPASS_AUTH } from '@/lib/dev-config';
import { ArrowUpRight } from 'lucide-react';
import MiniChart from '@/components/MiniChart';
import TokenLogo from '@/components/TokenLogo';
import HomeNormal from '@/components/HomeNormal';
import HomePro from '@/components/HomePro';

interface HomeScreenProps {
    onTokenClick?: (symbol: string) => void;
    onTradeClick?: () => void;
    onBuyClick?: () => void;
}

export default function HomeScreen({ onTokenClick, onBuyClick }: HomeScreenProps = {}) {
    const { t } = useLanguage();
    const { markets } = useHyperliquid();
    const { ready, authenticated, login } = usePrivy();
    const { proMode, toggleProMode } = usePreferences();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        queueMicrotask(() => setMounted(true));
    }, []);

    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-[var(--color-text-tertiary)]">{t.common.loading}</div>
            </div>
        );
    }

    // Logged-out hero — UNCHANGED in production. Skipped when BYPASS_AUTH is on.
    if (!BYPASS_AUTH && ready && !authenticated) {
        const btc = (markets || []).find((m) => m.name === 'BTC');
        const eth = (markets || []).find((m) => m.name === 'ETH');
        const sol = (markets || []).find((m) => m.name === 'SOL');
        const previewAssets = [btc, eth, sol].filter(Boolean);

        return (
            <div className="relative pb-12">
                <div
                    aria-hidden
                    className="pointer-events-none fixed inset-0 -z-10"
                    style={{
                        background:
                            'radial-gradient(80% 60% at 50% 0%, rgba(250,204,21,0.1) 0%, transparent 55%), radial-gradient(50% 40% at 100% 70%, rgba(34, 197, 94, 0.05) 0%, transparent 50%), radial-gradient(50% 40% at 0% 70%, rgba(124, 58, 237, 0.05) 0%, transparent 50%), #000',
                    }}
                />

                <div className="max-w-xl mx-auto px-5 pt-8 pb-6">
                    <div className="mb-8">
                        <div
                            className="text-[10px] uppercase tracking-[0.22em] font-bold mb-3 flex items-center gap-1.5"
                            style={{ color: 'var(--color-text-tertiary)' }}
                        >
                            <span className="dot-live" />
                            Rayo · LATAM
                        </div>
                        <h1
                            className="font-display mb-3"
                            style={{
                                fontSize: '2.75rem',
                                lineHeight: 1,
                                color: 'var(--color-text-primary)',
                                fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 600',
                                letterSpacing: '-0.035em',
                            }}
                        >
                            Comprá{' '}
                            <span
                                className="font-display-italic"
                                style={{
                                    fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 500',
                                    color: 'var(--color-brand-primary)',
                                }}
                            >
                                cripto
                            </span>
                            <br />
                            como{' '}
                            <span
                                className="font-display-italic"
                                style={{
                                    fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 500',
                                    color: 'var(--color-text-secondary)',
                                }}
                            >
                                tomás un café
                            </span>
                        </h1>
                        <p
                            className="text-[14px] max-w-md"
                            style={{ color: 'var(--color-text-secondary)', lineHeight: 1.55 }}
                        >
                            {t.home.welcomeDescription}
                        </p>
                    </div>

                    {previewAssets.length > 0 && (
                        <div className="surface-soft grain rounded-2xl mb-8 overflow-hidden">
                            <div
                                className="px-4 py-2.5 flex items-center justify-between"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                <span
                                    className="text-[10px] uppercase tracking-[0.18em] font-bold"
                                    style={{ color: 'var(--color-text-tertiary)' }}
                                >
                                    Precios en vivo
                                </span>
                                <span className="dot-live" />
                            </div>
                            {previewAssets.map((m, idx) => {
                                if (!m) return null;
                                const ch = m.change24h || 0;
                                const isUp = ch >= 0;
                                return (
                                    <div
                                        key={m.symbol}
                                        className="flex items-center gap-3 px-4 py-3"
                                        style={{
                                            borderBottom:
                                                idx < previewAssets.length - 1
                                                    ? '1px solid rgba(255,255,255,0.04)'
                                                    : 'none',
                                        }}
                                    >
                                        <TokenLogo symbol={m.name} size={32} />
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className="font-bold text-[14px]"
                                                style={{ color: 'var(--color-text-primary)' }}
                                            >
                                                {m.name}
                                            </div>
                                            <div
                                                className="tabular-mono text-[11px]"
                                                style={{ color: 'var(--color-text-tertiary)' }}
                                            >
                                                ${(m.price ?? 0) < 1
                                                    ? (m.price ?? 0).toFixed(4)
                                                    : (m.price ?? 0).toLocaleString('en-US', {
                                                          maximumFractionDigits: 2,
                                                      })}
                                            </div>
                                        </div>
                                        <div
                                            style={{ width: 70, height: 26 }}
                                            className="flex-shrink-0"
                                        >
                                            <MiniChart symbol={m.symbol} isStock={false} />
                                        </div>
                                        <span
                                            className="tabular-mono text-[12px] font-bold w-14 text-right"
                                            style={{
                                                color: isUp
                                                    ? 'var(--color-positive)'
                                                    : 'var(--color-negative)',
                                            }}
                                        >
                                            {isUp ? '+' : ''}
                                            {ch.toFixed(2)}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <button
                        onClick={login}
                        className="cta-brand w-full py-4 rounded-2xl text-[15px] font-bold tracking-tight flex items-center justify-center gap-2 mb-3"
                    >
                        {t.home.signInToContinue}
                        <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
                    </button>

                    <div
                        className="flex items-center justify-center gap-1.5 text-[11px]"
                        style={{ color: 'var(--color-text-tertiary)' }}
                    >
                        <span
                            className="font-display-italic"
                            style={{
                                fontVariationSettings: '"opsz" 24, "SOFT" 100, "wght" 400',
                            }}
                        >
                            ✦
                        </span>
                        <span>{t.home.trustSignal}</span>
                        <span
                            className="font-display-italic"
                            style={{
                                fontVariationSettings: '"opsz" 24, "SOFT" 100, "wght" 400',
                            }}
                        >
                            ✦
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // Authenticated — Normal vs Pro
    return (
        <div className="max-w-2xl mx-auto">
            {proMode ? (
                <HomePro
                    onTokenClick={onTokenClick}
                    onBuyClick={onBuyClick}
                    onToggleProMode={toggleProMode}
                />
            ) : (
                <HomeNormal
                    onTokenClick={onTokenClick}
                    onBuyClick={onBuyClick}
                    onToggleProMode={toggleProMode}
                />
            )}
        </div>
    );
}

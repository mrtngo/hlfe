'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { useDcaSchedules } from '@/hooks/useDcaSchedules';
import { describeSchedule } from '@/lib/dca/schedule';
import TokenLogo from '@/components/TokenLogo';
import MiniChart from '@/components/MiniChart';
import { Pause, Play, Trash2, Loader2, Calendar, Repeat } from 'lucide-react';

interface DcaSchedulesListProps {
    compact?: boolean;
}

export default function DcaSchedulesList({ compact = false }: DcaSchedulesListProps) {
    const { t, language } = useLanguage();
    const { schedules, loading, setActive, remove } = useDcaSchedules();

    if (loading && schedules.length === 0) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
            </div>
        );
    }

    if (schedules.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative text-center py-10 px-5 rounded-2xl grain overflow-hidden"
                style={{
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.08)',
                }}
            >
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        background:
                            'radial-gradient(60% 50% at 50% 0%, rgba(227,179,76,0.04) 0%, transparent 60%)',
                    }}
                />
                <div
                    className="relative w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{
                        backgroundColor: 'rgba(227, 179, 76, 0.06)',
                        border: '1px solid rgba(227, 179, 76, 0.18)',
                        boxShadow: '0 0 32px -8px rgba(227, 179, 76, 0.25)',
                    }}
                >
                    <Calendar className="w-6 h-6" style={{ color: 'var(--color-brand-primary)' }} strokeWidth={1.5} />
                </div>
                <div
                    className="relative font-display text-[18px] mb-1"
                    style={{
                        color: 'var(--color-text-primary)',
                        fontVariationSettings: '"opsz" 36, "SOFT" 50, "wght" 500',
                        letterSpacing: '-0.015em',
                    }}
                >
                    Sin compras{' '}
                    <span
                        className="font-display-italic"
                        style={{
                            color: 'var(--color-brand-primary)',
                            fontVariationSettings: '"opsz" 36, "SOFT" 100, "wght" 500',
                        }}
                    >
                        recurrentes
                    </span>
                </div>
                <p className="relative text-[12px]" style={{ color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
                    {t.dca.noSchedulesCta}
                </p>
            </motion.div>
        );
    }

    return (
        <div className="flex flex-col gap-2.5">
            <AnimatePresence initial={false}>
                {schedules.map((s, idx) => {
                    const desc = describeSchedule(s.frequency, s.day_of_week, s.day_of_month, language);
                    const next = new Date(s.next_run_at);
                    const isActive = s.is_active;

                    return (
                        <motion.div
                            key={s.id}
                            layout
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4, height: 0 }}
                            transition={{ delay: idx * 0.04, duration: 0.3 }}
                            className="relative rounded-2xl overflow-hidden grain surface-soft"
                            style={{
                                opacity: isActive ? 1 : 0.55,
                            }}
                        >
                            {/* Asset-color glow tied to context */}
                            <div
                                aria-hidden
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    pointerEvents: 'none',
                                    background: isActive
                                        ? 'radial-gradient(60% 100% at 0% 50%, rgba(227,179,76,0.05) 0%, transparent 55%)'
                                        : 'none',
                                }}
                            />

                            {/* Left accent strip */}
                            {isActive && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: 3,
                                        background: 'linear-gradient(180deg, transparent 0%, var(--color-brand-primary) 30%, var(--color-brand-primary) 70%, transparent 100%)',
                                        boxShadow: '2px 0 8px -2px rgba(227, 179, 76, 0.3)',
                                    }}
                                />
                            )}

                            <div className="relative p-3.5 pl-4">
                                <div className="flex items-start gap-3">
                                    <div className="relative flex-shrink-0">
                                        <TokenLogo symbol={s.symbol} size={44} />
                                        {isActive && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    bottom: -2,
                                                    right: -2,
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: 9999,
                                                    background: 'linear-gradient(135deg, #F2D389 0%, #E3B34C 100%)',
                                                    border: '2px solid var(--color-bg-primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 2px 8px -2px rgba(227, 179, 76, 0.5)',
                                                }}
                                            >
                                                <Repeat className="w-2 h-2" style={{ color: '#1C1608' }} strokeWidth={3.5} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* amount + asset */}
                                        <div className="flex items-baseline gap-1.5 mb-0.5">
                                            <span
                                                className="tabular-mono font-bold"
                                                style={{
                                                    fontSize: '20px',
                                                    color: 'var(--color-text-primary)',
                                                    letterSpacing: '-0.015em',
                                                    lineHeight: 1,
                                                }}
                                            >
                                                ${s.amount_usd.toFixed(0)}
                                            </span>
                                            <span
                                                className="font-display-italic"
                                                style={{
                                                    color: 'var(--color-text-tertiary)',
                                                    fontVariationSettings: '"opsz" 24, "SOFT" 100, "wght" 400',
                                                    fontSize: '14px',
                                                }}
                                            >
                                                en
                                            </span>
                                            <span
                                                className="text-[14px] font-bold"
                                                style={{
                                                    color: 'var(--color-brand-primary)',
                                                    letterSpacing: '0.01em',
                                                }}
                                            >
                                                {s.symbol}
                                            </span>
                                            {!isActive && (
                                                <span
                                                    className="ml-1 text-[9px] uppercase tracking-[0.12em] font-bold px-1.5 py-0.5 rounded-full"
                                                    style={{
                                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                                        color: 'var(--color-text-tertiary)',
                                                    }}
                                                >
                                                    Pausada
                                                </span>
                                            )}
                                        </div>

                                        {/* frequency rule */}
                                        <div
                                            className="text-[12px] mb-1.5"
                                            style={{ color: 'var(--color-text-secondary)' }}
                                        >
                                            {desc}
                                            {isActive && (
                                                <>
                                                    {' · '}
                                                    <span style={{ color: 'var(--color-text-tertiary)' }}>
                                                        próxima:{' '}
                                                        <span className="tabular-mono" style={{ color: 'var(--color-text-secondary)' }}>
                                                            {next.toLocaleString(language, {
                                                                weekday: 'short',
                                                                day: 'numeric',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </span>
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        {/* asset sparkline */}
                                        <div style={{ height: 26 }} className="opacity-80 -mx-0.5">
                                            <MiniChart symbol={s.market_symbol} isStock={false} />
                                        </div>

                                        {/* totals strip if any runs */}
                                        {!compact && s.total_runs > 0 && (
                                            <div
                                                className="flex items-center gap-3 mt-2 pt-2 text-[10px] tabular-mono"
                                                style={{
                                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                                }}
                                            >
                                                <span style={{ color: 'var(--color-text-tertiary)' }}>
                                                    <span className="font-bold" style={{ color: 'var(--color-positive)' }}>{s.total_runs}</span>{' '}
                                                    {t.dca.totalRunsLabel}
                                                </span>
                                                <span style={{ color: 'var(--color-text-tertiary)' }}>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>${s.total_spent_usd.toFixed(2)}</span>{' '}
                                                    invertido
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {!compact && (
                                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setActive(s.id, !s.is_active)}
                                                title={s.is_active ? t.dca.pause : t.dca.resume}
                                                className="w-8 h-8 rounded-full flex items-center justify-center border-none outline-none transition-colors"
                                                style={{
                                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                                    color: 'var(--color-text-secondary)',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                }}
                                            >
                                                {s.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                            </motion.button>
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => remove(s.id)}
                                                title={t.dca.delete}
                                                className="w-8 h-8 rounded-full flex items-center justify-center border-none outline-none transition-colors"
                                                style={{
                                                    backgroundColor: 'rgba(239, 68, 68, 0.06)',
                                                    color: 'var(--color-negative)',
                                                    border: '1px solid rgba(239, 68, 68, 0.15)',
                                                }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </motion.button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

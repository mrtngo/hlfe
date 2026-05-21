'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Repeat, X, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useDcaSchedules } from '@/hooks/useDcaSchedules';
import { computeNextRunAt } from '@/lib/dca/schedule';
import TokenLogo from '@/components/TokenLogo';
import type { DcaFrequency } from '@/lib/supabase/client';

interface DcaScheduleSheetProps {
    isOpen: boolean;
    onClose: () => void;
    symbol: string;
    marketSymbol: string;
    amountUsd: number;
}

const HOURS = [9, 12, 15, 18];

export default function DcaScheduleSheet({
    isOpen,
    onClose,
    symbol,
    marketSymbol,
    amountUsd,
}: DcaScheduleSheetProps) {
    const { t } = useLanguage();
    const { create } = useDcaSchedules();

    const [frequency, setFrequency] = useState<DcaFrequency>('weekly');
    const [dayOfWeek, setDayOfWeek] = useState<number>(1);
    const [dayOfMonth, setDayOfMonth] = useState<number>(1);
    const [hourUtc, setHourUtc] = useState<number>(12);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    const nextRunPreview = useMemo(
        () => computeNextRunAt({ frequency, day_of_week: dayOfWeek, day_of_month: dayOfMonth, hour_utc: hourUtc }),
        [frequency, dayOfWeek, dayOfMonth, hourUtc],
    );

    const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const dayLongNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const submit = async () => {
        if (submitting) return;
        setSubmitting(true);
        setError('');
        try {
            const result = await create({
                symbol,
                market_symbol: marketSymbol,
                amount_usd: amountUsd,
                frequency,
                day_of_week: frequency === 'weekly' ? dayOfWeek : null,
                day_of_month: frequency === 'monthly' ? dayOfMonth : null,
                hour_utc: hourUtc,
                next_run_at: nextRunPreview.toISOString(),
            });
            if (result) {
                setSuccess(t.dca.createdSuccess);
                setTimeout(() => { onClose(); setSuccess(''); }, 1200);
            } else {
                setError('No se pudo crear');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                    className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl pb-6 max-h-[92vh] overflow-y-auto grain surface-deep"
                        style={{ position: 'relative' }}
                    >
                        {/* subtle yellow corner glow */}
                        <div
                            aria-hidden
                            style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                background:
                                    'radial-gradient(60% 40% at 50% 0%, rgba(250,204,21,0.06) 0%, transparent 60%)',
                                borderRadius: 'inherit',
                            }}
                        />

                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-2 sm:hidden">
                            <div
                                style={{
                                    width: 38,
                                    height: 4,
                                    borderRadius: 9999,
                                    backgroundColor: 'rgba(255,255,255,0.18)',
                                }}
                            />
                        </div>

                        <div className="relative px-6 pt-2">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-5">
                                <div>
                                    <div
                                        className="text-[10px] uppercase tracking-[0.18em] mb-1.5 font-semibold flex items-center gap-1.5"
                                        style={{ color: 'var(--color-brand-primary)' }}
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        Compra recurrente
                                    </div>
                                    <h2
                                        className="font-display"
                                        style={{
                                            fontSize: '1.875rem',
                                            lineHeight: 1.05,
                                            color: 'var(--color-text-primary)',
                                            fontVariationSettings: '"opsz" 144, "SOFT" 50, "wght" 600',
                                            letterSpacing: '-0.03em',
                                        }}
                                    >
                                        Comprar{' '}
                                        <span
                                            className="font-display-italic"
                                            style={{
                                                color: 'var(--color-brand-primary)',
                                                fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 500',
                                            }}
                                        >
                                            {symbol}
                                        </span>
                                        <br />
                                        <span style={{ color: 'var(--color-text-secondary)' }}>cada</span>{' '}
                                        <span
                                            className="font-display-italic"
                                            style={{
                                                color: 'var(--color-text-secondary)',
                                                fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 400',
                                            }}
                                        >
                                            tanto
                                        </span>
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-9 h-9 rounded-full flex items-center justify-center border-none outline-none"
                                    style={{
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        color: 'var(--color-text-secondary)',
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Amount + asset display */}
                            <div
                                className="flex items-center gap-3 p-3 rounded-2xl mb-5"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.025)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                <TokenLogo symbol={symbol} size={40} />
                                <div className="flex-1">
                                    <div
                                        className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-0.5"
                                        style={{ color: 'var(--color-text-tertiary)' }}
                                    >
                                        Cada vez
                                    </div>
                                    <div
                                        className="tabular-mono font-bold text-[20px]"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    >
                                        ${amountUsd.toFixed(2)}{' '}
                                        <span
                                            className="text-[13px] font-normal"
                                            style={{ color: 'var(--color-brand-primary)' }}
                                        >
                                            → {symbol}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Frequency segmented control */}
                            <section className="mb-5">
                                <label
                                    className="block text-[10px] uppercase tracking-[0.18em] mb-2.5 font-semibold"
                                    style={{ color: 'var(--color-text-tertiary)' }}
                                >
                                    {t.dca.frequencyLabel}
                                </label>
                                <div
                                    className="grid grid-cols-3 p-1 rounded-2xl gap-1"
                                    style={{
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                    }}
                                >
                                    {(['daily', 'weekly', 'monthly'] as DcaFrequency[]).map((f) => {
                                        const active = frequency === f;
                                        const label = f === 'daily' ? t.dca.frequencyDaily : f === 'weekly' ? t.dca.frequencyWeekly : t.dca.frequencyMonthly;
                                        return (
                                            <motion.button
                                                key={f}
                                                onClick={() => setFrequency(f)}
                                                whileTap={{ scale: 0.97 }}
                                                className="relative py-2.5 rounded-xl text-[13px] font-semibold border-none outline-none transition-colors"
                                                style={{
                                                    color: active ? 'var(--color-text-on-brand)' : 'var(--color-text-secondary)',
                                                    backgroundColor: 'transparent',
                                                    zIndex: 1,
                                                }}
                                            >
                                                {active && (
                                                    <motion.div
                                                        layoutId="freq-pill"
                                                        className="absolute inset-0 rounded-xl"
                                                        style={{
                                                            backgroundColor: 'var(--color-brand-primary)',
                                                            zIndex: -1,
                                                            boxShadow: '0 4px 14px -4px rgba(250, 204, 21, 0.5)',
                                                        }}
                                                        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                                                    />
                                                )}
                                                {label}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Day picker — weekly */}
                            <AnimatePresence mode="wait">
                                {frequency === 'weekly' && (
                                    <motion.section
                                        key="weekly"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="mb-5 overflow-hidden"
                                    >
                                        <label
                                            className="block text-[10px] uppercase tracking-[0.18em] mb-2.5 font-semibold"
                                            style={{ color: 'var(--color-text-tertiary)' }}
                                        >
                                            {t.dca.dayOfWeekLabel} · <span style={{ color: 'var(--color-text-secondary)' }}>{dayLongNames[dayOfWeek]}</span>
                                        </label>
                                        <div className="grid grid-cols-7 gap-1.5">
                                            {dayNames.map((d, i) => {
                                                const active = dayOfWeek === i;
                                                return (
                                                    <motion.button
                                                        key={i}
                                                        whileTap={{ scale: 0.92 }}
                                                        onClick={() => setDayOfWeek(i)}
                                                        className="aspect-square rounded-xl text-[13px] font-bold border-none outline-none transition-colors"
                                                        style={{
                                                            backgroundColor: active ? 'rgba(250, 204, 21, 0.1)' : 'rgba(255,255,255,0.03)',
                                                            color: active ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                                                            border: active ? '1px solid rgba(250, 204, 21, 0.5)' : '1px solid rgba(255,255,255,0.05)',
                                                            boxShadow: active ? '0 0 0 3px rgba(250, 204, 21, 0.08)' : 'none',
                                                        }}
                                                    >
                                                        {d}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </motion.section>
                                )}

                                {frequency === 'monthly' && (
                                    <motion.section
                                        key="monthly"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="mb-5 overflow-hidden"
                                    >
                                        <label
                                            className="block text-[10px] uppercase tracking-[0.18em] mb-2.5 font-semibold"
                                            style={{ color: 'var(--color-text-tertiary)' }}
                                        >
                                            {t.dca.dayOfMonthLabel} · <span className="tabular-mono" style={{ color: 'var(--color-text-secondary)' }}>día {dayOfMonth}</span>
                                        </label>
                                        <div className="grid grid-cols-7 gap-1">
                                            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => {
                                                const active = dayOfMonth === d;
                                                return (
                                                    <motion.button
                                                        key={d}
                                                        whileTap={{ scale: 0.92 }}
                                                        onClick={() => setDayOfMonth(d)}
                                                        className="aspect-square rounded-lg text-[12px] tabular-mono font-bold border-none outline-none transition-colors"
                                                        style={{
                                                            backgroundColor: active ? 'rgba(250, 204, 21, 0.1)' : 'rgba(255,255,255,0.025)',
                                                            color: active ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                                                            border: active ? '1px solid rgba(250, 204, 21, 0.5)' : '1px solid rgba(255,255,255,0.04)',
                                                        }}
                                                    >
                                                        {d}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </motion.section>
                                )}
                            </AnimatePresence>

                            {/* Hour picker */}
                            <section className="mb-5">
                                <label
                                    className="block text-[10px] uppercase tracking-[0.18em] mb-2.5 font-semibold"
                                    style={{ color: 'var(--color-text-tertiary)' }}
                                >
                                    {t.dca.hourLabel}
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {HOURS.map((h) => {
                                        const active = hourUtc === h;
                                        return (
                                            <motion.button
                                                key={h}
                                                whileTap={{ scale: 0.96 }}
                                                onClick={() => setHourUtc(h)}
                                                className="py-2.5 rounded-xl tabular-mono text-[13px] font-semibold border-none outline-none transition-colors"
                                                style={{
                                                    backgroundColor: active ? 'rgba(250, 204, 21, 0.1)' : 'rgba(255,255,255,0.03)',
                                                    color: active ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                                                    border: active ? '1px solid rgba(250, 204, 21, 0.5)' : '1px solid rgba(255,255,255,0.05)',
                                                }}
                                            >
                                                {String(h).padStart(2, '0')}:00
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Next run — glowing preview */}
                            <div
                                className="flex items-center justify-between px-4 py-3.5 rounded-2xl mb-4 grain"
                                style={{
                                    backgroundColor: 'rgba(250, 204, 21, 0.05)',
                                    border: '1px solid rgba(250, 204, 21, 0.2)',
                                    boxShadow: '0 0 24px -8px rgba(250, 204, 21, 0.15)',
                                }}
                            >
                                <div>
                                    <div
                                        className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-0.5"
                                        style={{ color: 'var(--color-text-tertiary)' }}
                                    >
                                        {t.dca.nextRunLabel}
                                    </div>
                                    <div
                                        className="font-display text-[15px]"
                                        style={{
                                            color: 'var(--color-text-primary)',
                                            fontVariationSettings: '"opsz" 36, "SOFT" 50, "wght" 500',
                                        }}
                                    >
                                        {nextRunPreview.toLocaleString('es', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'short',
                                        })}
                                    </div>
                                </div>
                                <div
                                    className="tabular-mono text-[20px] font-bold"
                                    style={{ color: 'var(--color-brand-primary)' }}
                                >
                                    {String(hourUtc).padStart(2, '0')}:00
                                </div>
                            </div>

                            {/* Quiet notice */}
                            <div
                                className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl mb-5 text-[11px]"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.025)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    color: 'var(--color-text-secondary)',
                                    lineHeight: 1.5,
                                }}
                            >
                                <AlertCircle
                                    className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                                    style={{ color: 'var(--color-brand-primary)' }}
                                />
                                <span>{t.dca.executionPending}</span>
                            </div>

                            {error && (
                                <div className="text-sm mb-3" style={{ color: 'var(--color-negative)' }}>{error}</div>
                            )}
                            {success && (
                                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: 'var(--color-positive)' }}>
                                    <CheckCircle2 className="w-4 h-4" /> {success}
                                </div>
                            )}

                            <motion.button
                                whileTap={{ scale: 0.985 }}
                                onClick={submit}
                                disabled={submitting}
                                className={submitting ? 'w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border-none outline-none' : 'cta-brand w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 tracking-tight'}
                                style={submitting ? {
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    color: 'var(--color-text-tertiary)',
                                } : undefined}
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Repeat className="w-4 h-4" />}
                                {t.dca.createCta}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

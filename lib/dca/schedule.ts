import type { DcaFrequency } from '@/lib/supabase/client';

export interface ScheduleSpec {
    frequency: DcaFrequency;
    day_of_week?: number | null;
    day_of_month?: number | null;
    hour_utc: number;
}

export function computeNextRunAt(spec: ScheduleSpec, from: Date = new Date()): Date {
    const next = new Date(from);
    next.setUTCMinutes(0, 0, 0);

    if (spec.frequency === 'daily') {
        next.setUTCHours(spec.hour_utc);
        if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
        return next;
    }

    if (spec.frequency === 'weekly') {
        const target = spec.day_of_week ?? 1;
        next.setUTCHours(spec.hour_utc);
        const diff = (target - next.getUTCDay() + 7) % 7;
        next.setUTCDate(next.getUTCDate() + diff);
        if (next <= from) next.setUTCDate(next.getUTCDate() + 7);
        return next;
    }

    const target = Math.min(Math.max(spec.day_of_month ?? 1, 1), 28);
    next.setUTCHours(spec.hour_utc);
    next.setUTCDate(target);
    if (next <= from) {
        next.setUTCMonth(next.getUTCMonth() + 1);
        next.setUTCDate(target);
    }
    return next;
}

export function formatDayOfWeek(day: number, locale: 'es' | 'en' = 'es'): string {
    const es = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const en = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return (locale === 'es' ? es : en)[day] || '';
}

export function describeSchedule(
    frequency: DcaFrequency,
    dayOfWeek: number | null | undefined,
    dayOfMonth: number | null | undefined,
    locale: 'es' | 'en' = 'es',
): string {
    if (frequency === 'daily') return locale === 'es' ? 'Todos los días' : 'Every day';
    if (frequency === 'weekly') {
        const day = formatDayOfWeek(dayOfWeek ?? 1, locale);
        return locale === 'es' ? `Todos los ${day}` : `Every ${day}`;
    }
    const dom = dayOfMonth ?? 1;
    return locale === 'es' ? `El día ${dom} de cada mes` : `On day ${dom} of each month`;
}

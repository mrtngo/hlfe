'use client';

import { useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid, type Market } from '@/hooks/useHyperliquid';
import { Icon, ScreenV2 } from '@/components/V2Kit';

const STORAGE_KEY = 'rayo_academy_completed';

type AcademyLesson = {
    id: string;
    title: string;
    summary: string;
    duration: string;
    level: string;
    takeaways: string[];
    example: {
        label: string;
        value: string;
        note: string;
    };
};

type AcademyFilter = 'all' | 'basics' | 'risk';
type DemoSide = 'long' | 'short';

type DemoPosition = {
    symbol: string;
    name: string;
    side: DemoSide;
    margin: number;
    leverage: number;
    entryPrice: number;
};

function readCompleted(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
        return [];
    }
}

function writeCompleted(ids: string[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export default function AcademyScreen() {
    const { t, language, formatCurrency, formatPercent } = useLanguage();
    const { markets } = useHyperliquid();
    const academy = t.screens.academy;
    const lessons = academy.lessons as AcademyLesson[];
    const [filter, setFilter] = useState<AcademyFilter>('all');
    const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
    const [completed, setCompleted] = useState<string[]>(readCompleted);
    const [margin, setMargin] = useState(100);
    const [leverage, setLeverage] = useState(5);
    const [move, setMove] = useState(3);
    const [demoBalance, setDemoBalance] = useState(1000);
    const [demoSymbol, setDemoSymbol] = useState('BTC');
    const [demoSide, setDemoSide] = useState<DemoSide>('long');
    const [demoMargin, setDemoMargin] = useState(100);
    const [demoLeverage, setDemoLeverage] = useState(3);
    const [demoPosition, setDemoPosition] = useState<DemoPosition | null>(null);

    const filteredLessons = useMemo(() => {
        if (filter === 'all') return lessons;
        if (filter === 'basics') return lessons.filter((lesson) => lesson.level === academy.levels.basic);
        return lessons.filter((lesson) => lesson.level === academy.levels.risk);
    }, [academy.levels.basic, academy.levels.risk, filter, lessons]);

    const activeLesson = activeLessonId ? lessons.find((lesson) => lesson.id === activeLessonId) || null : null;
    const progress = lessons.length === 0 ? 0 : completed.length / lessons.length;
    const positionSize = margin * leverage;
    const pnl = positionSize * (move / 100);
    const equityAfterMove = margin + pnl;
    const liquidationMove = 100 / leverage;
    const isPnlPositive = pnl >= 0;
    const demo = academy.demo;
    const demoMarkets = useMemo(() => {
        const preferred = ['BTC', 'ETH', 'SOL'];
        const live = (markets || []).filter((market) => market.price > 0);
        const picked = preferred
            .map((name) => live.find((market) => market.name === name || market.symbol.startsWith(`${name}-`)))
            .filter((market): market is Market => Boolean(market));
        return picked.length > 0 ? picked : live.slice(0, 5);
    }, [markets]);
    const selectedMarket =
        demoMarkets.find((market) => market.name === demoSymbol || market.symbol === demoSymbol) ||
        demoMarkets[0];
    const positionMarket = demoPosition
        ? (markets || []).find((market) => market.symbol === demoPosition.symbol) || selectedMarket
        : selectedMarket;
    const livePrice = selectedMarket?.price || 50000;
    const currentDemoPrice = positionMarket?.price || demoPosition?.entryPrice || livePrice;
    const activeDemo = demoPosition || {
        symbol: selectedMarket?.symbol || 'BTC-USD',
        name: selectedMarket?.name || 'BTC',
        side: demoSide,
        margin: demoMargin,
        leverage: demoLeverage,
        entryPrice: livePrice,
    };
    const demoPositionSize = activeDemo.margin * activeDemo.leverage;
    const demoDirection = activeDemo.side === 'long' ? 1 : -1;
    const demoPriceMove = activeDemo.entryPrice > 0
        ? ((currentDemoPrice - activeDemo.entryPrice) / activeDemo.entryPrice) * 100
        : 0;
    const demoPnl = demoPositionSize * (demoPriceMove / 100) * demoDirection;
    const demoEquity = demoBalance + demoPnl;
    const demoLiquidationMove = 100 / activeDemo.leverage;
    const demoDanger = demoPosition
        ? (activeDemo.side === 'long' && demoPriceMove <= -demoLiquidationMove) ||
            (activeDemo.side === 'short' && demoPriceMove >= demoLiquidationMove)
        : false;

    const toggleCompleted = (id: string) => {
        const next = completed.includes(id)
            ? completed.filter((item) => item !== id)
            : [...completed, id];
        setCompleted(next);
        writeCompleted(next);
    };

    const filters: { id: AcademyFilter; label: string }[] = [
        { id: 'all', label: academy.filters.all },
        { id: 'basics', label: academy.filters.basics },
        { id: 'risk', label: academy.filters.risk },
    ];

    const openDemoPosition = () => {
        setDemoPosition({
            symbol: selectedMarket?.symbol || 'BTC-USD',
            name: selectedMarket?.name || 'BTC',
            side: demoSide,
            margin: Math.min(demoMargin, demoBalance),
            leverage: demoLeverage,
            entryPrice: livePrice,
        });
    };

    const closeDemoPosition = () => {
        setDemoBalance((value) => Math.max(0, value + demoPnl));
        setDemoPosition(null);
    };

    const resetDemo = () => {
        setDemoBalance(1000);
        setDemoSymbol('BTC');
        setDemoSide('long');
        setDemoMargin(100);
        setDemoLeverage(3);
        setDemoPosition(null);
    };

    return (
        <ScreenV2 pad={0} glow={false}>
            <div style={styles.shell}>
                <header style={styles.header}>
                    <div style={styles.kicker}>
                        <Icon name="bolt" size={14} color="var(--color-brand-primary)" strokeWidth={2.4} />
                        {academy.kicker}
                    </div>
                    <h1 style={styles.title}>{academy.title}</h1>
                    <p style={styles.subtitle}>{academy.subtitle}</p>
                </header>

                <section style={styles.progressCard}>
                    <div style={styles.progressTop}>
                        <div>
                            <div style={styles.cardLabel}>{academy.progress.label}</div>
                            <div style={styles.progressValue} className="font-mono">
                                {formatPercent(progress * 100, 0)}
                            </div>
                        </div>
                        <div style={styles.progressCount} className="font-mono">
                            {completed.length}/{lessons.length}
                        </div>
                    </div>
                    <div style={styles.progressTrack}>
                        <div
                            style={{
                                ...styles.progressFill,
                                width: `${Math.round(progress * 100)}%`,
                            }}
                        />
                    </div>
                    <p style={styles.progressCopy}>{academy.progress.copy}</p>
                </section>

                <section style={styles.simulatorCard}>
                    <div style={styles.sectionHead}>
                        <Icon name="sliders" size={17} color="var(--color-brand-primary)" />
                        <h2 style={styles.sectionTitle}>{academy.simulator.title}</h2>
                    </div>
                    <p style={styles.bodyCopy}>{academy.simulator.copy}</p>

                    <div style={styles.controlsGrid}>
                        <NumberField
                            label={academy.simulator.margin}
                            value={margin}
                            min={10}
                            max={10000}
                            step={10}
                            prefix="$"
                            onChange={setMargin}
                        />
                        <NumberField
                            label={academy.simulator.leverage}
                            value={leverage}
                            min={1}
                            max={20}
                            step={1}
                            suffix="x"
                            onChange={setLeverage}
                        />
                        <NumberField
                            label={academy.simulator.move}
                            value={move}
                            min={-20}
                            max={20}
                            step={1}
                            suffix="%"
                            onChange={setMove}
                        />
                    </div>

                    <div style={styles.resultGrid}>
                        <Metric label={academy.simulator.position} value={formatCurrency(positionSize, 0)} />
                        <Metric
                            label={academy.simulator.pnl}
                            value={`${isPnlPositive ? '+' : ''}${formatCurrency(pnl, 2)}`}
                            tone={isPnlPositive ? 'positive' : 'negative'}
                        />
                        <Metric label={academy.simulator.equity} value={formatCurrency(equityAfterMove, 2)} />
                        <Metric label={academy.simulator.liquidation} value={`~${formatPercent(liquidationMove, 1)}`} tone="negative" />
                    </div>
                    <p style={styles.riskNote}>{academy.simulator.note}</p>
                </section>

                <section style={styles.demoCard}>
                    <div style={styles.demoTop}>
                        <div>
                            <div style={styles.sectionHead}>
                                <Icon name="target" size={17} color="var(--color-brand-primary)" />
                                <h2 style={styles.sectionTitle}>{demo.title}</h2>
                            </div>
                            <p style={styles.bodyCopy}>{demo.copy}</p>
                        </div>
                        <div style={styles.fakeBadge}>{demo.fakeBadge}</div>
                    </div>

                    <div style={styles.demoBalanceRow}>
                        <Metric label={demo.balance} value={formatCurrency(demoBalance, 2)} />
                        <Metric
                            label={demo.unrealized}
                            value={`${demoPnl >= 0 ? '+' : ''}${formatCurrency(demoPnl, 2)}`}
                            tone={demoPnl >= 0 ? 'positive' : 'negative'}
                        />
                    </div>

                    <div style={styles.marketStrip} aria-label={demo.market}>
                        {demoMarkets.map((market) => {
                            const on = activeDemo.symbol === market.symbol;
                            const disabled = !!demoPosition;
                            return (
                                <button
                                    key={market.symbol}
                                    type="button"
                                    onClick={() => !disabled && setDemoSymbol(market.name)}
                                    disabled={disabled}
                                    style={{
                                        ...styles.marketChip,
                                        ...(on ? styles.marketChipActive : undefined),
                                        ...(disabled ? styles.disabledButton : undefined),
                                    }}
                                >
                                    <span>{market.name}</span>
                                    <span className="font-mono">{formatCurrency(market.price, market.price < 10 ? 3 : 0)}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div style={styles.demoSetup}>
                        <div>
                            <div style={styles.fieldLabel}>{demo.side}</div>
                            <div style={styles.sideToggle}>
                                <button
                                    type="button"
                                    onClick={() => !demoPosition && setDemoSide('long')}
                                    disabled={!!demoPosition}
                                    style={{
                                        ...styles.sideButton,
                                        ...(activeDemo.side === 'long' ? styles.sideButtonLong : undefined),
                                    }}
                                >
                                    {demo.long}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => !demoPosition && setDemoSide('short')}
                                    disabled={!!demoPosition}
                                    style={{
                                        ...styles.sideButton,
                                        ...(activeDemo.side === 'short' ? styles.sideButtonShort : undefined),
                                    }}
                                >
                                    {demo.short}
                                </button>
                            </div>
                        </div>
                        <NumberField
                            label={demo.margin}
                            value={activeDemo.margin}
                            min={10}
                            max={Math.max(10, demoBalance)}
                            step={10}
                            prefix="$"
                            disabled={!!demoPosition}
                            onChange={setDemoMargin}
                        />
                        <NumberField
                            label={demo.leverage}
                            value={activeDemo.leverage}
                            min={1}
                            max={20}
                            step={1}
                            suffix="x"
                            disabled={!!demoPosition}
                            onChange={setDemoLeverage}
                        />
                    </div>

                    <div style={styles.pricePanel}>
                        <div style={styles.priceRow}>
                            <div>
                                <div style={styles.metricLabel}>{demo.entry}</div>
                                <div style={styles.priceValue} className="font-mono">{formatCurrency(activeDemo.entryPrice, 0)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={styles.metricLabel}>{demo.current}</div>
                                <div
                                    style={{
                                        ...styles.priceValue,
                                        color: demoPriceMove >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                                    }}
                                    className="font-mono"
                                >
                                    {formatCurrency(currentDemoPrice, currentDemoPrice < 10 ? 3 : 0)}
                                </div>
                            </div>
                        </div>
                        <div style={styles.liveMoveRow}>
                            <span>{demo.liveMove}</span>
                            <span
                                className="font-mono"
                                style={{ color: demoPriceMove >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
                            >
                                {demoPriceMove >= 0 ? '+' : ''}{formatPercent(demoPriceMove, 2)}
                            </span>
                        </div>
                    </div>

                    <div style={styles.resultGrid}>
                        <Metric label={demo.position} value={formatCurrency(demoPositionSize, 0)} />
                        <Metric label={demo.liquidation} value={`~${formatPercent(demoLiquidationMove, 1)}`} tone="negative" />
                        <Metric
                            label={demo.equity}
                            value={formatCurrency(demoEquity, 2)}
                            tone={demoEquity >= demoBalance ? 'positive' : 'negative'}
                        />
                        <Metric
                            label={demo.status}
                            value={demoDanger ? demo.liquidated : demoPosition ? demo.openStatus : demo.readyStatus}
                            tone={demoDanger ? 'negative' : demoPosition ? 'positive' : undefined}
                        />
                    </div>

                    <div style={styles.demoActions}>
                        {demoPosition ? (
                            <button type="button" onClick={closeDemoPosition} style={styles.primaryAction}>
                                {demo.close}
                            </button>
                        ) : (
                            <button type="button" onClick={openDemoPosition} style={styles.primaryAction}>
                                {demo.open}
                            </button>
                        )}
                        <button type="button" onClick={resetDemo} style={styles.secondaryAction}>
                            {demo.reset}
                        </button>
                    </div>
                    <p style={styles.progressCopy}>{demo.note}</p>
                </section>

                <nav style={styles.filterRow} aria-label={academy.filters.label}>
                    {filters.map((item) => {
                        const active = item.id === filter;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setFilter(item.id)}
                                style={{
                                    ...styles.filterButton,
                                    ...(active ? styles.filterButtonActive : undefined),
                                }}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <section style={styles.lessonGrid}>
                    {filteredLessons.map((lesson, index) => {
                        const done = completed.includes(lesson.id);
                        return (
                            <button
                                key={lesson.id}
                                type="button"
                                onClick={() => setActiveLessonId(lesson.id)}
                                style={styles.lessonCard}
                            >
                                <div style={styles.lessonNumber} className="font-mono">
                                    {String(index + 1).padStart(2, '0')}
                                </div>
                                <div style={styles.lessonBody}>
                                    <div style={styles.lessonMeta}>
                                        <span>{lesson.level}</span>
                                        <span className="font-mono">{lesson.duration}</span>
                                    </div>
                                    <div style={styles.lessonTitle}>{lesson.title}</div>
                                    <p style={styles.lessonSummary}>{lesson.summary}</p>
                                </div>
                                <div style={done ? styles.doneBadge : styles.openBadge}>
                                    <Icon name={done ? 'check' : 'chevronRight'} size={14} color={done ? 'var(--color-positive)' : 'var(--color-text-tertiary)'} strokeWidth={2.6} />
                                </div>
                            </button>
                        );
                    })}
                </section>

                <section style={styles.checklistCard}>
                    <div style={styles.sectionHead}>
                        <Icon name="target" size={17} color="var(--color-brand-primary)" />
                        <h2 style={styles.sectionTitle}>{academy.checklist.title}</h2>
                    </div>
                    <div style={styles.checklist}>
                        {academy.checklist.items.map((item) => (
                            <div key={item} style={styles.checkItem}>
                                <span style={styles.checkDot} />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                    <div style={styles.languageHint}>{language === 'es' ? academy.languageHint.es : academy.languageHint.en}</div>
                </section>
            </div>

            {activeLesson && (
                <LessonReader
                    lesson={activeLesson}
                    labels={{
                        lessonLabel: academy.lessonLabel,
                        close: academy.closeLesson,
                        markComplete: academy.markComplete,
                        completed: academy.completed,
                    }}
                    done={completed.includes(activeLesson.id)}
                    onClose={() => setActiveLessonId(null)}
                    onToggle={() => toggleCompleted(activeLesson.id)}
                />
            )}
        </ScreenV2>
    );
}

function NumberField({
    label,
    value,
    min,
    max,
    step,
    prefix,
    suffix,
    disabled,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    prefix?: string;
    suffix?: string;
    disabled?: boolean;
    onChange: (value: number) => void;
}) {
    const updateValue = (raw: string) => {
        const parsed = Number(raw);
        if (Number.isNaN(parsed)) return;
        onChange(Math.min(max, Math.max(min, parsed)));
    };

    return (
        <label style={styles.field}>
            <span style={styles.fieldLabel}>{label}</span>
            <div style={styles.inputWrap}>
                {prefix && <span style={styles.inputAffix}>{prefix}</span>}
                <input
                    className="font-mono"
                    type="number"
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    disabled={disabled}
                    onChange={(event) => updateValue(event.target.value)}
                    style={{ ...styles.input, ...(disabled ? styles.disabledInput : undefined) }}
                />
                {suffix && <span style={styles.inputAffix}>{suffix}</span>}
            </div>
        </label>
    );
}

function Metric({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone?: 'positive' | 'negative';
}) {
    const color =
        tone === 'positive'
            ? 'var(--color-positive)'
            : tone === 'negative'
                ? 'var(--color-negative)'
                : 'var(--color-text-primary)';

    return (
        <div style={styles.metric}>
            <div style={styles.metricLabel}>{label}</div>
            <div style={{ ...styles.metricValue, color }} className="font-mono">
                {value}
            </div>
        </div>
    );
}

function LessonReader({
    lesson,
    labels,
    done,
    onClose,
    onToggle,
}: {
    lesson: AcademyLesson;
    labels: {
        lessonLabel: string;
        close: string;
        markComplete: string;
        completed: string;
    };
    done: boolean;
    onClose: () => void;
    onToggle: () => void;
}) {
    return (
        <div style={styles.lessonOverlay}>
            <div style={styles.lessonBackdrop} onClick={onClose} />
            <article style={styles.lessonSheet}>
                <div style={styles.readerTop}>
                    <button type="button" onClick={onClose} style={styles.closeButton} aria-label={labels.close}>
                        <Icon name="chevronLeft" size={18} color="var(--color-text-secondary)" />
                    </button>
                    <div style={{ minWidth: 0 }}>
                        <div style={styles.cardLabel}>{labels.lessonLabel}</div>
                        <h2 style={styles.readerTitle}>{lesson.title}</h2>
                    </div>
                </div>

                <p style={styles.readerSummary}>{lesson.summary}</p>

                <div style={styles.takeawayList}>
                    {lesson.takeaways.map((takeaway) => (
                        <div key={takeaway} style={styles.takeaway}>
                            <Icon name="check" size={15} color="var(--color-positive)" strokeWidth={2.7} />
                            <span>{takeaway}</span>
                        </div>
                    ))}
                </div>

                <div style={styles.exampleBox}>
                    <div style={styles.exampleLabel}>{lesson.example.label}</div>
                    <div style={styles.exampleValue} className="font-mono">{lesson.example.value}</div>
                    <p style={styles.exampleNote}>{lesson.example.note}</p>
                </div>

                <div style={styles.readerActions}>
                    <button
                        type="button"
                        onClick={onToggle}
                        style={done ? styles.completeButtonDone : styles.completeButton}
                    >
                        {done ? labels.completed : labels.markComplete}
                    </button>
                    <button type="button" onClick={onClose} style={styles.secondaryAction}>
                        {labels.close}
                    </button>
                </div>
            </article>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    shell: {
        minHeight: '100%',
        padding: 'var(--space-12) var(--space-5) var(--space-8)',
        color: 'var(--color-text-primary)',
        background: 'var(--color-bg-primary)',
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-4)',
    },
    kicker: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        color: 'var(--color-brand-primary)',
        fontSize: 'var(--text-xs)',
        fontWeight: 800,
        letterSpacing: 'var(--tracking-wide)',
        textTransform: 'uppercase',
    },
    title: {
        margin: 0,
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-3xl)',
        lineHeight: 'var(--leading-tight)',
        fontWeight: 800,
        letterSpacing: 'var(--tracking-normal)',
    },
    subtitle: {
        margin: 0,
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
        lineHeight: 'var(--leading-normal)',
    },
    progressCard: {
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border-default)',
        background: 'var(--color-bg-secondary)',
        marginBottom: 'var(--space-3)',
    },
    progressTop: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        alignItems: 'flex-start',
    },
    cardLabel: {
        color: 'var(--color-text-tertiary)',
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-wide)',
    },
    progressValue: {
        marginTop: 'var(--space-1)',
        fontSize: 'var(--text-2xl)',
        fontWeight: 800,
        color: 'var(--color-text-primary)',
    },
    progressCount: {
        padding: 'var(--space-1) var(--space-2)',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-brand-primary-muted)',
        color: 'var(--color-brand-primary)',
        fontSize: 'var(--text-xs)',
        fontWeight: 800,
    },
    progressTrack: {
        height: 'var(--space-2)',
        marginTop: 'var(--space-3)',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-bg-tertiary)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-brand-primary)',
        transition: 'width var(--transition-base)',
    },
    progressCopy: {
        margin: 'var(--space-3) 0 0',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-xs)',
        lineHeight: 'var(--leading-normal)',
    },
    simulatorCard: {
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border-default)',
        background: 'var(--color-bg-secondary)',
        marginBottom: 'var(--space-3)',
    },
    sectionHead: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-2)',
    },
    sectionTitle: {
        margin: 0,
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-lg)',
        fontWeight: 800,
        letterSpacing: 'var(--tracking-normal)',
    },
    bodyCopy: {
        margin: 0,
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
        lineHeight: 'var(--leading-normal)',
    },
    controlsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 'var(--space-2)',
        marginTop: 'var(--space-4)',
    },
    field: {
        minWidth: 0,
    },
    fieldLabel: {
        display: 'block',
        color: 'var(--color-text-tertiary)',
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        marginBottom: 'var(--space-1)',
    },
    inputWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        minHeight: 'var(--space-10)',
        padding: '0 var(--space-2)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-default)',
        background: 'var(--color-bg-tertiary)',
        color: 'var(--color-text-primary)',
    },
    inputAffix: {
        color: 'var(--color-text-tertiary)',
        fontSize: 'var(--text-xs)',
        fontWeight: 800,
        flexShrink: 0,
    },
    input: {
        width: '100%',
        minWidth: 0,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-sm)',
        fontWeight: 800,
    },
    disabledInput: {
        color: 'var(--color-text-tertiary)',
        cursor: 'not-allowed',
    },
    demoCard: {
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-brand-primary-border)',
        background: 'var(--color-bg-secondary)',
        marginBottom: 'var(--space-3)',
    },
    demoTop: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        alignItems: 'flex-start',
    },
    fakeBadge: {
        flexShrink: 0,
        padding: 'var(--space-1) var(--space-2)',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-brand-primary-muted)',
        color: 'var(--color-brand-primary)',
        fontSize: 'var(--text-xs)',
        fontWeight: 900,
        letterSpacing: 'var(--tracking-wide)',
        textTransform: 'uppercase',
    },
    marketStrip: {
        display: 'flex',
        gap: 'var(--space-2)',
        marginTop: 'var(--space-4)',
        overflowX: 'auto',
    },
    marketChip: {
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 'var(--space-1)',
        minWidth: 92,
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-tertiary)',
        color: 'var(--color-text-secondary)',
        padding: 'var(--space-2) var(--space-3)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        fontWeight: 800,
        cursor: 'pointer',
    },
    marketChipActive: {
        borderColor: 'var(--color-brand-primary-border)',
        background: 'var(--color-brand-primary-muted)',
        color: 'var(--color-brand-primary)',
    },
    disabledButton: {
        cursor: 'not-allowed',
        opacity: 0.72,
    },
    demoBalanceRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 'var(--space-2)',
        marginTop: 'var(--space-4)',
    },
    demoSetup: {
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr 1fr',
        gap: 'var(--space-2)',
        marginTop: 'var(--space-4)',
    },
    sideToggle: {
        minHeight: 'var(--space-10)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-1)',
        padding: 'var(--space-1)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-default)',
        background: 'var(--color-bg-tertiary)',
    },
    sideButton: {
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        background: 'transparent',
        color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        fontWeight: 900,
        cursor: 'pointer',
    },
    sideButtonLong: {
        background: 'var(--color-positive-muted)',
        color: 'var(--color-positive)',
    },
    sideButtonShort: {
        background: 'var(--color-negative-muted)',
        color: 'var(--color-negative)',
    },
    pricePanel: {
        marginTop: 'var(--space-4)',
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-tertiary)',
    },
    priceRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        alignItems: 'flex-start',
        marginBottom: 'var(--space-3)',
    },
    liveMoveRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-3)',
        paddingTop: 'var(--space-3)',
        borderTop: '1px solid var(--color-border-subtle)',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
        fontWeight: 800,
    },
    priceValue: {
        marginTop: 'var(--space-1)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-xl)',
        fontWeight: 900,
    },
    rangeField: {
        display: 'block',
    },
    rangeLabelRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-2)',
    },
    rangeValue: {
        color: 'var(--color-brand-primary)',
        fontSize: 'var(--text-xs)',
        fontWeight: 900,
    },
    rangeInput: {
        width: '100%',
        accentColor: 'var(--color-brand-primary)',
    },
    demoActions: {
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 'var(--space-2)',
        marginTop: 'var(--space-4)',
    },
    primaryAction: {
        minHeight: 'var(--space-10)',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-brand-primary)',
        color: 'var(--color-text-on-brand)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        fontWeight: 900,
        cursor: 'pointer',
    },
    secondaryAction: {
        minHeight: 'var(--space-10)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-tertiary)',
        color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        fontWeight: 800,
        cursor: 'pointer',
        padding: '0 var(--space-3)',
    },
    resultGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 'var(--space-2)',
        marginTop: 'var(--space-4)',
    },
    metric: {
        minWidth: 0,
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border-subtle)',
    },
    metricLabel: {
        color: 'var(--color-text-tertiary)',
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
    },
    metricValue: {
        marginTop: 'var(--space-1)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-base)',
        fontWeight: 800,
        overflowWrap: 'anywhere',
    },
    riskNote: {
        margin: 'var(--space-3) 0 0',
        color: 'var(--color-negative)',
        fontSize: 'var(--text-xs)',
        lineHeight: 'var(--leading-normal)',
    },
    filterRow: {
        display: 'flex',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-3)',
        overflowX: 'auto',
    },
    filterButton: {
        flexShrink: 0,
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-secondary)',
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 'var(--text-sm)',
        fontWeight: 800,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
    },
    filterButtonActive: {
        borderColor: 'var(--color-brand-primary-border)',
        background: 'var(--color-brand-primary-muted)',
        color: 'var(--color-brand-primary)',
    },
    lessonGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-3)',
    },
    lessonCard: {
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border-default)',
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
    },
    lessonCardActive: {
        borderColor: 'var(--color-brand-primary-border)',
        background: 'var(--color-bg-tertiary)',
    },
    lessonNumber: {
        width: 'var(--space-10)',
        height: 'var(--space-10)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-brand-primary)',
        background: 'var(--color-brand-primary-muted)',
        fontSize: 'var(--text-xs)',
        fontWeight: 900,
    },
    lessonBody: {
        minWidth: 0,
    },
    lessonMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        color: 'var(--color-text-tertiary)',
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
    },
    lessonTitle: {
        marginTop: 'var(--space-1)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-base)',
        fontWeight: 800,
        lineHeight: 'var(--leading-tight)',
    },
    lessonSummary: {
        margin: 'var(--space-1) 0 0',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
        lineHeight: 'var(--leading-snug)',
    },
    doneBadge: {
        width: 'var(--space-8)',
        height: 'var(--space-8)',
        borderRadius: 'var(--radius-full)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-positive-muted)',
        flexShrink: 0,
    },
    openBadge: {
        width: 'var(--space-8)',
        height: 'var(--space-8)',
        borderRadius: 'var(--radius-full)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-tertiary)',
        flexShrink: 0,
    },
    detailCard: {
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border-default)',
        background: 'var(--color-bg-secondary)',
        marginBottom: 'var(--space-3)',
    },
    detailHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
    },
    detailTitle: {
        margin: 'var(--space-1) 0 0',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-xl)',
        lineHeight: 'var(--leading-tight)',
        fontWeight: 800,
        letterSpacing: 'var(--tracking-normal)',
    },
    completeButton: {
        flexShrink: 0,
        border: '1px solid var(--color-brand-primary-border)',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-brand-primary-muted)',
        color: 'var(--color-brand-primary)',
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 'var(--text-xs)',
        fontWeight: 900,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
    },
    completeButtonDone: {
        flexShrink: 0,
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-positive-muted)',
        color: 'var(--color-positive)',
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 'var(--text-xs)',
        fontWeight: 900,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
    },
    takeawayList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        marginTop: 'var(--space-4)',
    },
    takeaway: {
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        alignItems: 'start',
        gap: 'var(--space-2)',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
        lineHeight: 'var(--leading-normal)',
    },
    exampleBox: {
        marginTop: 'var(--space-4)',
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-brand-primary-border)',
        background: 'var(--color-brand-primary-muted)',
    },
    exampleLabel: {
        color: 'var(--color-brand-primary)',
        fontSize: 'var(--text-xs)',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-wide)',
    },
    exampleValue: {
        marginTop: 'var(--space-1)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-lg)',
        fontWeight: 900,
    },
    exampleNote: {
        margin: 'var(--space-2) 0 0',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
        lineHeight: 'var(--leading-normal)',
    },
    checklistCard: {
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border-default)',
        background: 'var(--color-bg-secondary)',
    },
    checklist: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        marginTop: 'var(--space-3)',
    },
    checkItem: {
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        gap: 'var(--space-2)',
        alignItems: 'start',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
        lineHeight: 'var(--leading-normal)',
    },
    checkDot: {
        width: 'var(--space-2)',
        height: 'var(--space-2)',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-brand-primary)',
        marginTop: 'var(--space-2)',
    },
    languageHint: {
        marginTop: 'var(--space-4)',
        color: 'var(--color-text-tertiary)',
        fontSize: 'var(--text-xs)',
        lineHeight: 'var(--leading-normal)',
    },
    lessonOverlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 'var(--space-4)',
    },
    lessonBackdrop: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
    },
    lessonSheet: {
        position: 'relative',
        width: '100%',
        maxWidth: 440,
        maxHeight: '86vh',
        overflowY: 'auto',
        padding: 'var(--space-5)',
        borderRadius: 'var(--radius-2xl)',
        border: '1px solid var(--color-border-default)',
        background: 'var(--color-bg-elevated)',
        boxShadow: '0 24px 70px rgba(0,0,0,0.68)',
    },
    readerTop: {
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        alignItems: 'start',
        gap: 'var(--space-3)',
    },
    closeButton: {
        width: 'var(--space-10)',
        height: 'var(--space-10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-bg-tertiary)',
        cursor: 'pointer',
    },
    readerTitle: {
        margin: 'var(--space-1) 0 0',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-2xl)',
        lineHeight: 'var(--leading-tight)',
        fontWeight: 900,
        letterSpacing: 'var(--tracking-normal)',
    },
    readerSummary: {
        margin: 'var(--space-4) 0 0',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-base)',
        lineHeight: 'var(--leading-normal)',
    },
    readerActions: {
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 'var(--space-2)',
        marginTop: 'var(--space-5)',
    },
};

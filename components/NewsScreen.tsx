'use client';

// V2 news feed — aggregated crypto headlines (Spanish-first) from /api/news.
// Text-only by design (no thumbnails). Tapping a card opens the article in an
// in-app reader (server-extracted text via /api/news/article) — never leaves
// the app. Ticker chips navigate straight to the trade screen for that asset.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNews, type NewsItem } from '@/hooks/useNews';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { apiUrl } from '@/lib/api-base';
import { ScreenV2, MarketLogo, Icon, V2 } from '@/components/V2Kit';

type Filter = 'all' | 'tradfi' | 'crypto' | 'es' | 'BTC' | 'ETH' | 'SOL';

const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Todas' },
    { id: 'tradfi', label: 'TradFi' },
    { id: 'crypto', label: 'Cripto' },
    { id: 'es', label: 'En español' },
    { id: 'BTC', label: 'Bitcoin' },
    { id: 'ETH', label: 'Ethereum' },
    { id: 'SOL', label: 'Solana' },
];

function timeAgo(ts: number): string {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 90) return 'ahora';
    const m = Math.floor(s / 60);
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'ayer' : `hace ${d} d`;
}

interface NewsScreenProps {
    /** Tap on a ticker chip → trade that asset. */
    onTickerClick?: (symbol: string) => void;
}

export default function NewsScreen({ onTickerClick }: NewsScreenProps) {
    const { data: items, isLoading, isError, refetch } = useNews();
    const { markets } = useHyperliquid();
    const [filter, setFilter] = useState<Filter>('all');
    const [reading, setReading] = useState<NewsItem | null>(null);

    const filtered = useMemo(() => {
        if (!items) return [];
        if (filter === 'all') return items;
        if (filter === 'es') return items.filter((it) => it.lang === 'es');
        if (filter === 'tradfi' || filter === 'crypto') return items.filter((it) => it.category === filter);
        return items.filter((it) => it.tickers.includes(filter));
    }, [items, filter]);

    // Tickers are bare names ("BTC") while market.symbol is "BTC-USD" —
    // resolve through the markets list and hand back the canonical symbol.
    const findMarket = (tk: string) =>
        (markets || []).find((m) => m.name === tk || m.symbol === tk);
    const tradeable = (tk: string) => !!findMarket(tk);

    const handleTicker = (tk: string) => {
        const mk = findMarket(tk);
        if (mk) onTickerClick?.(mk.symbol);
    };

    return (
        <ScreenV2 pad={0} glow={false}>
            {/* Header */}
            <div style={{ padding: '60px 20px 0' }}>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>Noticias</div>
                <div style={{ marginTop: 6, fontSize: 14, color: V2.t3 }}>
                    Lo que mueve al mercado, en un solo lugar.
                </div>
            </div>

            {/* Filter chips */}
            <div className="v2-noscroll" style={{ display: 'flex', gap: 8, padding: '16px 20px 4px', overflowX: 'auto' }}>
                {FILTERS.map((f) => {
                    const on = f.id === filter;
                    return (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            style={{
                                flexShrink: 0, padding: '8px 14px', borderRadius: 99, cursor: 'pointer',
                                fontFamily: V2.ui, fontSize: 13.5, fontWeight: 700,
                                border: on ? `1.5px solid ${V2.accent}` : `1px solid ${V2.hair}`,
                                background: on ? V2.accentSoft : 'transparent',
                                color: on ? V2.accent : V2.t2,
                            }}
                        >
                            {f.label}
                        </button>
                    );
                })}
            </div>

            {/* Feed */}
            <div style={{ padding: '10px 20px 30px' }}>
                {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="animate-pulse" style={{ height: 92, borderRadius: 16, background: V2.card, border: `1px solid ${V2.hair}` }} />
                        ))}
                    </div>
                ) : isError ? (
                    <div style={{ padding: '48px 0', textAlign: 'center' }}>
                        <div style={{ fontSize: 14, color: V2.t2 }}>No pudimos cargar las noticias.</div>
                        <button
                            onClick={() => refetch()}
                            style={{ marginTop: 14, padding: '10px 22px', borderRadius: 12, border: `1px solid ${V2.hair2}`, background: 'rgba(255,255,255,0.04)', color: V2.t1, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: V2.ui }}
                        >
                            Reintentar
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '48px 0', textAlign: 'center', color: V2.t3, fontSize: 13.5 }}>
                        No hay noticias para este filtro todavía.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filtered.map((it) => (
                            <NewsCard
                                key={it.id}
                                item={it}
                                onOpen={() => setReading(it)}
                                onTicker={handleTicker}
                                tradeable={tradeable}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* In-app reader */}
            {reading && (
                <ArticleReader
                    item={reading}
                    onClose={() => setReading(null)}
                    onTicker={(tk) => { setReading(null); handleTicker(tk); }}
                    tradeable={tradeable}
                />
            )}
        </ScreenV2>
    );
}

// ── Card ────────────────────────────────────────────────────────────────────

function NewsCard({
    item,
    onOpen,
    onTicker,
    tradeable,
}: {
    item: NewsItem;
    onOpen: () => void;
    onTicker: (tk: string) => void;
    tradeable: (tk: string) => boolean;
}) {
    return (
        <div
            onClick={onOpen}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
            style={{
                padding: 14, borderRadius: 16, cursor: 'pointer',
                background: V2.card, border: `1px solid ${V2.hair}`,
            }}
        >
            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: V2.t2 }}>{item.source}</span>
                <span style={{ fontSize: 11.5, color: V2.t3 }}>· {timeAgo(item.publishedAt)}</span>
                {item.sentiment && <SentimentBadge s={item.sentiment} />}
            </div>

            {/* Title */}
            <div
                style={{
                    marginTop: 6, fontSize: 14.5, fontWeight: 700, color: V2.t1, lineHeight: 1.35,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}
            >
                {item.title}
            </div>

            {/* Ticker chips → trade */}
            {item.tickers.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {item.tickers.slice(0, 3).map((tk) => (
                        <TickerChip key={tk} tk={tk} tradeable={tradeable(tk)} onClick={(e) => { e.stopPropagation(); onTicker(tk); }} />
                    ))}
                </div>
            )}
        </div>
    );
}

function SentimentBadge({ s }: { s: 'up' | 'down' }) {
    const up = s === 'up';
    return (
        <span
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                letterSpacing: '0.03em',
                background: up ? V2.posSoft : V2.negSoft,
                color: up ? V2.pos : V2.neg,
            }}
        >
            <Icon name={up ? 'arrowUpRight' : 'arrowDownLeft'} size={10} color={up ? V2.pos : V2.neg} strokeWidth={3} />
            {up ? 'Alcista' : 'Bajista'}
        </span>
    );
}

function TickerChip({
    tk,
    tradeable,
    onClick,
}: {
    tk: string;
    tradeable: boolean;
    onClick: (e: React.MouseEvent) => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={!tradeable}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10.5, fontWeight: 800, padding: '4px 9px 4px 4px', borderRadius: 99,
                fontFamily: V2.ui, cursor: tradeable ? 'pointer' : 'default',
                background: tradeable ? V2.accentSoft : 'rgba(255,255,255,0.05)',
                border: tradeable ? '1px solid rgba(227,179,76,0.3)' : '1px solid transparent',
                color: tradeable ? V2.accent : V2.t2,
            }}
        >
            <MarketLogo sym={tk} size={15} />
            {tk}
            {tradeable && <Icon name="arrowUpRight" size={10} color={V2.accent} strokeWidth={3} />}
        </button>
    );
}

// ── In-app reader ───────────────────────────────────────────────────────────

function ArticleReader({
    item,
    onClose,
    onTicker,
    tradeable,
}: {
    item: NewsItem;
    onClose: () => void;
    onTicker: (tk: string) => void;
    tradeable: (tk: string) => boolean;
}) {
    const { data, isLoading, isError } = useQuery<{ title: string; paragraphs: string[] }>({
        queryKey: ['article', item.url],
        queryFn: async () => {
            const res = await fetch(apiUrl(`/api/news/article?url=${encodeURIComponent(item.url)}`));
            if (!res.ok) throw new Error('article fetch failed');
            return res.json();
        },
        staleTime: 30 * 60 * 1000,
        retry: 1,
    });

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: V2.bg, fontFamily: V2.ui, color: V2.t1, display: 'flex', flexDirection: 'column' }}>
            {/* Top bar */}
            <div style={{ padding: '54px 18px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${V2.hair}` }}>
                <button onClick={onClose} aria-label="Volver" style={circleBtn}>
                    <Icon name="chevronLeft" size={18} color={V2.t1} />
                </button>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{item.source}</div>
                    <div style={{ fontSize: 11.5, color: V2.t3 }}>{timeAgo(item.publishedAt)}</div>
                </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px 20px calc(40px + env(safe-area-inset-bottom))' }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.3, margin: 0 }}>
                    {data?.title || item.title}
                </h1>

                {(item.sentiment || item.tickers.length > 0) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                        {item.sentiment && <SentimentBadge s={item.sentiment} />}
                        {item.tickers.map((tk) => (
                            <TickerChip key={tk} tk={tk} tradeable={tradeable(tk)} onClick={(e) => { e.stopPropagation(); onTicker(tk); }} />
                        ))}
                    </div>
                )}

                <div style={{ marginTop: 20 }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div key={i} className="animate-pulse" style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.06)', width: `${88 - (i % 3) * 14}%` }} />
                            ))}
                        </div>
                    ) : isError || !data?.paragraphs?.length ? (
                        <div style={{ padding: '28px 0', textAlign: 'center', color: V2.t3, fontSize: 13.5, lineHeight: 1.5 }}>
                            No pudimos extraer el texto de este artículo.
                        </div>
                    ) : (
                        data.paragraphs.map((p, i) => (
                            <p key={i} style={{ fontSize: 15.5, lineHeight: 1.65, color: V2.t2, margin: '0 0 16px' }}>
                                {p}
                            </p>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

const circleBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
};

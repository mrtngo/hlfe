'use client';

// Feed — what other Delos users are trading (opt-in only) mixed with news.
// Trades show direction + asset + result % on close; never amounts (privacy
// choice, see app/api/feed).

import { useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useFeed, type FeedTradeItem } from '@/hooks/useFeed';
import { useNews, type NewsItem } from '@/hooks/useNews';
import { useUser } from '@/hooks/useUser';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { haptic } from '@/lib/haptics';
import { ScreenV2, V2Header, MarketLogo, Icon, V2 } from '@/components/V2Kit';
import UserAvatar from '@/components/UserAvatar';
import { ArticleReader, TickerChip } from '@/components/NewsScreen';

type Filter = 'all' | 'trades' | 'news';
type Entry = { kind: 'trade'; time: number; trade: FeedTradeItem } | { kind: 'news'; time: number; news: NewsItem };

const BANNER_DISMISSED_KEY = 'delos:feedShareBannerDismissed';

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

export default function FeedScreen({
    onTokenClick,
    onSignIn,
}: {
    /** Tap a trade / ticker → that market. */
    onTokenClick?: (symbol: string) => void;
    onSignIn?: () => void;
}) {
    const { t } = useLanguage();
    const f = t.feed;
    const { authenticated } = usePrivy();
    const { user, setShareTrades } = useUser();
    const { markets } = useHyperliquid();
    const feed = useFeed();
    const news = useNews();
    const [filter, setFilter] = useState<Filter>('all');
    const [reading, setReading] = useState<NewsItem | null>(null);
    const [savingShare, setSavingShare] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(() => {
        try {
            return typeof window !== 'undefined' && localStorage.getItem(BANNER_DISMISSED_KEY) === '1';
        } catch {
            return false;
        }
    });

    const findMarket = (tk: string) => (markets || []).find((m) => m.name === tk || m.symbol === tk);
    const tradeable = (tk: string) => !!findMarket(tk);
    const openTicker = (tk: string) => {
        const mk = findMarket(tk);
        if (mk) onTokenClick?.(mk.symbol);
    };

    const entries = useMemo<Entry[]>(() => {
        const trades: Entry[] = (feed.data?.items ?? []).map((trade) => ({ kind: 'trade', time: trade.time, trade }));
        const newsEntries: Entry[] = (news.data ?? []).slice(0, 30).map((n) => ({ kind: 'news', time: n.publishedAt, news: n }));
        const pool = filter === 'trades' ? trades : filter === 'news' ? newsEntries : [...trades, ...newsEntries];
        return pool.sort((a, b) => b.time - a.time);
    }, [feed.data, news.data, filter]);

    const sharing = !!user?.share_trades;
    const showShareBanner = authenticated && !!user && !sharing && !bannerDismissed;
    const noSharers = (feed.data?.sharers ?? 0) === 0;
    const loading = feed.isLoading || news.isLoading;

    const turnOnSharing = async () => {
        haptic.medium();
        setSavingShare(true);
        await setShareTrades(true, 'feed_banner');
        setSavingShare(false);
        feed.refetch();
    };
    const dismissBanner = () => {
        setBannerDismissed(true);
        try {
            localStorage.setItem(BANNER_DISMISSED_KEY, '1');
        } catch {
            /* private mode */
        }
    };

    return (
        <ScreenV2 pad={0}>
            <V2Header title={f.title} sub={f.sub} />

            <div style={{ padding: '0 20px' }}>
                {/* Filters */}
                <div className="v2-noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {([['all', f.filterAll], ['trades', f.filterTrades], ['news', f.filterNews]] as const).map(([id, label]) => {
                        const on = filter === id;
                        return (
                            <button
                                key={id}
                                onClick={() => { haptic.light(); setFilter(id); }}
                                style={{ padding: '8px 14px', borderRadius: 99, border: on ? 'none' : `1px solid ${V2.hair}`, background: on ? V2.accent : 'transparent', color: on ? V2.accentInk : V2.t2, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: V2.ui, whiteSpace: 'nowrap' }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Opt-in banner (Ley 1581: off until the user turns it on) */}
                {showShareBanner && filter !== 'news' && (
                    <div className="v2-card" style={{ marginTop: 12, padding: 16 }}>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>{f.shareTitle}</div>
                        <div style={{ marginTop: 6, fontSize: 13, color: V2.t2, lineHeight: 1.5 }}>{f.shareBody}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button onClick={dismissBanner} style={{ ...btn, flex: 1, background: 'transparent', border: `1px solid ${V2.hair2}`, color: V2.t2 }}>
                                {f.shareLater}
                            </button>
                            <button onClick={turnOnSharing} disabled={savingShare} style={{ ...btn, flex: 1.4, background: V2.accent, color: V2.accentInk, opacity: savingShare ? 0.6 : 1 }}>
                                {savingShare ? '…' : f.shareOn}
                            </button>
                        </div>
                    </div>
                )}

                {/* Nobody shares yet */}
                {!loading && noSharers && filter !== 'news' && (
                    <div style={{ marginTop: 12, padding: '18px 16px', borderRadius: 16, border: `1px dashed ${V2.hair2}`, textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{f.emptyTitle}</div>
                        <div style={{ marginTop: 4, fontSize: 12.5, color: V2.t3, lineHeight: 1.5 }}>{f.emptyBody}</div>
                        {!authenticated && onSignIn && (
                            <button onClick={onSignIn} style={{ ...btn, marginTop: 12, padding: '10px 18px', background: V2.accent, color: V2.accentInk }}>
                                {f.signIn}
                            </button>
                        )}
                    </div>
                )}

                {/* Timeline */}
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 24 }}>
                    {loading && entries.length === 0 && (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: V2.t3, fontSize: 13 }}>{f.loading}</div>
                    )}
                    {entries.map((e) =>
                        e.kind === 'trade' ? (
                            <TradeCard key={`t:${e.trade.id}`} item={e.trade} f={f} onOpen={() => openTicker(e.trade.coin)} />
                        ) : (
                            <NewsCard
                                key={`n:${e.news.id}`}
                                item={e.news}
                                onOpen={() => setReading(e.news)}
                                tradeable={tradeable}
                                onTicker={openTicker}
                            />
                        ),
                    )}
                </div>
            </div>

            {reading && (
                <ArticleReader
                    item={reading}
                    onClose={() => setReading(null)}
                    onTicker={(tk) => { setReading(null); openTicker(tk); }}
                    tradeable={tradeable}
                />
            )}
        </ScreenV2>
    );
}

function TradeCard({ item, f, onOpen }: { item: FeedTradeItem; f: Record<string, string>; onOpen: () => void }) {
    const name = item.user.username ? `@${item.user.username}` : item.user.displayName || 'Trader';
    const verb =
        item.action === 'open_long' ? f.actionBuy
        : item.action === 'open_short' ? f.actionShort
        : f.actionClose;
    const pct = item.resultPct;
    return (
        <button
            onClick={onOpen}
            className="v2-card"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, cursor: 'pointer', fontFamily: V2.ui, color: V2.t1, textAlign: 'left', width: '100%' }}
        >
            <UserAvatar avatarUrl={item.user.avatarUrl} name={item.user.username || item.user.displayName} size={38} />
            <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, lineHeight: 1.35 }}>
                    <b>{name}</b> <span style={{ color: V2.t2 }}>{verb}</span> <b>{item.coin}</b>
                </span>
                <span style={{ display: 'block', fontSize: 12, color: V2.t3, marginTop: 2 }}>{timeAgo(item.time)}</span>
            </span>
            {pct != null ? (
                <span className="font-mono" style={{ fontSize: 14, fontWeight: 800, color: pct >= 0 ? V2.pos : V2.neg, whiteSpace: 'nowrap' }}>
                    {pct >= 0 ? '+' : ''}{pct.toFixed(1).replace('.', ',')}%
                </span>
            ) : (
                <MarketLogo sym={item.symbol} size={30} />
            )}
        </button>
    );
}

function NewsCard({
    item,
    onOpen,
    tradeable,
    onTicker,
}: {
    item: NewsItem;
    onOpen: () => void;
    tradeable: (tk: string) => boolean;
    onTicker: (tk: string) => void;
}) {
    return (
        // div, not button: it contains ticker-chip buttons (no nested buttons).
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(ev) => { if (ev.key === 'Enter') onOpen(); }}
            className="v2-card"
            style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 16, cursor: 'pointer', fontFamily: V2.ui, color: V2.t1, textAlign: 'left', width: '100%' }}
        >
            <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="news" size={18} color={V2.t2} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 11.5, color: V2.t3, fontWeight: 600 }}>
                    {item.source} · {timeAgo(item.publishedAt)}
                </span>
                <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginTop: 3 }}>
                    {item.title}
                </span>
                {item.tickers.length > 0 && (
                    // Same chip as Noticias: token logo + name, tap → token page.
                    <span style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {item.tickers.slice(0, 3).map((tk) => (
                            <TickerChip
                                key={tk}
                                tk={tk}
                                tradeable={tradeable(tk)}
                                onClick={(ev) => { ev.stopPropagation(); onTicker(tk); }}
                            />
                        ))}
                    </span>
                )}
            </span>
        </div>
    );
}

const btn: React.CSSProperties = {
    padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: V2.ui, fontWeight: 800, fontSize: 13.5,
};

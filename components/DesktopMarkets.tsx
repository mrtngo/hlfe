'use client';

// DesktopMarkets — the markets list as a real wide desktop table.
// Same data/filters as MarketsScreen, but columns (asset · price · 24h ·
// sparkline · volume) using the full content width. Rendered inside
// DesktopShell; the mobile MarketsScreen is untouched.

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useHyperliquid, type Market } from '@/hooks/useHyperliquid';
import { useCurrency } from '@/context/CurrencyContext';
import { getTokenFullName, STORAGE_KEYS, DEFAULT_WATCHLIST } from '@/lib/constants';
import { CATEGORIES, marketMatchesCategory, type TokenCategory } from '@/lib/token-categories';
import { formatUsdPrice } from '@/lib/format/price';
import MiniChart from '@/components/MiniChart';
import { MarketLogo, PctBadge, V2 } from '@/components/V2Kit';

interface DesktopMarketsProps {
    onTokenClick?: (symbol: string) => void;
}

export default function DesktopMarkets({ onTokenClick }: DesktopMarketsProps) {
    const { markets, setSelectedMarket } = useHyperliquid();
    const { formatCurrency } = useCurrency();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<'all' | 'fav' | TokenCategory>('all');

    const [watchlist] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const allMarkets = useMemo(() => markets || [], [markets]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const watchset = watchlist.length > 0 ? watchlist : DEFAULT_WATCHLIST;
        return allMarkets
            .filter((m) => {
                if (q) {
                    const base = m.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                    if (
                        !base.toLowerCase().includes(q) &&
                        !m.name.toLowerCase().includes(q) &&
                        !getTokenFullName(base).toLowerCase().includes(q)
                    ) return false;
                }
                if (category === 'fav') return watchset.includes(m.name) || watchset.includes(m.symbol);
                if (category !== 'all') return marketMatchesCategory(m, category);
                return true;
            })
            .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
    }, [allMarkets, query, category, watchlist]);

    const tabs: { id: 'all' | 'fav' | TokenCategory; label: string }[] = [
        { id: 'all', label: 'Todos' },
        { id: 'fav', label: 'Favoritos' },
        ...CATEGORIES.filter((c) => c.id !== 'watchlist').map((c) => ({ id: c.id as TokenCategory, label: c.label })),
    ];

    const pick = (symbol: string) => {
        setSelectedMarket(symbol);
        onTokenClick?.(symbol);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Search + category tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                <div className="v2-noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                    {tabs.map((c) => {
                        const on = c.id === category;
                        return (
                            <button key={c.id} onClick={() => setCategory(c.id)}
                                style={{ padding: '8px 16px', borderRadius: 99, cursor: 'pointer', fontFamily: V2.ui, fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', border: on ? `1px solid ${V2.accent}` : `1px solid ${V2.hair}`, background: on ? V2.accentSoft : 'transparent', color: on ? V2.accent : V2.t3 }}>
                                {c.label}
                            </button>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', borderRadius: 12, border: `1px solid ${V2.hair}`, background: V2.card, minWidth: 240 }}>
                    <Search size={16} color={V2.t3} />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar mercado…"
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: V2.t1, fontSize: 14, fontFamily: V2.ui }} />
                </div>
            </div>

            {/* Table */}
            <div className="v2-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ ...rowGrid, padding: '12px 20px', borderBottom: `1px solid ${V2.hair}`, color: V2.t3, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <div>Activo</div>
                    <div style={{ textAlign: 'right' }}>Precio</div>
                    <div style={{ textAlign: 'right' }}>24h</div>
                    <div style={{ textAlign: 'center' }}>7d</div>
                    <div style={{ textAlign: 'right' }}>Volumen 24h</div>
                </div>

                {filtered.length === 0 ? (
                    <div style={{ padding: '48px 0', textAlign: 'center', color: V2.t3, fontSize: 14 }}>Sin resultados</div>
                ) : (
                    filtered.slice(0, 100).map((m, i) => (
                        <MarketRow key={m.name} market={m} last={i === Math.min(filtered.length, 100) - 1} onClick={() => pick(m.symbol)} formatCurrency={formatCurrency} />
                    ))
                )}
            </div>
        </div>
    );
}

const rowGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2.2fr) minmax(90px, 1fr) minmax(80px, 0.9fr) 90px minmax(110px, 1.1fr)',
    alignItems: 'center',
    gap: 16,
};

function MarketRow({ market, last, onClick, formatCurrency }: {
    market: Market; last: boolean; onClick: () => void; formatCurrency: (v: number, dp?: number) => string;
}) {
    const [hover, setHover] = useState(false);
    const ch = market.change24h || 0;
    const cleanTicker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
    return (
        <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()}
            onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            style={{ ...rowGrid, padding: '14px 20px', cursor: 'pointer', borderBottom: last ? 'none' : `1px solid ${V2.hair}`, background: hover ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
                <MarketLogo sym={market.symbol} size={38} />
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{cleanTicker}</div>
                    <div style={{ fontSize: 12.5, color: V2.t3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTokenFullName(cleanTicker)}</div>
                </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 700, fontFamily: V2.mono, fontVariantNumeric: 'tabular-nums' }}>
                {market.price ? `$${formatUsdPrice(market.price, market)}` : '—'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><PctBadge v={ch} size="sm" /></div>
            <div style={{ height: 32, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 76, height: 32 }}><MiniChart symbol={market.symbol} isStock={market.isStock === true} /></div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13.5, color: V2.t2, fontFamily: V2.mono, fontVariantNumeric: 'tabular-nums' }}>
                {market.volume24h ? formatCurrency(market.volume24h, 0) : '—'}
            </div>
        </div>
    );
}

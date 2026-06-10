'use client';

// Public, read-only profile of another trader: name/avatar, equity, 30-day
// realized PnL, current holdings (open positions) and recent trades (fills).
// All sourced from public Hyperliquid data via usePublicProfile.

import { useMemo } from 'react';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useCurrency } from '@/context/CurrencyContext';
import type { Fill, Position } from '@/types/hyperliquid';
import { ScreenV2, MarketLogo, Icon, V2 } from '@/components/V2Kit';

interface PublicProfileScreenProps {
    address: string;
    onBack: () => void;
    /** Tap a holding/trade row to open that market. */
    onTokenClick?: (symbol: string) => void;
}

function shortAddr(a: string) {
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function tickerOf(coin: string) {
    return coin.replace(/-USD$/i, '').replace(/-PERP$/i, '').replace(/^xyz:/i, '');
}

function timeAgo(ts: number): string {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return 'ahora';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
}

export default function PublicProfileScreen({ address, onBack, onTokenClick }: PublicProfileScreenProps) {
    const { profile, loading, error } = usePublicProfile(address);
    const { formatCurrency } = useCurrency();

    const name = profile?.user?.username
        ? `@${profile.user.username}`
        : profile?.user?.display_name || shortAddr(address);
    const avatarSeed = profile?.user?.username || address;

    const pnlUp = (profile?.pnl30d ?? 0) >= 0;

    const closedFills = useMemo(
        () => (profile?.fills || []).filter((f) => f.dir && f.dir !== ''),
        [profile?.fills],
    );

    return (
        <ScreenV2 pad={0} glow={false}>
            {/* Header */}
            <div style={{ padding: '54px 18px 0' }}>
                <button onClick={onBack} style={circleBtn} aria-label="Volver">
                    <Icon name="chevronLeft" size={18} color={V2.t1} />
                </button>
            </div>

            {/* Identity */}
            <div style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar seed={avatarSeed} url={profile?.user?.avatar_url} size={58} />
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                    </div>
                    <div style={{ fontSize: 13, color: V2.t3, fontFamily: V2.mono, marginTop: 2 }}>
                        {shortAddr(address)}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 10, padding: '20px 20px 0' }}>
                <Stat label="Valor de cuenta" value={loading ? '—' : formatCurrency(profile?.equity ?? 0)} />
                <Stat
                    label="PnL 30 días"
                    value={loading ? '—' : `${pnlUp ? '+' : '-'}${formatCurrency(Math.abs(profile?.pnl30d ?? 0))}`}
                    color={pnlUp ? V2.pos : V2.neg}
                />
            </div>

            {error && (
                <div style={{ margin: '20px', padding: '14px 16px', borderRadius: 12, background: V2.negSoft, border: '1px solid rgba(239,68,68,0.2)', color: V2.neg, fontSize: 13, textAlign: 'center' }}>
                    {error}
                </div>
            )}

            {/* Holdings */}
            <Section title="Posiciones abiertas" count={profile?.positions.length}>
                {loading ? (
                    <Skeletons />
                ) : !profile?.positions.length ? (
                    <Empty text="Sin posiciones abiertas" />
                ) : (
                    profile.positions.map((p) => (
                        <PositionRow key={p.symbol} p={p} formatCurrency={formatCurrency} onClick={() => onTokenClick?.(p.symbol)} />
                    ))
                )}
            </Section>

            {/* Recent trades */}
            <Section title="Operaciones recientes" count={closedFills.length}>
                {loading ? (
                    <Skeletons />
                ) : !closedFills.length ? (
                    <Empty text="Sin operaciones recientes" />
                ) : (
                    closedFills.slice(0, 40).map((f, i) => (
                        <FillRow key={`${f.tid ?? f.oid ?? i}-${i}`} f={f} formatCurrency={formatCurrency} onClick={() => onTokenClick?.(`${tickerOf(f.coin)}-USD`)} />
                    ))
                )}
            </Section>

            <div style={{ height: 24 }} />
        </ScreenV2>
    );
}

// ── Bits ────────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div style={{ flex: 1, padding: '14px 16px', borderRadius: 16, background: V2.card, border: `1px solid ${V2.hair}` }}>
            <div style={{ fontSize: 12, color: V2.t3, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 19, fontWeight: 800, fontFamily: V2.mono, marginTop: 5, color: color || V2.t1, letterSpacing: '-0.02em' }}>
                {value}
            </div>
        </div>
    );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
    return (
        <div style={{ padding: '26px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
                {count != null && count > 0 && (
                    <span style={{ fontSize: 12.5, color: V2.t3, fontFamily: V2.mono }}>{count}</span>
                )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
        </div>
    );
}

function PositionRow({ p, formatCurrency, onClick }: { p: Position; formatCurrency: (v: number, dp?: number) => string; onClick: () => void }) {
    const long = p.side === 'long';
    const up = p.unrealizedPnl >= 0;
    return (
        <button onClick={onClick} style={rowBtn}>
            <MarketLogo sym={p.symbol} size={36} />
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700 }}>{p.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 5, letterSpacing: '0.03em', background: long ? V2.posSoft : V2.negSoft, color: long ? V2.pos : V2.neg }}>
                        {long ? 'LONG' : 'SHORT'} {p.leverage}x
                    </span>
                </div>
                <div style={{ fontSize: 12, color: V2.t3, fontFamily: V2.mono, marginTop: 3 }}>
                    {p.size.toLocaleString('en-US', { maximumFractionDigits: 4 })} · {formatCurrency(p.entryPrice)}
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, fontFamily: V2.mono, color: up ? V2.pos : V2.neg }}>
                    {up ? '+' : '-'}{formatCurrency(Math.abs(p.unrealizedPnl))}
                </div>
                <div style={{ fontSize: 11.5, fontFamily: V2.mono, color: up ? V2.pos : V2.neg, marginTop: 2 }}>
                    {up ? '+' : ''}{p.unrealizedPnlPercent.toFixed(1)}%
                </div>
            </div>
        </button>
    );
}

function FillRow({ f, formatCurrency, onClick }: { f: Fill; formatCurrency: (v: number, dp?: number) => string; onClick: () => void }) {
    const pnl = parseFloat(f.closedPnl || '0');
    const hasPnl = Math.abs(pnl) > 0.0001;
    const up = pnl >= 0;
    const dir = f.dir || (f.side === 'B' || f.side?.toLowerCase() === 'buy' ? 'Compra' : 'Venta');
    return (
        <button onClick={onClick} style={rowBtn}>
            <MarketLogo sym={`${tickerOf(f.coin)}-USD`} size={32} />
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{tickerOf(f.coin)}</div>
                <div style={{ fontSize: 12, color: V2.t3, marginTop: 2 }}>
                    {dir} · {timeAgo(f.time)}
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13.5, fontFamily: V2.mono, color: V2.t1 }}>
                    {parseFloat(f.sz).toLocaleString('en-US', { maximumFractionDigits: 4 })}
                </div>
                {hasPnl && (
                    <div style={{ fontSize: 12, fontFamily: V2.mono, color: up ? V2.pos : V2.neg, marginTop: 2 }}>
                        {up ? '+' : '-'}{formatCurrency(Math.abs(pnl))}
                    </div>
                )}
            </div>
        </button>
    );
}

function Avatar({ seed, url, size }: { seed: string; url?: string | null; size: number }) {
    if (url) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={url} alt="" width={size} height={size} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
    }
    // Deterministic gradient from the seed.
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    const letter = (seed.replace(/^@/, '')[0] || '?').toUpperCase();
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.4, color: '#fff', background: `linear-gradient(135deg, hsl(${hue},65%,45%), hsl(${(hue + 40) % 360},65%,35%))` }}>
            {letter}
        </div>
    );
}

function Skeletons() {
    return (
        <>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ height: 60, borderRadius: 14, background: V2.card, border: `1px solid ${V2.hair}` }} />
            ))}
        </>
    );
}

function Empty({ text }: { text: string }) {
    return <div style={{ padding: '24px 0', textAlign: 'center', color: V2.t3, fontSize: 13 }}>{text}</div>;
}

const circleBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

const rowBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
    padding: '12px 14px', borderRadius: 14, background: V2.card, border: `1px solid ${V2.hair}`,
    cursor: 'pointer', fontFamily: V2.ui,
};

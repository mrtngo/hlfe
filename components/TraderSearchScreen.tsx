'use client';

// Look up another trader by @username (Supabase users) or by raw 0x address.
// Selecting a result opens their public profile.

import { useEffect, useState } from 'react';
import { db, type User } from '@/lib/supabase/client';
import { ScreenV2, Icon, V2 } from '@/components/V2Kit';

interface TraderSearchScreenProps {
    onBack: () => void;
    onSelect: (address: string) => void;
}

const isAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s.trim());

function shortAddr(a: string) {
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function TraderSearchScreen({ onBack, onSelect }: TraderSearchScreenProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    const trimmed = query.trim();
    const addressMatch = isAddress(trimmed);

    // Debounced username search.
    useEffect(() => {
        if (!trimmed || addressMatch || trimmed.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const id = setTimeout(async () => {
            const users = await db.users.search(trimmed.replace(/^@/, ''));
            setResults(users);
            setLoading(false);
        }, 300);
        return () => clearTimeout(id);
    }, [trimmed, addressMatch]);

    return (
        <ScreenV2 pad={0} glow={false}>
            <div style={{ padding: '54px 18px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={onBack} style={circleBtn} aria-label="Volver">
                    <Icon name="chevronLeft" size={18} color={V2.t1} />
                </button>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Buscar trader</div>
            </div>

            {/* Search input */}
            <div style={{ padding: '18px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 14, background: V2.card, border: `1px solid ${V2.hair}` }}>
                    <Icon name="search" size={18} color={V2.t3} />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="@usuario o 0x…"
                        spellCheck={false}
                        autoCapitalize="none"
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: V2.t1, fontSize: 15.5, fontFamily: V2.ui }}
                    />
                    {query && (
                        <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }} aria-label="Limpiar">
                            <Icon name="plus" size={16} color={V2.t3} strokeWidth={2.4} />
                        </button>
                    )}
                </div>
            </div>

            {/* Results */}
            <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {addressMatch ? (
                    <ResultRow
                        title={shortAddr(trimmed)}
                        sub="Ver perfil de esta dirección"
                        seed={trimmed}
                        onClick={() => onSelect(trimmed.toLowerCase())}
                    />
                ) : loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="animate-pulse" style={{ height: 56, borderRadius: 14, background: V2.card, border: `1px solid ${V2.hair}` }} />
                    ))
                ) : results.length > 0 ? (
                    results.map((u) => (
                        <ResultRow
                            key={u.wallet_address}
                            title={u.username ? `@${u.username}` : shortAddr(u.wallet_address)}
                            sub={u.display_name || shortAddr(u.wallet_address)}
                            seed={u.username || u.wallet_address}
                            avatarUrl={u.avatar_url}
                            onClick={() => onSelect(u.wallet_address.toLowerCase())}
                        />
                    ))
                ) : trimmed.length >= 2 ? (
                    <div style={{ padding: '32px 0', textAlign: 'center', color: V2.t3, fontSize: 13.5 }}>
                        Sin resultados para “{trimmed}”.
                    </div>
                ) : (
                    <div style={{ padding: '32px 0', textAlign: 'center', color: V2.t3, fontSize: 13.5, lineHeight: 1.5 }}>
                        Buscá por nombre de usuario o pegá una dirección 0x para ver su perfil, posiciones y operaciones.
                    </div>
                )}
            </div>
        </ScreenV2>
    );
}

function ResultRow({
    title,
    sub,
    seed,
    avatarUrl,
    onClick,
}: {
    title: string;
    sub: string;
    seed: string;
    avatarUrl?: string | null;
    onClick: () => void;
}) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    const letter = (seed.replace(/^@|^0x/, '')[0] || '?').toUpperCase();
    return (
        <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 14, background: V2.card, border: `1px solid ${V2.hair}`, cursor: 'pointer', fontFamily: V2.ui }}>
            {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" width={40} height={40} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
                <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#fff', background: `linear-gradient(135deg, hsl(${hue},65%,45%), hsl(${(hue + 40) % 360},65%,35%))` }}>
                    {letter}
                </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: V2.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
                <div style={{ fontSize: 12.5, color: V2.t3, fontFamily: V2.mono, marginTop: 2 }}>{sub}</div>
            </div>
            <Icon name="chevronRight" size={16} color={V2.t3} />
        </button>
    );
}

const circleBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
};

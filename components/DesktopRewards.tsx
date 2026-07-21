'use client';

// DesktopRewards — the points/referral program as a two-column desktop layout.
// Same data as RewardsScreen (usePoints + useRewards); left column is the
// points program (balance, streak, quests), right column is referrals (link,
// stats, invited list). Rendered inside DesktopShell; mobile is untouched.

import { useState } from 'react';
import { useRewards } from '@/hooks/useRewards';
import { usePoints } from '@/hooks/usePoints';
import { useUser } from '@/hooks/useUser';
import { useCurrency } from '@/context/CurrencyContext';
import { copyToClipboard } from '@/lib/clipboard';
import { Icon, V2 } from '@/components/V2Kit';

const APP_ORIGIN = 'https://app.rayotrade.xyz';

function shortAddr(a: string) {
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function DesktopRewards() {
    const { user } = useUser();
    const { formatCurrency } = useCurrency();
    const { referralCode, referredUsers, referredCount, totalEarned, loading } = useRewards();
    const { total: totalPoints, bySource, streak, quests, loading: pointsLoading } = usePoints();
    const [copied, setCopied] = useState(false);

    const link = referralCode ? `${APP_ORIGIN}/?ref=${referralCode}` : '';
    const pointsFromReferrals = bySource.referral_signup + bySource.referral_volume;

    const handleCopy = async () => {
        if (!link) return;
        if (await copyToClipboard(link)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!user) {
        return (
            <div style={{ padding: '80px 28px', textAlign: 'center', maxWidth: 460, margin: '0 auto' }}>
                <div style={{ width: 70, height: 70, borderRadius: '50%', margin: '0 auto 18px', background: V2.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="gift" size={30} color={V2.accent} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>Iniciá sesión</div>
                <div style={{ marginTop: 8, fontSize: 14, color: V2.t3, lineHeight: 1.5 }}>
                    Creá tu cuenta para obtener tu link de invitación y empezar a ganar.
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 1fr)', gap: 20, alignItems: 'start' }}>
            {/* Left — points program */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ borderRadius: 20, padding: '26px 26px', background: 'linear-gradient(160deg, rgba(227,179,76,0.14), rgba(227,179,76,0.03))', border: '1px solid rgba(227,179,76,0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Icon name="sparkle" size={16} color={V2.accent} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: V2.accent, letterSpacing: '0.02em' }}>Tus puntos</span>
                    </div>
                    <div style={{ fontSize: 54, fontWeight: 800, fontFamily: V2.mono, letterSpacing: '-0.03em', marginTop: 6 }}>
                        {pointsLoading ? '—' : totalPoints.toLocaleString('en-US')}
                    </div>
                    <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 2 }}>
                        Se acumulan para siempre y podrían contar para futuras recompensas.
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
                        <Pill label="volumen" value={bySource.trade_volume.toLocaleString('en-US')} />
                        <Pill label="referidos" value={pointsFromReferrals.toLocaleString('en-US')} />
                        <Pill label="racha" value={bySource.streak.toLocaleString('en-US')} />
                        <Pill label="logros" value={bySource.quest.toLocaleString('en-US')} />
                    </div>
                </div>

                {/* Streak */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderRadius: 16, background: V2.card, border: `1px solid ${V2.hair}` }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: streak.checkedInToday ? V2.accentSoft : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="flame" size={22} color={streak.checkedInToday ? V2.accent : V2.t3} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>{pointsLoading ? '—' : `${streak.current} día${streak.current === 1 ? '' : 's'} de racha`}</div>
                        <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 2 }}>
                            {streak.checkedInToday ? '¡Sumaste tus puntos de hoy! Volvé mañana.' : 'Entrá cada día para no perder tu racha.'}
                        </div>
                    </div>
                    {streak.longest > 0 && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: V2.mono, color: V2.accent }}>{streak.longest}</div>
                            <div style={{ fontSize: 10.5, color: V2.t3 }}>mejor</div>
                        </div>
                    )}
                </div>

                {/* Quests */}
                <div style={{ borderRadius: 16, background: V2.card, border: `1px solid ${V2.hair}`, overflow: 'hidden' }}>
                    <div style={{ padding: '15px 18px', borderBottom: `1px solid ${V2.hair}`, fontSize: 15, fontWeight: 800 }}>Logros</div>
                    {quests.map((q, i) => (
                        <div key={q.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 18px', borderBottom: i < quests.length - 1 ? `1px solid ${V2.hair}` : 'none', opacity: q.done ? 1 : 0.72 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: q.done ? V2.accentSoft : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name={q.done ? 'check' : 'target'} size={16} color={q.done ? V2.accent : V2.t3} strokeWidth={q.done ? 2.6 : 2} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>{q.label}</div>
                                <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 1 }}>{q.description}</div>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, fontFamily: V2.mono, color: q.done ? V2.accent : V2.t3 }}>+{q.points}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right — referrals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Stat icon="user" label="Referidos" value={loading ? '—' : String(referredCount)} />
                    <Stat icon="coins" label="Ganado" value={loading ? '—' : formatCurrency(totalEarned)} color={totalEarned > 0 ? V2.pos : undefined} />
                </div>

                <div style={{ borderRadius: 16, background: V2.card, border: `1px solid ${V2.hair}`, padding: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: V2.t2, marginBottom: 10 }}>Tu link de invitación</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.25)', border: `1px solid ${V2.hair}` }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontFamily: V2.mono, color: V2.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {referralCode ? `app.rayotrade.xyz/?ref=${referralCode}` : '—'}
                        </span>
                        <button onClick={handleCopy} aria-label="Copiar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                            <Icon name="copy" size={18} color={copied ? V2.pos : V2.t2} />
                        </button>
                    </div>
                    <button onClick={handleCopy} style={{ marginTop: 12, width: '100%', padding: 14, borderRadius: 13, border: 'none', background: V2.accent, color: V2.accentInk, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: V2.ui, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Icon name="share" size={17} color={V2.accentInk} strokeWidth={2.4} />
                        {copied ? 'Link copiado' : 'Copiar mi link'}
                    </button>
                    {referralCode && (
                        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12.5, color: V2.t3 }}>
                            Tu código: <span style={{ color: V2.accent, fontWeight: 700, fontFamily: V2.mono }}>{referralCode}</span>. Te llevás el 10% de sus comisiones.
                        </div>
                    )}
                </div>

                <div style={{ borderRadius: 16, background: V2.card, border: `1px solid ${V2.hair}`, overflow: 'hidden' }}>
                    <div style={{ padding: '15px 18px', borderBottom: `1px solid ${V2.hair}`, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 800 }}>Tus invitados</span>
                        {referredCount > 0 && <span style={{ fontSize: 12.5, color: V2.t3, fontFamily: V2.mono }}>{referredCount}</span>}
                    </div>
                    {loading ? (
                        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="animate-pulse" style={{ height: 52, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }} />
                            ))}
                        </div>
                    ) : referredCount === 0 ? (
                        <div style={{ padding: '32px 18px', textAlign: 'center', color: V2.t3, fontSize: 13.5, lineHeight: 1.5 }}>
                            Todavía no invitaste a nadie.<br />Compartí tu link y empezá a ganar.
                        </div>
                    ) : (
                        referredUsers.map((u, i) => (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < referredUsers.length - 1 ? `1px solid ${V2.hair}` : 'none' }}>
                                <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: V2.accentSoft, color: V2.accent, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {(u.username || u.wallet_address)[0]?.toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700 }}>{u.username ? `@${u.username}` : shortAddr(u.wallet_address)}</div>
                                    <div style={{ fontSize: 12, color: V2.t3, fontFamily: V2.mono, marginTop: 1 }}>
                                        {u.created_at ? new Date(u.created_at).toLocaleDateString('es') : ''}
                                    </div>
                                </div>
                                <Icon name="bolt" size={14} color={V2.accent} />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function Pill({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 99, background: 'rgba(0,0,0,0.25)', border: `1px solid ${V2.hair}` }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: V2.accent, fontFamily: V2.mono }}>{value}</span>
            <span style={{ fontSize: 12, color: V2.t2 }}>{label}</span>
        </div>
    );
}

function Stat({ icon, label, value, color }: { icon: 'user' | 'coins'; label: string; value: string; color?: string }) {
    return (
        <div style={{ flex: 1, padding: '16px 18px', borderRadius: 16, background: V2.card, border: `1px solid ${V2.hair}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name={icon} size={15} color={V2.t3} />
                <span style={{ fontSize: 12.5, color: V2.t3, fontWeight: 600 }}>{label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: V2.mono, marginTop: 6, color: color || V2.t1, letterSpacing: '-0.02em' }}>{value}</div>
        </div>
    );
}

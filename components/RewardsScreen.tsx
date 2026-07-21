'use client';

// Rewards / referrals screen — weekly points, referrals made, total earned,
// your referral link, and the list of people you've brought in.

import { useState } from 'react';
import { useRewards } from '@/hooks/useRewards';
import { usePoints } from '@/hooks/usePoints';
import { useUser } from '@/hooks/useUser';
import { useCurrency } from '@/context/CurrencyContext';
import { copyToClipboard } from '@/lib/clipboard';
import { haptic } from '@/lib/haptics';
import { ScreenV2, Icon, V2 } from '@/components/V2Kit';

// Referral links always point at the app host (the apex serves the landing).
const APP_ORIGIN = 'https://app.rayotrade.xyz';

function shortAddr(a: string) {
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function RewardsScreen() {
    const { user } = useUser();
    const { formatCurrency } = useCurrency();
    const {
        referralCode,
        referredUsers,
        referredCount,
        totalEarned,
        loading,
    } = useRewards();
    const {
        total: totalPoints,
        bySource,
        streak,
        quests,
        loading: pointsLoading,
    } = usePoints();

    const [copied, setCopied] = useState(false);

    const pointsFromReferrals = bySource.referral_signup + bySource.referral_volume;

    const link = referralCode ? `${APP_ORIGIN}/?ref=${referralCode}` : '';

    const handleShare = async () => {
        if (!link) return;
        haptic.light();
        const shareData = {
            title: 'Delos',
            text: 'Invertí en cripto y acciones conmigo en Delos. Usá mi link y empezá en segundos:',
            url: link,
        };
        // Native share sheet when available (iOS/Android), else copy.
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch {
                /* user cancelled or unsupported — fall through to copy */
            }
        }
        if (await copyToClipboard(link)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCopy = async () => {
        if (!link) return;
        if (await copyToClipboard(link)) {
            haptic.light();
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!user) {
        return (
            <ScreenV2 pad={0} glow={false}>
                <div style={{ padding: '90px 28px', textAlign: 'center' }}>
                    <div style={{ width: 70, height: 70, borderRadius: '50%', margin: '0 auto 18px', background: V2.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="gift" size={30} color={V2.accent} />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>Iniciá sesión</div>
                    <div style={{ marginTop: 8, fontSize: 14, color: V2.t3, lineHeight: 1.5 }}>
                        Creá tu cuenta para obtener tu link de invitación y empezar a ganar.
                    </div>
                </div>
            </ScreenV2>
        );
    }

    return (
        <ScreenV2 pad={0} glow={false}>
            {/* Header */}
            <div style={{ padding: '60px 20px 0' }}>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>Recompensas</div>
                <div style={{ marginTop: 6, fontSize: 14, color: V2.t3 }}>
                    Sumá puntos por operar, invitar y volver cada día.
                </div>
            </div>

            {/* Points hero — persisted, all-time balance */}
            <div style={{ padding: '20px 20px 0' }}>
                <div
                    style={{
                        borderRadius: 22, padding: '24px 22px',
                        background: 'linear-gradient(160deg, rgba(227,179,76,0.14), rgba(227,179,76,0.03))',
                        border: '1px solid rgba(227,179,76,0.25)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Icon name="sparkle" size={15} color={V2.accent} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: V2.accent, letterSpacing: '0.02em' }}>Tus puntos</span>
                    </div>
                    <div style={{ fontSize: 46, fontWeight: 800, fontFamily: V2.mono, letterSpacing: '-0.03em', marginTop: 6 }}>
                        {pointsLoading ? '—' : totalPoints.toLocaleString('en-US')}
                    </div>
                    <div style={{ fontSize: 12, color: V2.t3, marginTop: 2 }}>
                        Se acumulan para siempre y podrían contar para futuras recompensas.
                    </div>

                    {/* Breakdown by source */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                        <Pill label="volumen" value={`${bySource.trade_volume.toLocaleString('en-US')}`} />
                        <Pill label="referidos" value={`${pointsFromReferrals.toLocaleString('en-US')}`} />
                        <Pill label="racha" value={`${bySource.streak.toLocaleString('en-US')}`} />
                        <Pill label="logros" value={`${bySource.quest.toLocaleString('en-US')}`} />
                    </div>
                </div>
            </div>

            {/* Daily streak */}
            <div style={{ padding: '14px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 16, background: V2.card, border: `1px solid ${V2.hair}` }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: streak.checkedInToday ? V2.accentSoft : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="flame" size={22} color={streak.checkedInToday ? V2.accent : V2.t3} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>
                            {pointsLoading ? '—' : `${streak.current} día${streak.current === 1 ? '' : 's'} de racha`}
                        </div>
                        <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 2 }}>
                            {streak.checkedInToday
                                ? '¡Sumaste tus puntos de hoy! Volvé mañana.'
                                : 'Abrí la app cada día para no perder tu racha.'}
                        </div>
                    </div>
                    {streak.longest > 0 && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: V2.mono, color: V2.accent }}>{streak.longest}</div>
                            <div style={{ fontSize: 10.5, color: V2.t3 }}>mejor</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Referrals + Earned */}
            <div style={{ padding: '14px 20px 0', display: 'flex', gap: 10 }}>
                <Stat icon="user" label="Referidos" value={loading ? '—' : String(referredCount)} />
                <Stat icon="coins" label="Ganado" value={loading ? '—' : formatCurrency(totalEarned)} color={totalEarned > 0 ? V2.pos : undefined} />
            </div>

            {/* Referral link */}
            <div style={{ padding: '20px 20px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: V2.t2, marginBottom: 10 }}>Tu link de invitación</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 14, background: V2.card, border: `1px solid ${V2.hair}` }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontFamily: V2.mono, color: V2.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {referralCode ? `app.rayotrade.xyz/?ref=${referralCode}` : '—'}
                    </span>
                    <button onClick={handleCopy} aria-label="Copiar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                        <Icon name="copy" size={18} color={copied ? V2.pos : V2.t2} />
                    </button>
                </div>
                <button onClick={handleShare} style={shareBtn}>
                    <Icon name="share" size={17} color={V2.accentInk} strokeWidth={2.4} />
                    {copied ? 'Link copiado' : 'Compartir mi link'}
                </button>
                {referralCode && (
                    <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12.5, color: V2.t3 }}>
                        Tu código: <span style={{ color: V2.accent, fontWeight: 700, fontFamily: V2.mono }}>{referralCode}</span>
                    </div>
                )}
            </div>

            {/* Quests / logros */}
            <div style={{ padding: '26px 20px 0' }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Logros</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {quests.map((q) => (
                        <div key={q.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 16px', borderRadius: 14, background: V2.card, border: `1px solid ${q.done ? 'rgba(227,179,76,0.28)' : V2.hair}`, opacity: q.done ? 1 : 0.72 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: q.done ? V2.accentSoft : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name={q.done ? 'check' : 'target'} size={16} color={q.done ? V2.accent : V2.t3} strokeWidth={q.done ? 2.6 : 2} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>{q.label}</div>
                                <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 1, lineHeight: 1.4 }}>{q.description}</div>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, fontFamily: V2.mono, color: q.done ? V2.accent : V2.t3, flexShrink: 0 }}>
                                +{q.points}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* How it works */}
            <div style={{ padding: '26px 20px 0' }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Cómo funciona</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                        { n: '1', t: 'Compartí tu link', b: 'Mandáselo a tus amigos por WhatsApp, Instagram o donde quieras.' },
                        { n: '2', t: 'Se registran y operan', b: 'Entran con tu link y hacen su primera operación.' },
                        { n: '3', t: 'Ganás el 10%', b: 'Te llevás el 10% de las comisiones de todo lo que operen. Para siempre.' },
                    ].map((s) => (
                        <div key={s.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 14, background: V2.card, border: `1px solid ${V2.hair}` }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: V2.accentSoft, color: V2.accent, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: V2.mono }}>{s.n}</div>
                            <div>
                                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.t}</div>
                                <div style={{ fontSize: 13, color: V2.t3, marginTop: 2, lineHeight: 1.45 }}>{s.b}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Referred users */}
            <div style={{ padding: '26px 20px 30px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>Tus invitados</span>
                    {referredCount > 0 && <span style={{ fontSize: 12.5, color: V2.t3, fontFamily: V2.mono }}>{referredCount}</span>}
                </div>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="animate-pulse" style={{ height: 56, borderRadius: 14, background: V2.card, border: `1px solid ${V2.hair}` }} />
                        ))}
                    </div>
                ) : referredCount === 0 ? (
                    <div style={{ padding: '28px 0', textAlign: 'center', color: V2.t3, fontSize: 13.5, lineHeight: 1.5 }}>
                        Todavía no invitaste a nadie.<br />Compartí tu link y empezá a ganar.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {referredUsers.map((u) => (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: V2.card, border: `1px solid ${V2.hair}` }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: V2.accentSoft, color: V2.accent, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {(u.username || u.wallet_address)[0]?.toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                                        {u.username ? `@${u.username}` : shortAddr(u.wallet_address)}
                                    </div>
                                    <div style={{ fontSize: 12, color: V2.t3, fontFamily: V2.mono, marginTop: 1 }}>
                                        {u.created_at ? new Date(u.created_at).toLocaleDateString('es') : ''}
                                    </div>
                                </div>
                                <Icon name="bolt" size={14} color={V2.accent} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ScreenV2>
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
        <div style={{ flex: 1, padding: '16px 16px', borderRadius: 16, background: V2.card, border: `1px solid ${V2.hair}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name={icon} size={15} color={V2.t3} />
                <span style={{ fontSize: 12.5, color: V2.t3, fontWeight: 600 }}>{label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: V2.mono, marginTop: 6, color: color || V2.t1, letterSpacing: '-0.02em' }}>{value}</div>
        </div>
    );
}

const shareBtn: React.CSSProperties = {
    marginTop: 12, width: '100%', padding: 15, borderRadius: 16, border: 'none',
    background: V2.accent, color: V2.accentInk, fontWeight: 800, fontSize: 15,
    cursor: 'pointer', fontFamily: V2.ui, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};

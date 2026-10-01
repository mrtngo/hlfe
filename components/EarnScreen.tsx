'use client';

// "Ganar intereses" — supply idle USDC to HyperCore's borrow/lend reserve.
//
// Three states, by account mode (see hooks/useLending):
//   • Portfolio Margin → supply / withdraw
//   • eligible (> $10k) but not PM → explain + guarded switch (with the
//     auto-borrow warning — PM borrows against your holdings when an order
//     needs more than your balance)
//   • not eligible → live rate + requirement, nothing to tap
// Untested with real funds: first supply should be a small manual test.

import { useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { useLending, PM_MIN_ACCOUNT_VALUE } from '@/hooks/useLending';
import { haptic } from '@/lib/haptics';
import { ScreenV2, V2Header, Icon, V2 } from '@/components/V2Kit';

export default function EarnScreen({ onBack }: { onBack?: () => void }) {
    const { t } = useLanguage();
    const e = t.earn;
    const { formatCurrency } = useCurrency();
    const { account } = useHyperliquid();
    const lending = useLending();

    const [mode, setMode] = useState<'supply' | 'withdraw'>('supply');
    const [amount, setAmount] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [ack, setAck] = useState(false);

    const accountValue = (account?.equity || 0) + ((account as { spotBalance?: number })?.spotBalance || 0);
    const eligible = accountValue >= PM_MIN_ACCOUNT_VALUE;
    const apyPct = lending.supplyApy != null ? (lending.supplyApy * 100).toFixed(1).replace('.', ',') : '—';
    const yearlyOn = (v: number) => formatCurrency(v * (lending.supplyApy || 0));

    const run = async (all: boolean) => {
        const n = parseFloat(amount.replace(',', '.'));
        if (!all && !(n > 0)) return;
        haptic.medium();
        setBusy(true);
        setMsg(null);
        const r = mode === 'supply'
            ? await lending.supply(all ? null : n.toString())
            : await lending.withdraw(all ? null : n.toString());
        setBusy(false);
        if (r.ok) {
            haptic.success();
            setAmount('');
            setMsg({ ok: true, text: mode === 'supply' ? e.supplied : e.withdrawn });
        } else {
            haptic.error();
            setMsg({ ok: false, text: r.error || e.failed });
        }
    };

    const activate = async () => {
        haptic.medium();
        setBusy(true);
        setMsg(null);
        const r = await lending.activatePortfolioMargin();
        setBusy(false);
        setMsg(r.ok ? { ok: true, text: e.activated } : { ok: false, text: r.error || e.failed });
    };

    return (
        <ScreenV2 pad={28}>
            <V2Header title={e.title} onBack={onBack} />

            <div style={{ padding: '6px 20px 0' }}>
                {/* Rate */}
                <div className="v2-card" style={{ padding: '20px 18px' }}>
                    <div style={{ fontSize: 13, color: V2.t3, fontWeight: 600 }}>{e.rateLabel}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                        <span className="font-mono" style={{ fontSize: 40, fontWeight: 800, color: V2.pos, letterSpacing: '-0.03em' }}>{apyPct}%</span>
                        <span style={{ fontSize: 15, color: V2.t2, fontWeight: 600 }}>{e.perYear}</span>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, color: V2.t3, lineHeight: 1.5 }}>{e.rateHint}</div>
                    {lending.supplied > 0 && (
                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${V2.hair}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: 14, color: V2.t2, fontWeight: 600 }}>{e.yourSavings}</span>
                            <span style={{ textAlign: 'right' }}>
                                <span className="font-mono" style={{ display: 'block', fontSize: 20, fontWeight: 800 }}>{formatCurrency(lending.supplied)}</span>
                                <span className="font-mono" style={{ display: 'block', fontSize: 12, color: V2.pos, marginTop: 2 }}>≈ +{yearlyOn(lending.supplied)} {e.perYearShort}</span>
                            </span>
                        </div>
                    )}
                </div>

                {lending.loading ? null : lending.isPortfolioMargin ? (
                    /* ── Supply / withdraw ── */
                    <div className="v2-card" style={{ padding: 16, marginTop: 12 }}>
                        <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
                            {(['supply', 'withdraw'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => { haptic.light(); setMode(m); setMsg(null); }}
                                    style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: V2.ui, fontWeight: 700, fontSize: 13.5, background: mode === m ? V2.cardSolid : 'transparent', color: mode === m ? V2.t1 : V2.t3 }}
                                >
                                    {m === 'supply' ? e.tabSupply : e.tabWithdraw}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '12px 14px', borderRadius: 12, border: `1px solid ${V2.hair2}` }}>
                            <span className="font-mono" style={{ color: V2.t3, fontSize: 18 }}>$</span>
                            <input
                                inputMode="decimal"
                                value={amount}
                                onChange={(ev) => setAmount(ev.target.value.replace(/[^0-9.,]/g, ''))}
                                placeholder="0"
                                className="font-mono"
                                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: V2.t1, fontSize: 22, fontWeight: 700 }}
                            />
                            <span style={{ fontSize: 13, color: V2.t3, fontWeight: 700 }}>USDC</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button disabled={busy} onClick={() => run(true)} style={{ ...btn, flex: 1, background: 'transparent', border: `1px solid ${V2.hair2}`, color: V2.t1 }}>
                                {mode === 'supply' ? e.supplyAll : e.withdrawAll}
                            </button>
                            <button disabled={busy || !(parseFloat(amount.replace(',', '.')) > 0)} onClick={() => run(false)} style={{ ...btn, flex: 1.4, background: V2.accent, color: V2.accentInk, opacity: busy || !(parseFloat(amount.replace(',', '.')) > 0) ? 0.5 : 1 }}>
                                {busy ? e.processing : mode === 'supply' ? e.supplyCta : e.withdrawCta}
                            </button>
                        </div>
                        <div style={{ marginTop: 10, fontSize: 12, color: V2.t3, lineHeight: 1.5 }}>
                            {mode === 'supply' ? e.supplyNote : e.withdrawNote}
                        </div>
                    </div>
                ) : eligible ? (
                    /* ── Eligible: guarded switch to Portfolio Margin ── */
                    <div className="v2-card" style={{ padding: 16, marginTop: 12 }}>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{e.activateTitle}</div>
                        <div style={{ marginTop: 6, fontSize: 13, color: V2.t2, lineHeight: 1.5 }}>{e.activateBody}</div>
                        <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[e.warnAutoBorrow, e.warnMerge, e.warnRisk].map((w) => (
                                <li key={w} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: V2.t2, lineHeight: 1.45 }}>
                                    <Icon name="info" size={14} color={V2.neg} />
                                    <span>{w}</span>
                                </li>
                            ))}
                        </ul>
                        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 14, fontSize: 13, color: V2.t1, cursor: 'pointer' }}>
                            <input type="checkbox" checked={ack} onChange={(ev) => setAck(ev.target.checked)} style={{ marginTop: 2, accentColor: V2.accent }} />
                            <span>{e.ack}</span>
                        </label>
                        <button disabled={!ack || busy} onClick={activate} style={{ ...btn, width: '100%', marginTop: 14, background: V2.accent, color: V2.accentInk, opacity: !ack || busy ? 0.5 : 1 }}>
                            {busy ? e.processing : e.activateCta}
                        </button>
                    </div>
                ) : (
                    /* ── Not eligible ── */
                    <div className="v2-card" style={{ padding: 16, marginTop: 12 }}>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>{e.lockedTitle.replace('{min}', formatCurrency(PM_MIN_ACCOUNT_VALUE, 0))}</div>
                        <div style={{ marginTop: 6, fontSize: 13, color: V2.t2, lineHeight: 1.5 }}>
                            {e.lockedBody.replace('{min}', formatCurrency(PM_MIN_ACCOUNT_VALUE, 0)).replace('{value}', formatCurrency(accountValue, 0))}
                        </div>
                    </div>
                )}

                {msg && (
                    <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.45, background: msg.ok ? V2.posSoft : V2.negSoft, color: msg.ok ? V2.pos : V2.t1, border: `1px solid ${msg.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}` }}>
                        {msg.text}
                    </div>
                )}

                {/* How it works */}
                <div style={{ marginTop: 18, fontSize: 12.5, color: V2.t3, lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 700, color: V2.t2, marginBottom: 4 }}>{e.howTitle}</div>
                    {e.howBody}
                </div>
            </div>
        </ScreenV2>
    );
}

const btn: React.CSSProperties = {
    padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: V2.ui, fontWeight: 800, fontSize: 14.5,
};

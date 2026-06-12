'use client';

import { useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { copyToClipboard } from '@/lib/clipboard';
import {
    User as UserIcon,
    Wallet,
    Globe,
    DollarSign,
    Zap,
    Bell,
    Repeat,
    Target,
    Sliders,
    Lock,
    Shield,
    BookOpen,
    Users,
    Sun,
    BellRing,
    LifeBuoy,
    Twitter,
    HelpCircle,
    MessageSquareWarning,
    ChevronRight,
    LogOut,
    Copy,
    Check,
    type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { usePrivy, useMfaEnrollment } from '@privy-io/react-auth';
import { useMfaGate } from '@/hooks/useMfaGate';
import { usePreferences } from '@/hooks/usePreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUser } from '@/hooks/useUser';
import { ScreenV2, V2Header, V2 } from '@/components/V2Kit';

interface AjustesScreenProps {
    onBack?: () => void;
    /** Replay the animated onboarding tutorial. */
    onReplayTutorial?: () => void;
}

export default function AjustesScreen({ onBack, onReplayTutorial }: AjustesScreenProps) {
    const { t, language, setLanguage } = useLanguage();
    const { currency, toggleCurrency } = useCurrency();
    const { logout, user: privyUser, exportWallet } = usePrivy();
    const { user } = useUser();
    const { proMode, toggleProMode } = usePreferences();
    const pushNotifications = usePushNotifications();
    const { address } = useHyperliquid();
    const { showMfaEnrollmentModal, unenrollWithTotp } = useMfaEnrollment();
    const { requireMfa } = useMfaGate();
    const [dolarBlueOn, setDolarBlueOn] = useState(language === 'es');
    const [walletCopied, setWalletCopied] = useState(false);
    const [secErr, setSecErr] = useState<string | null>(null);

    // 2FA is opt-in: a user "has" it once they've enrolled a Privy MFA method.
    const twoFaOn = (privyUser?.mfaMethods?.length ?? 0) > 0;

    /** Enroll (opt in) or unenroll TOTP 2FA via Privy's default modals. */
    const handleToggle2fa = async () => {
        setSecErr(null);
        try {
            if (twoFaOn) await unenrollWithTotp();
            else await showMfaEnrollmentModal();
        } catch {
            // User cancelled, or MFA isn't enabled on the Privy app yet.
            setSecErr(t.screens.ajustes.security.twoFaError);
        }
    };

    /** Export the embedded wallet's private key — gated behind 2FA when on. */
    const handleExportKey = async () => {
        setSecErr(null);
        const embedded = privyUser?.wallet?.address;
        if (!embedded) return;
        try {
            await requireMfa(); // no-op unless the user opted into 2FA
        } catch {
            return; // 2FA cancelled — abort silently
        }
        try {
            await exportWallet({ address: embedded });
        } catch {
            setSecErr(t.screens.ajustes.security.exportError);
        }
    };

    const copyWallet = async () => {
        if (!address) return;
        if (await copyToClipboard(address)) {
            setWalletCopied(true);
            setTimeout(() => setWalletCopied(false), 1500);
        }
    };
    const truncatedAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

    return (
        <ScreenV2 pad={0}>
            <V2Header title={t.screens.ajustes.title.replace(/\.$/, '')} onBack={onBack} />

            <div style={{ padding: '8px 20px 0' }}>
                {/* cuenta */}
                <SettingGroup label={t.screens.ajustes.section.account}>
                    <Row icon={UserIcon} label={t.screens.ajustes.account.profile} sub={user?.display_name || ''} right={<ChevronIcon />} />
                    <Row
                        icon={Wallet}
                        label={t.screens.ajustes.account.wallet}
                        sub={address ? undefined : 'No conectada'}
                        right={
                            address ? (
                                <button
                                    type="button"
                                    onClick={copyWallet}
                                    style={{ ...pillStyle, color: walletCopied ? V2.pos : V2.t3, fontFamily: V2.mono, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                >
                                    {truncatedAddr}
                                    {walletCopied ? <Check size={11} /> : <Copy size={11} />}
                                </button>
                            ) : (
                                <ChevronIcon />
                            )
                        }
                    />
                    <Row icon={Globe} label={t.screens.ajustes.account.language} right={<button type="button" onClick={() => setLanguage(language === 'es' ? 'en' : 'es')} style={pillStyle}>{language.toUpperCase()}</button>} />
                    <Row icon={DollarSign} label={t.screens.ajustes.account.currency} right={<button type="button" onClick={toggleCurrency} style={pillStyle}>{currency}</button>} last />
                </SettingGroup>

                {/* trading */}
                <SettingGroup label={t.screens.ajustes.section.trading}>
                    <Row icon={Zap} label={t.screens.ajustes.trading.proMode} sub={t.screens.ajustes.trading.proModeSub} right={<Toggle on={proMode} onToggle={toggleProMode} />} />
                    <Row icon={Bell} label={t.screens.ajustes.trading.priceAlerts} right={<CountBadge n={4} />} />
                    <Row icon={Repeat} label={t.screens.ajustes.trading.dca} right={<ChevronIcon />} />
                    <Row icon={Target} label={t.screens.ajustes.trading.sltp} right={<ChevronIcon />} />
                    <Row icon={Sliders} label={t.screens.ajustes.trading.slippage} right={<RightValue value="0.5%" />} last />
                </SettingGroup>

                {/* seguridad */}
                <SettingGroup label={t.screens.ajustes.section.security}>
                    <Row icon={Lock} label={t.screens.ajustes.security.lock} right={<Toggle on={true} onToggle={() => {}} />} />
                    <Row
                        icon={Shield}
                        label={t.screens.ajustes.security.twoFa}
                        warn={!twoFaOn}
                        onClick={handleToggle2fa}
                        right={
                            <Pill
                                label={twoFaOn ? t.screens.ajustes.security.twoFaOn : t.screens.ajustes.security.twoFaActivate}
                                tone={twoFaOn ? 'ok' : 'brand'}
                            />
                        }
                    />
                    <Row icon={BookOpen} label={t.screens.ajustes.security.backupPhrase} onClick={handleExportKey} right={<ChevronIcon />} />
                    <Row icon={Users} label={t.screens.ajustes.security.sessions} right={<CountBadge n={2} />} last />
                    {secErr && (
                        <div style={{ padding: '0 15px 12px', fontSize: 12, color: V2.neg }}>{secErr}</div>
                    )}
                </SettingGroup>

                {/* preferencias */}
                <SettingGroup label={t.screens.ajustes.section.preferences}>
                    <Row icon={Sun} label={t.screens.ajustes.preferences.theme} right={<RightValue value={t.screens.ajustes.preferences.themeAuto} />} />
                    <Row
                        icon={BellRing}
                        label={t.screens.ajustes.preferences.notifications}
                        right={
                            <Toggle
                                on={pushNotifications.subscription !== null}
                                onToggle={() => {
                                    if (pushNotifications.subscription) pushNotifications.unsubscribe();
                                    else pushNotifications.subscribe();
                                }}
                            />
                        }
                    />
                    <Row icon={DollarSign} label={t.screens.ajustes.preferences.dolarBlue} right={<Toggle on={dolarBlueOn} onToggle={() => setDolarBlueOn((v) => !v)} />} last />
                </SettingGroup>

                {/* ayuda */}
                <SettingGroup label={t.screens.ajustes.section.help}>
                    <Row icon={LifeBuoy} label={t.screens.ajustes.help.tutorial} right={<ChevronIcon />} onClick={onReplayTutorial} />
                    <Row icon={HelpCircle} label={t.screens.ajustes.help.center} right={<ChevronIcon />} />
                    <Row icon={Twitter} label={t.screens.ajustes.help.twitter} right={<ChevronIcon />} />
                    <Row icon={MessageSquareWarning} label={t.screens.ajustes.help.feedback} right={<ChevronIcon />} last />
                </SettingGroup>

                {/* Sign out */}
                <button
                    type="button"
                    onClick={() => logout()}
                    style={{ width: '100%', marginTop: 4, padding: 14, borderRadius: 14, background: V2.negSoft, border: '1px solid rgba(239,68,68,0.22)', color: V2.neg, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: V2.ui }}
                >
                    <LogOut size={15} /> {t.screens.ajustes.logout}
                </button>

                <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: V2.t3, fontFamily: V2.mono }}>
                    {t.screens.ajustes.version.replace('{version}', '1.0.0').replace('{city}', 'Bogotá')}
                </div>
            </div>
        </ScreenV2>
    );
}

const pillStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 99,
    border: 'none',
    background: 'transparent',
    color: V2.t3,
    cursor: 'pointer',
    fontFamily: V2.mono,
};

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: V2.t3, marginBottom: 10, letterSpacing: '0.02em' }}>{label}</div>
            <div className="v2-card" style={{ overflow: 'hidden' }}>{children}</div>
        </div>
    );
}

function Row({
    icon: Icon,
    label,
    sub,
    right,
    last,
    warn,
    onClick,
}: {
    icon: LucideIcon;
    label: string;
    sub?: string;
    right?: React.ReactNode;
    last?: boolean;
    warn?: boolean;
    onClick?: () => void;
}) {
    return (
        <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 15px', borderBottom: last ? 'none' : `1px solid ${V2.hair}`, cursor: 'pointer' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: warn ? V2.negSoft : V2.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={17} color={warn ? V2.neg : V2.accent} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{label}</span>
                    {warn && <span style={{ width: 6, height: 6, borderRadius: '50%', background: V2.neg }} />}
                </div>
                {sub && <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 1 }}>{sub}</div>}
            </div>
            {right}
        </div>
    );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={on}
            style={{ width: 38, height: 23, borderRadius: 99, border: 'none', background: on ? V2.accent : 'rgba(255,255,255,0.14)', position: 'relative', cursor: 'pointer', transition: 'background 180ms', padding: 0, flexShrink: 0 }}
        >
            <span style={{ position: 'absolute', top: 2.5, left: on ? 17 : 2.5, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.4)', transition: 'left 180ms cubic-bezier(0.4, 0, 0.2, 1)' }} />
        </button>
    );
}

function ChevronIcon() {
    return <ChevronRight size={16} color={V2.t3} />;
}

function RightValue({ value }: { value: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: V2.t3, fontWeight: 700, fontFamily: V2.mono }}>
            <span>{value}</span>
            <ChevronRight size={16} color={V2.t3} />
        </div>
    );
}

function CountBadge({ n }: { n: number }) {
    return (
        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 99, background: V2.accentSoft, color: V2.accent, fontFamily: V2.mono }}>{n}</span>
    );
}

function Pill({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'brand' }) {
    const palette = {
        ok: [V2.posSoft, V2.pos],
        warn: [V2.negSoft, V2.neg],
        brand: [V2.accentSoft, V2.accent],
    }[tone];
    return (
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: palette[0], color: palette[1], fontFamily: V2.mono }}>{label}</span>
    );
}

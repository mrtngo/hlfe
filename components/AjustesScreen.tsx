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
import { usePrivy } from '@privy-io/react-auth';
import { usePreferences } from '@/hooks/usePreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUser } from '@/hooks/useUser';
import ScreenHeader from '@/components/ScreenHeader';
import HairlineSection from '@/components/HairlineSection';

interface AjustesScreenProps {
    onBack?: () => void;
}

export default function AjustesScreen({ onBack }: AjustesScreenProps) {
    const { t, language, setLanguage } = useLanguage();
    const { currency, toggleCurrency } = useCurrency();
    const { logout } = usePrivy();
    const { user } = useUser();
    const { proMode, toggleProMode } = usePreferences();
    const pushNotifications = usePushNotifications();
    const { address } = useHyperliquid();
    const [dolarBlueOn, setDolarBlueOn] = useState(language === 'es');
    const [walletCopied, setWalletCopied] = useState(false);

    const copyWallet = async () => {
        if (!address) return;
        const ok = await copyToClipboard(address);
        if (ok) {
            setWalletCopied(true);
            setTimeout(() => setWalletCopied(false), 1500);
        }
    };
    const truncatedAddr = address
        ? `${address.slice(0, 6)}…${address.slice(-4)}`
        : '';

    return (
        <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
            <ScreenHeader title={t.screens.ajustes.title} onBack={onBack} large italic />

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
                                style={{
                                    ...pillStyle,
                                    color: walletCopied
                                        ? 'var(--color-positive)'
                                        : 'var(--color-text-secondary)',
                                    background: walletCopied
                                        ? 'rgba(34,197,94,0.12)'
                                        : 'rgba(255,255,255,0.02)',
                                    fontFamily: 'var(--font-jetbrains)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                {truncatedAddr}
                                {walletCopied ? <Check size={11} /> : <Copy size={11} />}
                            </button>
                        ) : (
                            <ChevronIcon />
                        )
                    }
                />
                <Row
                    icon={Globe}
                    label={t.screens.ajustes.account.language}
                    right={
                        <button
                            type="button"
                            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
                            style={pillStyle}
                        >
                            {language.toUpperCase()}
                        </button>
                    }
                />
                <Row
                    icon={DollarSign}
                    label={t.screens.ajustes.account.currency}
                    right={
                        <button type="button" onClick={toggleCurrency} style={pillStyle}>
                            {currency}
                        </button>
                    }
                    last
                />
            </SettingGroup>

            {/* trading */}
            <SettingGroup label={t.screens.ajustes.section.trading}>
                <Row
                    icon={Zap}
                    label={t.screens.ajustes.trading.proMode}
                    sub={t.screens.ajustes.trading.proModeSub}
                    right={<Toggle on={proMode} onToggle={toggleProMode} />}
                />
                <Row
                    icon={Bell}
                    label={t.screens.ajustes.trading.priceAlerts}
                    right={<CountBadge n={4} />}
                />
                <Row icon={Repeat} label={t.screens.ajustes.trading.dca} right={<ChevronIcon />} />
                <Row icon={Target} label={t.screens.ajustes.trading.sltp} right={<ChevronIcon />} />
                <Row
                    icon={Sliders}
                    label={t.screens.ajustes.trading.slippage}
                    right={<RightValue value="0.5%" />}
                    last
                />
            </SettingGroup>

            {/* seguridad */}
            <SettingGroup label={t.screens.ajustes.section.security}>
                <Row
                    icon={Lock}
                    label={t.screens.ajustes.security.lock}
                    right={<Toggle on={true} onToggle={() => {}} />}
                />
                <Row
                    icon={Shield}
                    label={t.screens.ajustes.security.twoFa}
                    right={<WarningChip label={t.screens.ajustes.security.twoFaWarn} />}
                />
                <Row icon={BookOpen} label={t.screens.ajustes.security.backupPhrase} right={<ChevronIcon />} />
                <Row
                    icon={Users}
                    label={t.screens.ajustes.security.sessions}
                    right={<CountBadge n={2} />}
                    last
                />
            </SettingGroup>

            {/* preferencias */}
            <SettingGroup label={t.screens.ajustes.section.preferences}>
                <Row
                    icon={Sun}
                    label={t.screens.ajustes.preferences.theme}
                    right={<RightValue value={t.screens.ajustes.preferences.themeAuto} />}
                />
                <Row
                    icon={BellRing}
                    label={t.screens.ajustes.preferences.notifications}
                    right={
                        <Toggle
                            on={pushNotifications.subscription !== null}
                            onToggle={() => {
                                if (pushNotifications.subscription) {
                                    pushNotifications.unsubscribe();
                                } else {
                                    pushNotifications.subscribe();
                                }
                            }}
                        />
                    }
                />
                <Row
                    icon={DollarSign}
                    label={t.screens.ajustes.preferences.dolarBlue}
                    right={<Toggle on={dolarBlueOn} onToggle={() => setDolarBlueOn((v) => !v)} />}
                    last
                />
            </SettingGroup>

            {/* ayuda */}
            <SettingGroup label={t.screens.ajustes.section.help}>
                <Row icon={LifeBuoy} label={t.screens.ajustes.help.tutorial} right={<ChevronIcon />} />
                <Row icon={HelpCircle} label={t.screens.ajustes.help.center} right={<ChevronIcon />} />
                <Row icon={Twitter} label={t.screens.ajustes.help.twitter} right={<ChevronIcon />} />
                <Row
                    icon={MessageSquareWarning}
                    label={t.screens.ajustes.help.feedback}
                    right={<ChevronIcon />}
                    last
                />
            </SettingGroup>

            {/* Sign out */}
            <div style={{ padding: '24px 6px 0' }}>
                <button
                    type="button"
                    onClick={() => logout()}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: 14,
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.22)',
                        color: 'var(--color-negative)',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        fontFamily: 'inherit',
                    }}
                >
                    <LogOut size={14} />
                    {t.screens.ajustes.logout}
                </button>
            </div>

            <div style={{ padding: '24px 6px 0', textAlign: 'center' }}>
                <div
                    className="font-display"
                    style={{
                        fontStyle: 'italic',
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                        fontVariationSettings: '"opsz" 24, "SOFT" 100',
                    }}
                >
                    {t.screens.ajustes.version
                        .replace('{version}', '1.0.0')
                        .replace('{city}', 'Buenos Aires')}
                </div>
            </div>
        </div>
    );
}

const pillStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    padding: '4px 10px',
    borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.02)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
};

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ padding: '24px 6px 0' }}>
            <HairlineSection label={label} />
            <div
                style={{
                    marginTop: 12,
                    borderRadius: 18,
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.025)',
                    overflow: 'hidden',
                }}
            >
                {children}
            </div>
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
}: {
    icon: LucideIcon;
    label: string;
    sub?: string;
    right?: React.ReactNode;
    last?: boolean;
    warn?: boolean;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 14px',
                borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
            }}
        >
            <div
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: warn
                        ? 'rgba(239,68,68,0.12)'
                        : 'rgba(250,204,21,0.12)',
                    border: '1px solid ' + (warn ? 'rgba(239,68,68,0.25)' : 'rgba(250,204,21,0.22)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <Icon
                    size={16}
                    color={warn ? 'var(--color-negative)' : 'var(--color-brand-primary)'}
                    strokeWidth={2}
                />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{label}</div>
                {sub && (
                    <div
                        style={{
                            fontSize: 11,
                            color: 'var(--color-text-tertiary)',
                            marginTop: 2,
                        }}
                    >
                        {sub}
                    </div>
                )}
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
            style={{
                width: 38,
                height: 22,
                borderRadius: 99,
                border: 'none',
                background: on ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.1)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 180ms',
                padding: 0,
            }}
        >
            <span
                style={{
                    position: 'absolute',
                    top: 2,
                    left: on ? 18 : 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: on ? '#1A1304' : '#71717A',
                    transition: 'left 180ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            />
        </button>
    );
}

function ChevronIcon() {
    return <ChevronRight size={14} color="var(--color-text-tertiary)" />;
}

function RightValue({ value }: { value: string }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                fontWeight: 600,
            }}
        >
            <span>{value}</span>
            <ChevronRight size={14} color="var(--color-text-tertiary)" />
        </div>
    );
}

function CountBadge({ n }: { n: number }) {
    return (
        <span
            style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 99,
                background: 'rgba(250,204,21,0.14)',
                color: 'var(--color-brand-primary)',
            }}
        >
            {n}
        </span>
    );
}

function WarningChip({ label }: { label: string }) {
    return (
        <span
            style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 99,
                background: 'rgba(239,68,68,0.14)',
                color: 'var(--color-negative)',
                letterSpacing: '0.08em',
            }}
        >
            ● {label}
        </span>
    );
}

'use client';

import { useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/hooks/useUser';
import { useLanguage } from '@/hooks/useLanguage';
import { ScreenV2, Icon, V2 } from '@/components/V2Kit';

/**
 * Mandatory username gate shown after authentication when the account has no
 * username yet. Blocks the app until a valid, available username is chosen.
 */
export default function ChooseUsernameScreen() {
    const { t } = useLanguage();
    const { updateUsername } = useUser();
    const { logout } = usePrivy();
    const [value, setValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [serverError, setServerError] = useState('');
    const c = t.screens.chooseUsername;

    // Normalize as the user types: lowercase, drop disallowed chars.
    const onChange = (raw: string) => {
        setServerError('');
        setValue(raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20));
    };

    // Local format validation (mirrors updateUsername rules) for live hints.
    const formatError = useMemo(() => {
        if (value.length === 0) return '';
        if (value.length < 3) return c.tooShort;
        if (value.length > 20) return c.tooLong;
        if (!/^[a-z0-9_]+$/.test(value)) return c.invalid;
        return '';
    }, [value, c]);

    const canSubmit = value.length >= 3 && !formatError && !saving;
    const error = serverError || formatError;

    const submit = async () => {
        if (!canSubmit) return;
        setSaving(true);
        setServerError('');
        const res = await updateUsername(value);
        setSaving(false);
        // On success the user record gains a username → the gate unmounts.
        if (!res.success) setServerError(c.taken);
    };

    return (
        <ScreenV2 pad={20}>
            <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 480, margin: '0 auto', width: '100%', padding: '0 20px', boxSizing: 'border-box' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: V2.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <Icon name="user" size={28} color={V2.accent} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: V2.t1 }}>{c.title}</div>
                <div style={{ fontSize: 15, color: V2.t2, marginTop: 8, lineHeight: 1.45 }}>{c.subtitle}</div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 24,
                        padding: '14px 16px',
                        borderRadius: 14,
                        background: 'rgba(0,0,0,0.35)',
                        border: `1px solid ${error ? V2.neg : V2.hair}`,
                    }}
                >
                    <span style={{ fontSize: 20, fontWeight: 700, color: V2.t3, fontFamily: V2.ui }}>@</span>
                    <input
                        autoFocus
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                        placeholder={c.placeholder}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: V2.t1, fontSize: 20, fontWeight: 700, fontFamily: V2.ui }}
                    />
                </div>
                <div style={{ fontSize: 12.5, color: error ? V2.neg : V2.t3, marginTop: 8, fontFamily: V2.mono, minHeight: 16 }}>
                    {error || c.hint}
                </div>

                <button
                    onClick={submit}
                    disabled={!canSubmit}
                    style={{
                        marginTop: 20,
                        width: '100%',
                        padding: 16,
                        borderRadius: 14,
                        border: 'none',
                        background: V2.accent,
                        color: V2.accentInk,
                        fontWeight: 800,
                        fontSize: 16,
                        fontFamily: V2.ui,
                        cursor: canSubmit ? 'pointer' : 'default',
                        opacity: canSubmit ? 1 : 0.5,
                    }}
                >
                    {saving ? c.saving : c.continue}
                </button>

                <button
                    onClick={() => logout()}
                    style={{ marginTop: 16, alignSelf: 'center', background: 'transparent', border: 'none', color: V2.t3, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: V2.ui }}
                >
                    {c.logout}
                </button>
            </div>
        </ScreenV2>
    );
}

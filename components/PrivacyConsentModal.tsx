'use client';

/**
 * PrivacyConsentModal — Ley 1581 authorization gate.
 *
 * Shown once after login when the user has not yet accepted the current
 * privacy-policy version (see lib/compliance/consent.ts). Blocks the app until
 * the user grants authorization, capturing a versioned, timestamped record
 * (incl. express international-transfer consent) in `data_consents`.
 *
 * Beginner-first tone to match the rest of Delos, but the legal substance
 * (qué datos, con quién se comparten, transferencia internacional, derechos)
 * is explicit as the law requires.
 *
 * V2 bottom sheet with inline styles (the old Tailwind version rendered
 * unstyled in production and sat under the bottom nav).
 */

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { PRIVACY_POLICY_URL } from '@/lib/compliance/consent';
import { Icon, V2 } from '@/components/V2Kit';

interface PrivacyConsentModalProps {
    open: boolean;
    onAccept: () => Promise<void> | void;
}

export default function PrivacyConsentModal({ open, onAccept }: PrivacyConsentModalProps) {
    const { language } = useLanguage();
    const [submitting, setSubmitting] = useState(false);
    const es = language === 'es';

    if (!open) return null;

    const handleAccept = async () => {
        setSubmitting(true);
        try {
            await onAccept();
        } finally {
            setSubmitting(false);
        }
    };

    const points = es
        ? [
              'Usamos tu correo, tu cuenta y tu actividad solo para que la app funcione. Nunca para publicidad de terceros.',
              'Algunos proveedores que usamos (inicio de sesión, base de datos, notificaciones) están fuera de Colombia.',
              'Puedes ver, corregir o borrar tus datos cuando quieras desde tu perfil.',
          ]
        : [
              'We use your email, account and activity only to run the app. Never for third-party advertising.',
              'Some providers we use (sign-in, database, notifications) are located outside Colombia.',
              'You can see, correct or delete your data anytime from your profile.',
          ];

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-consent-title"
            style={{
                position: 'fixed',
                inset: 0,
                // Above the floating bottom nav (z 9999).
                zIndex: 10000,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.62)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 480,
                    background: V2.cardSolid,
                    border: `1px solid ${V2.hair}`,
                    borderBottom: 'none',
                    borderTopLeftRadius: 26,
                    borderTopRightRadius: 26,
                    padding: '14px 22px calc(22px + env(safe-area-inset-bottom))',
                    boxShadow: '0 -24px 60px -20px rgba(0,0,0,0.8)',
                    fontFamily: V2.ui,
                    color: V2.t1,
                    maxHeight: '92vh',
                    overflowY: 'auto',
                }}
            >
                <div style={{ width: 42, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.16)', margin: '0 auto 20px' }} />

                <div style={{ width: 52, height: 52, borderRadius: 16, background: V2.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck style={{ width: 26, height: 26, color: V2.accent }} />
                </div>

                <div id="privacy-consent-title" style={{ marginTop: 16, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>
                    {es ? 'Tu privacidad' : 'Your privacy'}
                </div>
                <div style={{ marginTop: 6, fontSize: 15, color: V2.t2, lineHeight: 1.5 }}>
                    {es ? 'Antes de empezar, esto es lo que hacemos con tus datos:' : 'Before you start, here is what we do with your data:'}
                </div>

                <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {points.map((p) => (
                        <div key={p} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: V2.posSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                <Icon name="check" size={13} color={V2.pos} strokeWidth={2.6} />
                            </span>
                            <span style={{ fontSize: 14, color: V2.t2, lineHeight: 1.5 }}>{p}</span>
                        </div>
                    ))}
                </div>

                <a
                    href={PRIVACY_POLICY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, padding: '13px 14px', borderRadius: 14, border: `1px solid ${V2.hair}`, color: V2.t1, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
                >
                    {es ? 'Leer la Política de Tratamiento de Datos' : 'Read the Privacy Policy'}
                    <Icon name="chevronRight" size={16} color={V2.t3} />
                </a>

                <button
                    onClick={handleAccept}
                    disabled={submitting}
                    style={{ width: '100%', marginTop: 16, padding: 17, borderRadius: 16, border: 'none', background: V2.accent, color: V2.accentInk, fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: V2.ui, opacity: submitting ? 0.6 : 1 }}
                >
                    {submitting ? (es ? 'Guardando…' : 'Saving…') : es ? 'Autorizo y continúo' : 'I authorize and continue'}
                </button>

                <div style={{ marginTop: 12, fontSize: 11.5, color: V2.t3, textAlign: 'center', lineHeight: 1.5 }}>
                    {es
                        ? 'Al continuar autorizas de forma expresa el tratamiento y la transferencia internacional de tus datos conforme a la Ley 1581 de 2012.'
                        : 'By continuing you expressly authorize the processing and international transfer of your data under Colombian Law 1581 of 2012.'}
                </div>
            </div>
        </div>
    );
}

'use client';

/**
 * PrivacyConsentModal — Ley 1581 authorization gate.
 *
 * Shown once after login when the user has not yet accepted the current
 * privacy-policy version (see lib/compliance/consent.ts). Blocks the app until
 * the user grants authorization, capturing a versioned, timestamped record
 * (incl. express international-transfer consent) in `data_consents`.
 *
 * Beginner-first tone to match the rest of Rayo, but the legal substance
 * (qué datos, con quién se comparten, transferencia internacional, derechos)
 * is explicit as the law requires.
 */

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { PRIVACY_POLICY_URL } from '@/lib/compliance/consent';

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

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full sm:max-w-md bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] rounded-t-3xl sm:rounded-3xl p-6 sm:p-8">
                <div className="w-12 h-12 rounded-full bg-[var(--color-brand-primary-muted)] flex items-center justify-center mb-5">
                    <ShieldCheck className="w-6 h-6 text-brand" />
                </div>

                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
                    {es ? 'Tu privacidad' : 'Your privacy'}
                </h2>

                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
                    {es
                        ? 'Para usar Rayo necesitamos tratar algunos datos tuyos: tu correo, tu cuenta y tu actividad de trading. Los usamos solo para que la app funcione — nunca para publicidad de terceros.'
                        : 'To use Rayo we process some of your data: your email, your account and your trading activity. We use it only to run the app — never for third-party advertising.'}
                </p>

                <ul className="text-xs text-[var(--color-text-tertiary)] leading-relaxed mb-4 space-y-1.5">
                    <li>
                        {es
                            ? '• Algunos proveedores que usamos (autenticación, base de datos, notificaciones) están fuera de Colombia.'
                            : '• Some providers we use (auth, database, notifications) are located outside Colombia.'}
                    </li>
                    <li>
                        {es
                            ? '• Puedes acceder, corregir o eliminar tus datos cuando quieras desde tu perfil.'
                            : '• You can access, correct or delete your data anytime from your profile.'}
                    </li>
                </ul>

                <a
                    href={PRIVACY_POLICY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand underline underline-offset-2 inline-block mb-6"
                >
                    {es ? 'Leer la Política de Tratamiento de Datos' : 'Read the Privacy Policy'}
                </a>

                <button
                    onClick={handleAccept}
                    disabled={submitting}
                    className="w-full py-4 rounded-full bg-[var(--color-brand-primary)] text-[var(--color-text-on-brand)] font-bold text-sm active:scale-95 transition-all disabled:opacity-60"
                >
                    {submitting
                        ? (es ? 'Guardando…' : 'Saving…')
                        : (es ? 'Autorizo y continúo' : 'I authorize and continue')}
                </button>

                <p className="text-[10px] text-[var(--color-text-tertiary)] text-center mt-3 leading-relaxed">
                    {es
                        ? 'Al continuar autorizas de forma expresa el tratamiento y la transferencia internacional de tus datos conforme a la Ley 1581 de 2012.'
                        : 'By continuing you expressly authorize the processing and international transfer of your data under Colombian Law 1581 of 2012.'}
                </p>
            </div>
        </div>
    );
}

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Soporte · Rayo',
    description: '¿Necesitas ayuda con Rayo? Contáctanos y revisa las preguntas frecuentes.',
};

const page: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-inter)',
    padding: '0 var(--space-4)',
};
const wrap: React.CSSProperties = { maxWidth: 720, margin: '0 auto', padding: 'var(--space-8) 0 96px' };
const brand: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-2xl)',
    color: 'var(--color-brand-primary)',
    textDecoration: 'none',
};
const h1: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: '2rem', margin: '24px 0 8px' };
const lead: React.CSSProperties = { color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 28 };
const h2: React.CSSProperties = { fontSize: 'var(--text-lg)', marginTop: 32, marginBottom: 8 };
const q: React.CSSProperties = { fontWeight: 600, margin: '20px 0 4px' };
const p: React.CSSProperties = { color: 'var(--color-text-secondary)', lineHeight: 1.7, margin: '0 0 12px' };
const a: React.CSSProperties = { color: 'var(--color-brand-primary)', textDecoration: 'none' };
const card: React.CSSProperties = {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    marginBottom: 24,
};

export default function SoportePage() {
    return (
        <main style={page}>
            <div style={wrap}>
                <Link href="/" style={brand}>Rayo</Link>

                <h1 style={h1}>Soporte</h1>
                <p style={lead}>¿Necesitas ayuda con Rayo? Estamos para ayudarte.</p>

                <div style={card}>
                    <h2 style={{ ...h2, marginTop: 0 }}>Contáctanos</h2>
                    <p style={p}>
                        Escríbenos a{' '}
                        <a href="mailto:support@rayotrade.xyz" style={a}>support@rayotrade.xyz</a>{' '}
                        y te responderemos lo antes posible (normalmente dentro de 24–48 horas hábiles).
                    </p>
                </div>

                <h2 style={h2}>Preguntas frecuentes</h2>

                <p style={q}>¿Qué es Rayo?</p>
                <p style={p}>
                    Rayo es una app para comprar criptomonedas y operar mercados (cripto, acciones, índices y más)
                    de forma simple, en español y desde tu teléfono.
                </p>

                <p style={q}>¿Rayo guarda mi dinero?</p>
                <p style={p}>
                    No. Rayo es no-custodial: tú mantienes el control de tu wallet y tus fondos en todo momento.
                </p>

                <p style={q}>¿Cómo empiezo?</p>
                <p style={p}>
                    Inicia sesión con tu correo o tu wallet, agrega fondos y empieza a comprar.
                </p>

                <p style={q}>¿Cuáles son los riesgos?</p>
                <p style={p}>
                    Operar con criptomonedas y productos apalancados implica riesgo y puedes perder tu dinero.
                    Opera con responsabilidad. Rayo no ofrece asesoría financiera.
                </p>

                <p style={q}>¿Cómo elimino mi cuenta o mis datos?</p>
                <p style={p}>
                    Escríbenos a{' '}
                    <a href="mailto:support@rayotrade.xyz" style={a}>support@rayotrade.xyz</a>{' '}
                    y procesaremos tu solicitud.
                </p>

                <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', marginTop: 40 }}>
                    <Link href="/privacidad" style={a}>Política de Privacidad</Link>
                    {' · '}
                    <Link href="/legal/terminos" style={a}>Términos y Riesgos</Link>
                </p>
            </div>
        </main>
    );
}

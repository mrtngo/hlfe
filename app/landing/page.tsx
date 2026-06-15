import type { Metadata } from 'next';

// Marketing landing served at the apex domain (rayotrade.xyz) via proxy.
// The app itself lives on app.rayotrade.xyz. Pure server component — no client
// providers needed; the only action is a link to the app.

export const metadata: Metadata = {
    title: 'Rayo — Invertí en cripto y acciones, simple y en segundos',
    description:
        'Rayo es la forma más simple de invertir en cripto y acciones desde LATAM. Comprá al alza o a la baja, depositá USDC desde cualquier red y operá en segundos. Tu plata, on-chain.',
    openGraph: {
        title: 'Rayo — Invertí en cripto y acciones',
        description:
            'La forma más simple de invertir en cripto y acciones desde LATAM. Sin claves raras, en segundos.',
        type: 'website',
        locale: 'es_LATAM',
    },
};

const APP_URL = 'https://app.rayotrade.xyz';

const ACCENT = '#FACC15';
const BG = '#0A0C0E';
const UI = 'var(--font-ui, -apple-system, system-ui, sans-serif)';
const MONO = 'var(--font-mono, ui-monospace, monospace)';

const FEATURES = [
    {
        title: 'Compra simple',
        body: 'Comprá BTC, ETH o acciones con un multiplicador. Deslizá para confirmar y listo — sin formularios eternos.',
    },
    {
        title: 'Depositá desde cualquier red',
        body: 'USDC desde Arbitrum, Base, Solana, Ethereum y más. Copiás tu dirección, enviás y se acredita solo.',
    },
    {
        title: 'Apalancamiento con control',
        body: 'Operá hasta el máximo de cada activo con el precio de liquidación siempre visible en el gráfico.',
    },
    {
        title: 'Acciones tokenizadas',
        body: 'NVDA, TSLA, SP500, oro y más — al alza o a la baja, sin horarios de bolsa.',
    },
    {
        title: 'Noticias del mercado',
        body: 'Lo que mueve los precios, en español, con un toque para operar el activo del que se habla.',
    },
    {
        title: 'Tu plata es tuya',
        body: 'Tu propia billetera on-chain. Sin custodios, sin bloqueos, retirás cuando quieras.',
    },
];

const STEPS = [
    { n: '01', title: 'Creá tu cuenta', body: 'Con tu email. Sin claves raras ni papeleo.' },
    { n: '02', title: 'Depositá USDC', body: 'Desde cualquier red. Se acredita en menos de un minuto.' },
    { n: '03', title: 'Empezá a operar', body: 'Al alza o a la baja, en segundos.' },
];

export default function LandingPage() {
    return (
        <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: UI, overflowX: 'hidden' }}>
            {/* Ambient glow */}
            <div
                aria-hidden
                style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 700, pointerEvents: 'none',
                    background: 'radial-gradient(120% 60% at 50% -10%, rgba(250,204,21,0.10) 0%, transparent 55%)',
                }}
            />

            <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>
                {/* Nav */}
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '26px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Bolt size={24} />
                        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Rayo</span>
                    </div>
                    <a href={APP_URL} style={navCta}>Abrir app</a>
                </header>

                {/* Hero */}
                <section style={{ padding: '60px 0 70px', textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
                    <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 800, letterSpacing: '0.18em', color: ACCENT, textTransform: 'uppercase', padding: '6px 12px', borderRadius: 99, background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.22)' }}>
                        Hecho para LATAM
                    </div>
                    <h1 style={{ fontSize: 'clamp(40px, 7vw, 68px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.04, margin: '24px 0 0' }}>
                        Invertí en cripto y acciones,{' '}
                        <span style={{ color: ACCENT }}>simple y en segundos.</span>
                    </h1>
                    <p style={{ fontSize: 'clamp(16px, 2.4vw, 20px)', color: 'rgba(255,255,255,0.62)', lineHeight: 1.5, margin: '22px auto 0', maxWidth: 560 }}>
                        Comprá al alza o a la baja, depositá USDC desde cualquier red y operá al instante.
                        Sin descargas, sin claves raras, sin custodios.
                    </p>
                    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 34 }}>
                        <a href={APP_URL} style={primaryCta}>
                            Abrir app <span style={{ fontSize: 18 }}>↗</span>
                        </a>
                        <a href="#como-funciona" style={secondaryCta}>Cómo funciona</a>
                    </div>
                    <div style={{ marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>
                        Sin descargas · Empezás en 60 segundos
                    </div>
                </section>

                {/* Features */}
                <section style={{ padding: '20px 0 40px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                        {FEATURES.map((f) => (
                            <div key={f.title} style={card}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                                    <Bolt size={16} />
                                    <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>{f.title}</h3>
                                </div>
                                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.58)', lineHeight: 1.55, margin: 0 }}>{f.body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How it works */}
                <section id="como-funciona" style={{ padding: '70px 0 40px' }}>
                    <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', textAlign: 'center', margin: '0 0 8px' }}>
                        Empezar toma 3 pasos
                    </h2>
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 16, margin: '0 0 44px' }}>
                        De cero a tu primera operación en menos de lo que tardás en pedir un café.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                        {STEPS.map((s) => (
                            <div key={s.n} style={{ ...card, paddingTop: 26 }}>
                                <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 800, color: ACCENT, letterSpacing: '-0.02em' }}>{s.n}</div>
                                <h3 style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', margin: '12px 0 6px' }}>{s.title}</h3>
                                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.58)', lineHeight: 1.5, margin: 0 }}>{s.body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA band */}
                <section style={{ padding: '50px 0 80px' }}>
                    <div
                        style={{
                            borderRadius: 28, padding: 'clamp(36px, 6vw, 64px) 24px', textAlign: 'center',
                            background: 'linear-gradient(160deg, rgba(250,204,21,0.14), rgba(250,204,21,0.03))',
                            border: '1px solid rgba(250,204,21,0.25)',
                        }}
                    >
                        <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
                            Tu primera operación te espera.
                        </h2>
                        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.62)', margin: '14px auto 28px', maxWidth: 440 }}>
                            Abrí Rayo en el navegador y empezá ahora mismo. Gratis.
                        </p>
                        <a href={APP_URL} style={primaryCta}>
                            Abrir app <span style={{ fontSize: 18 }}>↗</span>
                        </a>
                    </div>
                </section>

                {/* Footer */}
                <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '28px 0 50px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Bolt size={18} />
                        <span style={{ fontSize: 15, fontWeight: 800 }}>Rayo</span>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>
                            © {new Date().getFullYear()}
                        </span>
                    </div>
                    <nav style={{ display: 'flex', gap: 22, fontSize: 14 }}>
                        <a href={APP_URL} style={footerLink}>Abrir app</a>
                        <a href="/privacidad" style={footerLink}>Privacidad</a>
                        <a href="/soporte" style={footerLink}>Soporte</a>
                    </nav>
                </footer>
            </div>
        </div>
    );
}

function Bolt({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ filter: 'drop-shadow(0 0 6px rgba(250,204,21,0.5))' }}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={ACCENT} />
        </svg>
    );
}

const navCta: React.CSSProperties = {
    fontSize: 14, fontWeight: 700, color: '#0A0C0E', background: ACCENT,
    padding: '9px 18px', borderRadius: 99, textDecoration: 'none',
};

const primaryCta: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontSize: 16, fontWeight: 800, color: '#0A0C0E', background: ACCENT,
    padding: '15px 28px', borderRadius: 99, textDecoration: 'none',
    boxShadow: '0 10px 40px -12px rgba(250,204,21,0.6)',
};

const secondaryCta: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center',
    fontSize: 16, fontWeight: 700, color: '#fff',
    padding: '15px 26px', borderRadius: 99, textDecoration: 'none',
    border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.03)',
};

const card: React.CSSProperties = {
    padding: '22px 22px', borderRadius: 18,
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
};

const footerLink: React.CSSProperties = {
    color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600,
};

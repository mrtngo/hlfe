import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Política de Privacidad · Delos',
    description:
        'Cómo Delos recopila, usa y protege tus datos. Delos es no-custodial y no realiza rastreo publicitario.',
};

const updated = '6 de junio de 2026';

// Plain, readable legal page. No app chrome — just the policy text so it's
// crawlable and reviewable. Styled with the Delos design tokens.
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
const h1: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: '2rem', margin: '24px 0 4px' };
const meta: React.CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', marginBottom: 32 };
const h2: React.CSSProperties = { fontSize: 'var(--text-lg)', marginTop: 32, marginBottom: 8 };
const p: React.CSSProperties = { color: 'var(--color-text-secondary)', lineHeight: 1.7, margin: '0 0 12px' };
const li: React.CSSProperties = { color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 6 };
const a: React.CSSProperties = { color: 'var(--color-brand-primary)', textDecoration: 'none' };

export default function PrivacidadPage() {
    return (
        <main style={page}>
            <div style={wrap}>
                <Link href="/" style={brand}>Delos</Link>

                <h1 style={h1}>Política de Privacidad</h1>
                <p style={meta}>Última actualización: {updated}</p>

                <p style={p}>
                    Delos (&laquo;Delos&raquo;, &laquo;la app&raquo;, &laquo;nosotros&raquo;) es operada de forma
                    individual por <strong>Martín Gutiérrez</strong>. Esta política explica qué datos
                    recopilamos, cómo los usamos y qué derechos tienes. Al usar Delos, aceptas esta política.
                    Para cualquier consulta escríbenos a{' '}
                    <a href="mailto:support@rayotrade.xyz" style={a}>support@rayotrade.xyz</a>.
                </p>

                <h2 style={h2}>1. Quiénes somos</h2>
                <p style={p}>
                    Delos es una aplicación para comprar criptomonedas y operar mercados financieros. Delos es{' '}
                    <strong>no-custodial</strong>: no tenemos control ni custodia de tus fondos ni de tus llaves
                    privadas. Tú mantienes el control de tu wallet en todo momento.
                </p>

                <h2 style={h2}>2. Qué datos recopilamos</h2>
                <ul>
                    <li style={li}>
                        <strong>Correo electrónico:</strong> cuando inicias sesión con tu correo a través de
                        nuestro proveedor de autenticación (Privy), para crear y asegurar tu cuenta.
                    </li>
                    <li style={li}>
                        <strong>Dirección de wallet:</strong> tu dirección pública on-chain, necesaria para
                        mostrar tu portafolio y ejecutar operaciones. Es información pública de la blockchain.
                    </li>
                    <li style={li}>
                        <strong>Uso e interacción:</strong> qué pantallas visitas y qué acciones realizas, para
                        entender y mejorar la app.
                    </li>
                    <li style={li}>
                        <strong>Diagnóstico y fallos:</strong> información técnica cuando la app presenta errores,
                        para corregirlos.
                    </li>
                    <li style={li}>
                        <strong>Token de notificaciones:</strong> si activas las notificaciones, guardamos un
                        identificador para poder enviártelas.
                    </li>
                </ul>
                <p style={p}>
                    No recopilamos datos para rastreo publicitario entre aplicaciones y no vendemos tu información.
                </p>

                <h2 style={h2}>3. Cómo usamos tus datos</h2>
                <ul>
                    <li style={li}>Para operar y autenticar tu cuenta.</li>
                    <li style={li}>Para ejecutar tus operaciones y mostrar tu información.</li>
                    <li style={li}>Para seguridad y prevención de fraude.</li>
                    <li style={li}>Para brindarte soporte y comunicarnos contigo.</li>
                    <li style={li}>Para mejorar el producto.</li>
                </ul>

                <h2 style={h2}>4. Proveedores y terceros</h2>
                <p style={p}>
                    Para funcionar, Delos se apoya en proveedores que procesan ciertos datos en nuestro nombre.
                    Compartimos solo lo necesario para prestar el servicio, y cada proveedor tiene su propia
                    política de privacidad:
                </p>
                <ul>
                    <li style={li}><strong>Privy</strong> — autenticación e inicio de sesión.</li>
                    <li style={li}><strong>Supabase</strong> — base de datos y almacenamiento.</li>
                    <li style={li}><strong>Hyperliquid</strong> — ejecución de operaciones y mercados de predicción.</li>
                    <li style={li}>Proveedores de notificaciones push.</li>
                </ul>

                <h2 style={h2}>5. Operaciones on-chain</h2>
                <p style={p}>
                    Las transacciones que realizas se registran públicamente en la blockchain correspondiente.
                    Esa información es pública por naturaleza y no la controlamos ni podemos eliminarla.
                </p>

                <h2 style={h2}>6. Retención de datos</h2>
                <p style={p}>
                    Conservamos tus datos mientras tu cuenta esté activa o según sea necesario para prestar el
                    servicio y cumplir obligaciones legales.
                </p>

                <h2 style={h2}>7. Tus derechos</h2>
                <p style={p}>
                    Puedes solicitar acceso, corrección o eliminación de tus datos personales escribiendo a{' '}
                    <a href="mailto:support@rayotrade.xyz" style={a}>support@rayotrade.xyz</a>.
                </p>

                <h2 style={h2}>8. Seguridad</h2>
                <p style={p}>
                    Aplicamos medidas razonables para proteger tus datos. Ningún sistema es 100% seguro; cuida
                    tus credenciales y la seguridad de tu wallet.
                </p>

                <h2 style={h2}>9. Menores de edad</h2>
                <p style={p}>
                    Delos no está dirigida a menores. No debes usar la app si no tienes la mayoría de edad legal
                    en tu país.
                </p>

                <h2 style={h2}>10. Cambios a esta política</h2>
                <p style={p}>
                    Podemos actualizar esta política. Publicaremos la versión vigente en esta página, indicando
                    la fecha de la última actualización.
                </p>

                <h2 style={h2}>11. Contacto</h2>
                <p style={p}>
                    <a href="mailto:support@rayotrade.xyz" style={a}>support@rayotrade.xyz</a>
                </p>

                <p style={{ ...meta, marginTop: 40 }}>
                    <Link href="/soporte" style={a}>Soporte</Link>
                    {' · '}
                    <Link href="/legal/terminos" style={a}>Términos y Riesgos</Link>
                </p>
            </div>
        </main>
    );
}

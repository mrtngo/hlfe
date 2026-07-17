import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Términos y Riesgos · Delos',
    description:
        'Términos de uso, advertencias de riesgo y condiciones para usar Delos.',
};

const updated = '15 de junio de 2026';

const page: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-inter)',
    padding: '0 var(--space-4)',
};
const wrap: React.CSSProperties = { maxWidth: 760, margin: '0 auto', padding: 'var(--space-8) 0 96px' };
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
const notice: React.CSSProperties = {
    background: 'color-mix(in srgb, var(--color-negative) 9%, transparent)',
    border: '1px solid color-mix(in srgb, var(--color-negative) 28%, transparent)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    marginBottom: 28,
};

export default function TerminosPage() {
    return (
        <main style={page}>
            <div style={wrap}>
                <Link href="/" style={brand}>Delos</Link>

                <h1 style={h1}>Términos de Uso y Advertencia de Riesgo</h1>
                <p style={meta}>Última actualización: {updated}</p>

                <div style={notice}>
                    <p style={{ ...p, marginBottom: 0, color: 'var(--color-text-primary)' }}>
                        Delos permite acceder a productos cripto y derivados apalancados de alto riesgo.
                        Puedes perder la totalidad de tus fondos. No uses dinero que no puedas permitirte perder.
                    </p>
                </div>

                <p style={p}>
                    Estos términos regulan el uso de Delos (&laquo;Delos&raquo;, &laquo;la app&raquo;,
                    &laquo;nosotros&raquo;), operada por <strong>Martín Gutiérrez</strong>. Al usar la app
                    aceptas estos términos, nuestra{' '}
                    <Link href="/privacidad" style={a}>Política de Privacidad</Link> y las advertencias de
                    riesgo de esta página. Si no estás de acuerdo, no uses Delos.
                </p>

                <h2 style={h2}>1. Qué es Delos</h2>
                <p style={p}>
                    Delos es una interfaz móvil y web para consultar mercados, conectar una wallet y enviar
                    instrucciones hacia protocolos y proveedores externos. Delos no es una bolsa, banco,
                    comisionista, asesor financiero ni entidad regulada para prestar asesoría de inversión.
                </p>

                <h2 style={h2}>2. No custodia</h2>
                <p style={p}>
                    Delos está diseñado como una experiencia no-custodial. Tus fondos y llaves pertenecen a tu
                    wallet y a los protocolos externos que decides usar. Delos no promete recuperar fondos,
                    revertir transacciones ni reemplazar pérdidas causadas por errores, liquidaciones, fallos de
                    terceros o actividad on-chain.
                </p>

                <h2 style={h2}>3. Proveedores externos</h2>
                <p style={p}>
                    Algunas funciones dependen de terceros como Privy, Supabase, Hyperliquid, Circle CCTP,
                    Hyperunit, proveedores RPC, wallets y redes blockchain. Sus servicios pueden fallar,
                    cambiar, suspenderse o tener errores. Al usar Delos aceptas que esas dependencias externas
                    están fuera de nuestro control.
                </p>

                <h2 style={h2}>4. Riesgo de trading y liquidación</h2>
                <ul>
                    <li style={li}>El apalancamiento amplifica ganancias y pérdidas.</li>
                    <li style={li}>Un movimiento pequeño contra tu posición puede liquidarte.</li>
                    <li style={li}>Las operaciones on-chain son finales y normalmente no pueden revertirse.</li>
                    <li style={li}>Los mercados cripto pueden moverse violentamente y tener baja liquidez.</li>
                    <li style={li}>Las órdenes pueden ejecutarse con slippage o a precios distintos a los esperados.</li>
                    <li style={li}>El funding de perpetuos puede generar costos mientras mantienes posiciones abiertas.</li>
                </ul>

                <h2 style={h2}>5. Riesgos técnicos</h2>
                <p style={p}>
                    Usar Delos implica riesgos de contratos inteligentes, bugs, congestión de red, fallos de RPC,
                    problemas de wallets, errores de firma, ataques de phishing, puentes cross-chain, demoras de
                    confirmación y disponibilidad limitada. Debes revisar cada operación antes de confirmarla.
                </p>

                <h2 style={h2}>6. Sin asesoría financiera</h2>
                <p style={p}>
                    La información mostrada en Delos es informativa y educativa. No constituye recomendación de
                    inversión, asesoría financiera, legal, contable ni tributaria. Tú decides si una operación es
                    adecuada para ti y asumes toda responsabilidad por tus decisiones.
                </p>

                <h2 style={h2}>7. Elegibilidad y jurisdicción</h2>
                <p style={p}>
                    Solo puedes usar Delos si eres mayor de edad y si el uso de productos cripto, derivados,
                    perpetuos, mercados de predicción y proveedores externos es legal en tu jurisdicción. No debes
                    usar Delos si estás en un país, región o condición donde dicho uso esté prohibido o restringido.
                </p>

                <h2 style={h2}>8. Uso prohibido</h2>
                <ul>
                    <li style={li}>No uses Delos para fraude, lavado de activos, evasión de sanciones o actividad ilegal.</li>
                    <li style={li}>No intentes explotar, interferir, copiar o dañar la app o sus servicios.</li>
                    <li style={li}>No uses Delos si no entiendes los riesgos de wallet, blockchain y apalancamiento.</li>
                </ul>

                <h2 style={h2}>9. Comisiones e impuestos</h2>
                <p style={p}>
                    Las operaciones pueden incluir comisiones de red, comisiones de protocolo, builder fees,
                    spreads, slippage y costos de terceros. También puedes tener obligaciones fiscales en tu país.
                    Tú eres responsable de revisar costos, declarar y pagar impuestos aplicables.
                </p>

                <h2 style={h2}>10. Disponibilidad</h2>
                <p style={p}>
                    Delos puede estar temporalmente no disponible por mantenimiento, errores, incidentes,
                    limitaciones de terceros o eventos de mercado. No garantizamos disponibilidad continua,
                    ejecución perfecta ni ausencia de errores.
                </p>

                <h2 style={h2}>11. Limitación de responsabilidad</h2>
                <p style={p}>
                    En la máxima medida permitida por la ley, Delos no será responsable por pérdidas de trading,
                    liquidaciones, pérdida de llaves, errores del usuario, fallos de terceros, fallos de mercado,
                    fallos de puentes, cambios regulatorios o daños indirectos derivados del uso de la app.
                </p>

                <h2 style={h2}>12. Cambios</h2>
                <p style={p}>
                    Podemos actualizar estos términos. La versión vigente estará publicada en esta página. El uso
                    continuado de Delos después de una actualización implica aceptación de los términos actualizados.
                </p>

                <h2 style={h2}>13. Contacto</h2>
                <p style={p}>
                    Para preguntas o soporte, escríbenos a{' '}
                    <a href="mailto:support@rayotrade.xyz" style={a}>support@rayotrade.xyz</a>.
                </p>

                <p style={{ ...meta, marginTop: 40 }}>
                    <Link href="/privacidad" style={a}>Política de Privacidad</Link>
                    {' · '}
                    <Link href="/soporte" style={a}>Soporte</Link>
                </p>
            </div>
        </main>
    );
}

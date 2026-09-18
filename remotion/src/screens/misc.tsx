/**
 * Remaining screens: onboarding, portfolio, history, DCA and rewards.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { V2 } from '../brand/tokens';
import { FONT_MONO, FONT_SERIF } from '../brand/fonts';
import { BalanceHero, Card, Cta, FootNote, Label, Mono, Pill, SectionHead, SunTile } from '../kit/ui';
import { enter, riseIn } from '../kit/motion';
import { usd } from '../kit/format';
import { Screen, Centered } from './common';
import { PositionCard } from './trading';
import { DelosSun } from '../brand/DelosSun';

/** Onboarding: the value prop, then the one-tap entry. */
export const OnboardIntro: React.FC = () => {
    const frame = useCurrentFrame();
    return (
        <Screen>
            <Centered gap={20}>
                <div style={{ transform: `scale(${0.8 + enter(frame, 0) * 0.2})` }}>
                    <SunTile size={72} />
                </div>
                <div
                    style={{
                        fontFamily: FONT_SERIF,
                        fontSize: 34,
                        fontWeight: 600,
                        lineHeight: 1.12,
                        ...riseIn(frame, 5, 18),
                    }}
                >
                    Acciones, cripto,
                    <br />
                    oro e índices
                </div>
                <div style={{ fontSize: 14, color: V2.t2, lineHeight: 1.5, ...riseIn(frame, 9, 16) }}>
                    Ponete largo o corto con apalancamiento, directo desde tu teléfono.
                </div>
                <div style={{ width: '100%', marginTop: 12, ...riseIn(frame, 13, 18) }}>
                    <Cta label="Crear cuenta" />
                    <div
                        style={{
                            textAlign: 'center',
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: V2.t2,
                            marginTop: 14,
                        }}
                    >
                        Entrar como invitado
                    </div>
                </div>
            </Centered>
        </Screen>
    );
};

/** The invisible-wallet promise: no seed phrase, no popups. */
export const OnboardWallet: React.FC = () => {
    const frame = useCurrentFrame();
    const items = [
        ['📧', 'Entrás con tu email', 'Sin frase semilla que perder'],
        ['🔑', 'Tu billetera se crea sola', 'Y solo vos tenés las llaves'],
        ['⚡', 'Operás sin pop-ups', 'Cada orden se firma sola'],
    ];
    return (
        <Screen>
            <div style={{ padding: '80px 20px 0' }}>
                <div
                    style={{
                        fontSize: 27,
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.15,
                        marginBottom: 8,
                    }}
                >
                    Tu billetera,
                    <br />
                    sin la parte difícil
                </div>
                <div style={{ fontSize: 13, color: V2.t2, marginBottom: 26, lineHeight: 1.5 }}>
                    Autocustodia de verdad, sin que parezca cripto.
                </div>
                {items.map(([icon, title, sub], i) => (
                    <Card key={title} style={{ marginBottom: 10, ...riseIn(frame, 4 + i * 4, 16) }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 12,
                                    background: V2.accentSoft,
                                    border: `1px solid rgba(227,179,76,0.3)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 17,
                                    flexShrink: 0,
                                }}
                            >
                                {icon}
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
                                <div style={{ fontSize: 11.5, color: V2.t3, marginTop: 2 }}>{sub}</div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </Screen>
    );
};

/** Portfolio: total value, open positions, allocation. */
export const PortfolioScreen: React.FC<{ total?: number }> = ({ total = 1284.5 }) => {
    const frame = useCurrentFrame();
    return (
        <Screen nav="profile">
            <div style={{ padding: '56px 20px 0' }}>
                <Label style={{ fontSize: 11, color: V2.t3, fontWeight: 600 }}>Cartera</Label>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>
                    Tus posiciones
                </div>

                <Card style={{ padding: 18, marginBottom: 16, ...riseIn(frame, 2, 14) }}>
                    <BalanceHero
                        label="Valor total"
                        value={usd(total)}
                        size={38}
                        sub={
                            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                                <Pill label="+12,4%" tone="pos" />
                                <span style={{ fontSize: 11, color: V2.t3, fontFamily: FONT_MONO }}>30d</span>
                            </div>
                        }
                    />
                    {/* Allocation bar */}
                    <div style={{ display: 'flex', gap: 3, marginTop: 16, height: 7 }}>
                        {[
                            ['#F7931A', 46],
                            ['#627EEA', 26],
                            [V2.accent, 18],
                            [V2.hair2, 10],
                        ].map(([c, w], i) => (
                            <div
                                key={i}
                                style={{ background: c as string, width: `${w}%`, borderRadius: 99 }}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                        {[
                            ['BTC', '#F7931A'],
                            ['ETH', '#627EEA'],
                            ['Predicción', V2.accent],
                        ].map(([l, c]) => (
                            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div
                                    style={{ width: 7, height: 7, borderRadius: 99, background: c as string }}
                                />
                                <span style={{ fontSize: 10.5, color: V2.t3, fontWeight: 600 }}>{l}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <SectionHead label="Abiertas" right="2" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <PositionCard symbol="BTC" side="long" lev={5} pnl={52.4} pnlPct={26.2} delay={6} />
                    <PositionCard symbol="ETH" side="short" lev={3} pnl={-8.1} pnlPct={-4.05} delay={9} />
                </div>
            </div>
        </Screen>
    );
};

/** History / activity feed. */
export const HistoryScreen: React.FC = () => {
    const frame = useCurrentFrame();
    const rows: [string, string, string, boolean][] = [
        ['Compraste BTC', 'Hoy 14:22', '+0,0013 BTC', true],
        ['Apostaste a Barcelona', 'Hoy 12:05', '−$50,00', false],
        ['Depósito USDC', 'Ayer 19:40', '+$500,00', true],
        ['Cerraste ETH · Bajada', 'Ayer 11:12', '+$18,40', true],
        ['DCA semanal · BTC', 'Lun 09:00', '−$25,00', false],
    ];
    return (
        <Screen nav="profile">
            <div style={{ padding: '56px 20px 0' }}>
                <Label style={{ fontSize: 11, color: V2.t3, fontWeight: 600 }}>Historial</Label>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 18 }}>
                    Todo lo que hiciste
                </div>
                <Card style={{ padding: '4px 14px' }}>
                    {rows.map(([title, when, amount, up], i) => (
                        <div
                            key={title}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '13px 0',
                                borderBottom: i < rows.length - 1 ? `1px solid ${V2.hair}` : 'none',
                                ...riseIn(frame, 2 + i * 3, 12),
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</div>
                                <div style={{ fontSize: 11, color: V2.t3, marginTop: 2 }}>{when}</div>
                            </div>
                            <Mono size={13} color={up ? V2.pos : V2.t2}>
                                {amount}
                            </Mono>
                        </div>
                    ))}
                </Card>
            </div>
        </Screen>
    );
};

/** DCA: set a recurring buy and forget it. */
export const DcaScreen: React.FC<{ confirmed?: boolean }> = ({ confirmed }) => {
    const frame = useCurrentFrame();
    return (
        <Screen>
            <div style={{ padding: '56px 20px 0' }}>
                <Label style={{ fontSize: 11, color: V2.t3, fontWeight: 600 }}>Compra recurrente</Label>
                <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
                    Comprá en automático
                </div>
                <div style={{ fontSize: 13, color: V2.t2, marginBottom: 20, lineHeight: 1.45 }}>
                    Un poco cada semana. Sin mirar el precio.
                </div>

                <Card style={{ padding: 18, ...riseIn(frame, 2, 14) }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 99,
                                background: '#F7931A',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 800,
                                color: '#0A0C0E',
                            }}
                        >
                            BTC
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>Bitcoin</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={V2.t3} strokeWidth={2}>
                            <path d="M9 6l6 6-6 6" />
                        </svg>
                    </div>
                    <div style={{ borderTop: `1px solid ${V2.hair}`, paddingTop: 14 }}>
                        <Label style={{ fontSize: 11, color: V2.t3, marginBottom: 6 }}>Monto</Label>
                        <Mono size={32}>$25,00</Mono>
                    </div>
                </Card>

                <div style={{ marginTop: 16, ...riseIn(frame, 6, 14) }}>
                    <Label style={{ fontSize: 11.5, color: V2.t3, marginBottom: 8 }}>Cada cuánto</Label>
                    <div style={{ display: 'flex', gap: 7 }}>
                        {['Diario', 'Semanal', 'Mensual'].map((f, i) => (
                            <div
                                key={f}
                                style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    padding: '12px 0',
                                    borderRadius: 12,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    background: i === 1 ? V2.accentSoft : V2.card,
                                    border: `1px solid ${i === 1 ? 'rgba(227,179,76,0.45)' : V2.hair}`,
                                    color: i === 1 ? V2.accent : V2.t2,
                                }}
                            >
                                {f}
                            </div>
                        ))}
                    </div>
                </div>

                <Card style={{ marginTop: 16, ...riseIn(frame, 10, 14) }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12.5, color: V2.t2 }}>En un año pusiste</span>
                        <Mono size={17} color={V2.accent}>$1.300</Mono>
                    </div>
                </Card>

                {confirmed ? (
                    <Card accent style={{ marginTop: 16, ...riseIn(frame, 1, 14) }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <DelosSun size={20} />
                            <div style={{ fontSize: 13, fontWeight: 800, color: V2.accent }}>
                                Activa · próxima el lunes
                            </div>
                        </div>
                    </Card>
                ) : (
                    <Cta label="Activar compra semanal" style={{ marginTop: 18, ...riseIn(frame, 13, 14) }} />
                )}
            </div>
            <FootNote icon="⏸️">
                La pausás o la cambiás cuando quieras. Sin comisión por cancelar.
            </FootNote>
        </Screen>
    );
};

/** Rewards: points ledger + referrals. */
export const RewardsScreen: React.FC<{ points?: number }> = ({ points = 12480 }) => {
    const frame = useCurrentFrame();
    const p = enter(frame, 0);
    return (
        <Screen nav="rewards">
            <div style={{ padding: '56px 20px 0' }}>
                <Label style={{ fontSize: 11, color: V2.t3, fontWeight: 600 }}>Premios</Label>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>
                    Tus puntos
                </div>

                <Card
                    accent
                    style={{
                        padding: 22,
                        textAlign: 'center',
                        marginBottom: 16,
                        ...riseIn(frame, 2, 14),
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: 12,
                            transform: `scale(${0.7 + p * 0.3})`,
                        }}
                    >
                        <DelosSun size={40} rayScale={1 + (1 - p) * 0.5} />
                    </div>
                    <Mono size={42} color={V2.accent}>
                        {Math.round(points * p).toLocaleString('es-ES')}
                    </Mono>
                    <div style={{ fontSize: 12, color: V2.t2, marginTop: 6 }}>puntos acumulados</div>
                </Card>

                <SectionHead label="Cómo sumás" />
                {[
                    ['Operá', '1 punto por cada $1', '+8.240'],
                    ['Predecí', 'Doble puntos', '+3.100'],
                    ['Invitá amigos', '500 por cada uno', '+1.140'],
                ].map(([t, s, v], i) => (
                    <Card key={t} style={{ marginBottom: 8, ...riseIn(frame, 6 + i * 3, 14) }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t}</div>
                                <div style={{ fontSize: 11.5, color: V2.t3, marginTop: 2 }}>{s}</div>
                            </div>
                            <Mono size={14} color={V2.accent}>{v}</Mono>
                        </div>
                    </Card>
                ))}

                <Card style={{ marginTop: 8, ...riseIn(frame, 16, 14) }}>
                    <Label style={{ fontSize: 11, color: V2.t3, marginBottom: 6 }}>Tu código</Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Mono size={19} color={V2.t1}>DELOS-MG42</Mono>
                        <div style={{ flex: 1 }} />
                        <Pill label="Copiar" tone="accent" />
                    </div>
                </Card>
            </div>
        </Screen>
    );
};

/**
 * Deposit and withdraw screens — the multi-chain money-movement flows
 * (USDC over Arbitrum / Base / Solana, bridged with CCTP).
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { V2 } from '../brand/tokens';
import { FONT_MONO } from '../brand/fonts';
import { Card, Cta, FootNote, Label, Pill, SectionHead } from '../kit/ui';
import { riseIn } from '../kit/motion';
import { Screen } from './common';

const CHAINS = [
    { id: 'arb', name: 'Arbitrum', note: 'USDC nativo · más barato', color: '#2D374B', glyph: 'ARB' },
    { id: 'base', name: 'Base', note: 'USDC nativo', color: '#0052FF', glyph: 'BAS' },
    { id: 'sol', name: 'Solana', note: 'USDC · vía CCTP', color: '#14F195', glyph: 'SOL' },
];

const ChainRow: React.FC<{
    chain: (typeof CHAINS)[number];
    selected?: boolean;
}> = ({ chain, selected }) => (
    <div
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '12px 13px',
            borderRadius: 13,
            background: selected ? V2.accentSoft : 'transparent',
            border: `1px solid ${selected ? 'rgba(227,179,76,0.45)' : 'transparent'}`,
        }}
    >
        <div
            style={{
                width: 32,
                height: 32,
                borderRadius: 99,
                background: chain.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9.5,
                fontWeight: 800,
                color: '#fff',
                flexShrink: 0,
            }}
        >
            {chain.glyph}
        </div>
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{chain.name}</div>
            <div style={{ fontSize: 11, color: V2.t3 }}>{chain.note}</div>
        </div>
        {selected && <Pill label="Elegida" tone="accent" />}
    </div>
);

/** Deposit step 1: pick the network you're sending from. */
export const DepositPickChain: React.FC<{ selected?: string }> = ({ selected }) => {
    const frame = useCurrentFrame();
    return (
        <Screen>
            <div style={{ padding: '56px 20px 0' }}>
                <Label style={{ fontSize: 11, color: V2.t3, fontWeight: 600 }}>Depositar</Label>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
                    ¿Desde qué red?
                </div>
                <div style={{ fontSize: 13, color: V2.t2, marginBottom: 20, lineHeight: 1.45 }}>
                    Manda USDC desde cualquiera. Nosotros lo puenteamos solos.
                </div>
                <Card style={{ padding: 5, ...riseIn(frame, 3, 14) }}>
                    {CHAINS.map((c) => (
                        <ChainRow key={c.id} chain={c} selected={selected === c.id} />
                    ))}
                </Card>
                <div style={{ marginTop: 18, ...riseIn(frame, 9, 14) }}>
                    <Card>
                        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 14, lineHeight: 1.2 }}>🔒</span>
                            <div style={{ fontSize: 11.5, color: V2.t2, lineHeight: 1.5 }}>
                                Tus fondos quedan siempre en tu billetera. Delos nunca los custodia.
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
            <FootNote icon="⚡">
                Suele acreditarse en menos de un minuto, sin importar la red que elijas.
            </FootNote>
        </Screen>
    );
};

/** Deposit step 2: the address + QR to send to. */
export const DepositAddress: React.FC = () => {
    const frame = useCurrentFrame();
    return (
        <Screen>
            <div style={{ padding: '56px 20px 0' }}>
                <Label style={{ fontSize: 11, color: V2.t3, fontWeight: 600 }}>Depositar · Arbitrum</Label>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 18 }}>
                    Tu dirección
                </div>
                <Card style={{ padding: 20, textAlign: 'center', ...riseIn(frame, 2, 14) }}>
                    <div
                        style={{
                            width: 152,
                            height: 152,
                            margin: '0 auto 16px',
                            borderRadius: 14,
                            background: '#fff',
                            padding: 12,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(11, 1fr)',
                            gap: 1.5,
                        }}
                    >
                        {/* Decorative QR — deterministic so it doesn't flicker per frame. */}
                        {Array.from({ length: 121 }).map((_, i) => {
                            const on = (i * 7 + ((i % 11) * 13) + Math.floor(i / 11) * 5) % 3 !== 0;
                            const corner =
                                (i % 11 < 3 && i < 33) ||
                                (i % 11 > 7 && i < 33) ||
                                (i % 11 < 3 && i > 87);
                            return (
                                <div
                                    key={i}
                                    style={{ background: corner || on ? '#0A0C0E' : 'transparent', borderRadius: 1 }}
                                />
                            );
                        })}
                    </div>
                    <div
                        style={{
                            fontFamily: FONT_MONO,
                            fontSize: 12,
                            color: V2.t2,
                            wordBreak: 'break-all',
                            lineHeight: 1.6,
                        }}
                    >
                        0x889c4f2a…e31b0f06
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                        <Cta label="Copiar" style={{ flex: 1, padding: '11px 0', fontSize: 13.5 }} />
                        <div
                            style={{
                                flex: 1,
                                borderRadius: 14,
                                border: `1px solid ${V2.hair2}`,
                                padding: '11px 0',
                                textAlign: 'center',
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: V2.t2,
                            }}
                        >
                            Compartir
                        </div>
                    </div>
                </Card>
                <div style={{ marginTop: 16, ...riseIn(frame, 8, 14) }}>
                    <Card>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 99,
                                    background: V2.pos,
                                    boxShadow: `0 0 10px ${V2.pos}`,
                                }}
                            />
                            <span style={{ fontSize: 12.5, color: V2.t2 }}>Esperando tu depósito…</span>
                        </div>
                    </Card>
                </div>
            </div>
        </Screen>
    );
};

/** Withdraw: amount, destination chain + address, gated by 2FA. */
export const WithdrawScreen: React.FC<{ amount?: string; showMfa?: boolean }> = ({
    amount = '250,00',
    showMfa,
}) => {
    const frame = useCurrentFrame();
    return (
        <Screen>
            <div style={{ padding: '56px 20px 0' }}>
                <Label style={{ fontSize: 11, color: V2.t3, fontWeight: 600 }}>Retirar</Label>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 18 }}>
                    ¿Cuánto sacas?
                </div>

                <Card style={{ padding: 18, ...riseIn(frame, 2, 14) }}>
                    <Label style={{ fontSize: 11, color: V2.t3, marginBottom: 6 }}>Monto</Label>
                    <div
                        style={{
                            fontSize: 38,
                            fontWeight: 700,
                            fontFamily: FONT_MONO,
                            letterSpacing: '-0.03em',
                        }}
                    >
                        ${amount}
                    </div>
                    <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
                        {['25%', '50%', 'Todo'].map((q, i) => (
                            <div
                                key={q}
                                style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    padding: '8px 0',
                                    borderRadius: 10,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    background: i === 1 ? V2.accentSoft : V2.card,
                                    border: `1px solid ${i === 1 ? 'rgba(227,179,76,0.4)' : V2.hair}`,
                                    color: i === 1 ? V2.accent : V2.t2,
                                }}
                            >
                                {q}
                            </div>
                        ))}
                    </div>
                </Card>

                <div style={{ marginTop: 18, ...riseIn(frame, 6, 14) }}>
                    <SectionHead label="¿A dónde?" />
                    <Card style={{ padding: 5 }}>
                        <ChainRow chain={CHAINS[1]} selected />
                    </Card>
                    <Card style={{ marginTop: 9 }}>
                        <Label style={{ fontSize: 11, color: V2.t3, marginBottom: 4 }}>Dirección</Label>
                        <div style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: V2.t1 }}>
                            0x4b1e…9ac2
                        </div>
                    </Card>
                </div>

                {showMfa ? (
                    <Card accent style={{ marginTop: 18, ...riseIn(frame, 2, 14) }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 16 }}>🛡️</span>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: V2.accent }}>
                                    Confirma con tu código
                                </div>
                                <div style={{ fontSize: 11.5, color: V2.t2, marginTop: 2 }}>
                                    2FA protege cada retiro
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 7, marginTop: 13, justifyContent: 'center' }}>
                            {['4', '1', '9', '2', '0', '7'].map((d, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: 38,
                                        height: 46,
                                        borderRadius: 10,
                                        background: V2.cardSolid,
                                        border: `1px solid ${V2.hair2}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontFamily: FONT_MONO,
                                        fontSize: 19,
                                        fontWeight: 700,
                                    }}
                                >
                                    {d}
                                </div>
                            ))}
                        </div>
                    </Card>
                ) : (
                    <Cta label={`Retirar $${amount}`} style={{ marginTop: 20, ...riseIn(frame, 10, 14) }} />
                )}
            </div>
            {!showMfa && (
                <FootNote icon="🔓">
                    Nadie tiene que aprobar tu retiro. Es tu plata y sale cuando quieres.
                </FootNote>
            )}
        </Screen>
    );
};

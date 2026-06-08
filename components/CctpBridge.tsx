'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, Check, Loader2, AlertCircle } from 'lucide-react';
import ScreenHeader from '@/components/ScreenHeader';
import {
    CCTP_CHAINS,
    CCTP_DEPOSIT_SOURCES,
    type CctpChainKey,
} from '@/lib/cctp/constants';
import { MIN_BRIDGE_DEPOSIT } from '@/lib/constants/bridge';
import { useCctpTransfer } from '@/hooks/useCctpTransfer';
import { useSolanaDeposit } from '@/hooks/useSolanaDeposit';

// Solana deposit is ON by default. It's a fresh, on-chain-untested path and
// CCTP burns are irreversible — so this stays a kill-switch: set
// NEXT_PUBLIC_ENABLE_SOLANA_DEPOSIT=0 to pull it instantly (no redeploy of code)
// if a live test surfaces the event-rent / sponsorship issue.
const SOLANA_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SOLANA_DEPOSIT !== '0';

type SourceKey = CctpChainKey | 'solana';

interface CctpBridgeProps {
    onClose?: () => void;
    /** Which source chain to start on. */
    defaultFrom?: CctpChainKey;
    /** Fired after the funds are credited to the Hyperliquid perps balance. */
    onArrivedOnArbitrum?: () => void;
}

const STEP_LABEL: Record<string, string> = {
    idle: '',
    approving: 'Aprobando USDC…',
    building: 'Preparando…',
    burning: 'Enviando en origen…',
    attesting: 'Esperando atestación de Circle…',
    minting: 'Recibiendo en Arbitrum…',
    depositing: 'Acreditando a tu balance…',
    success: 'Listo',
    error: 'Error',
};

const EVM_ORDER = ['approving', 'burning', 'attesting', 'minting', 'depositing', 'success'];
const SOL_ORDER = ['building', 'burning', 'attesting', 'minting', 'depositing', 'success'];

const SOURCE_KEYS: SourceKey[] = SOLANA_ENABLED
    ? [...CCTP_DEPOSIT_SOURCES, 'solana']
    : [...CCTP_DEPOSIT_SOURCES];

const sourceMeta = (key: SourceKey): { label: string; explorer: string } =>
    key === 'solana'
        ? { label: 'Solana', explorer: 'https://solscan.io/tx/' }
        : { label: CCTP_CHAINS[key].label, explorer: CCTP_CHAINS[key].explorer };

export default function CctpBridge({ onClose, defaultFrom = 'base', onArrivedOnArbitrum }: CctpBridgeProps) {
    const [fromKey, setFromKey] = useState<SourceKey>(
        CCTP_DEPOSIT_SOURCES.includes(defaultFrom) ? defaultFrom : 'base',
    );
    const [amount, setAmount] = useState('');

    const evm = useCctpTransfer();
    const sol = useSolanaDeposit();

    const isSolana = fromKey === 'solana';

    // Normalize whichever flow is active so the rest of the UI is agnostic.
    const flow = isSolana
        ? {
              status: sol.status as string,
              inProgress: sol.inProgress,
              error: sol.error,
              burnTx: sol.burnSig,
              mintTx: sol.mintTxHash,
              depositTx: sol.depositTxHash,
              reset: sol.reset,
              run: () => sol.deposit(amount),
          }
        : {
              status: evm.status as string,
              inProgress: evm.inProgress,
              error: evm.error,
              burnTx: evm.burnTxHash,
              mintTx: evm.mintTxHash,
              depositTx: evm.depositTxHash,
              reset: evm.reset,
              run: () => evm.transfer(fromKey as CctpChainKey, 'arbitrum', amount, { autoDeposit: true }),
          };

    const from = sourceMeta(fromKey);
    const to = CCTP_CHAINS.arbitrum; // deposits always land on Arbitrum → perps
    const order = isSolana ? SOL_ORDER : EVM_ORDER;
    const amountNum = parseFloat(amount || '0') || 0;
    const belowMin = amountNum > 0 && amountNum < MIN_BRIDGE_DEPOSIT;
    const canSubmit = amountNum >= MIN_BRIDGE_DEPOSIT && !flow.inProgress;

    const pickSource = (key: SourceKey) => {
        if (flow.inProgress) return;
        setFromKey(key);
        evm.reset();
        sol.reset();
    };

    const handleType = (v: string) => {
        let c = v.replace(/[^0-9.]/g, '');
        const d = c.indexOf('.');
        if (d >= 0) c = c.slice(0, d + 1) + c.slice(d + 1).replace(/\./g, '');
        if (c.startsWith('.')) c = '0' + c;
        setAmount(c);
    };

    const currentStepIdx = useMemo(() => order.indexOf(flow.status), [order, flow.status]);

    if (flow.status === 'success') {
        return (
            <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
                <ScreenHeader title="" onBack={onClose} />
                <div style={{ padding: '32px 12px', textAlign: 'center' }}>
                    <div
                        style={{
                            width: 88,
                            height: 88,
                            margin: '0 auto 22px',
                            borderRadius: '50%',
                            background:
                                'radial-gradient(circle at 30% 30%, rgba(34,197,94,0.35), rgba(34,197,94,0.06))',
                            border: '1px solid rgba(34,197,94,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 40px -8px rgba(34,197,94,0.5)',
                        }}
                    >
                        <Check size={40} strokeWidth={2.6} color="var(--color-positive)" />
                    </div>
                    <div
                        className="font-display"
                        style={{
                            fontSize: 32,
                            fontStyle: 'italic',
                            fontWeight: 500,
                            color: 'var(--color-brand-primary)',
                            letterSpacing: '-0.03em',
                        }}
                    >
                        ¡USDC en tu balance!
                    </div>
                    <div className="tabular-mono" style={{ marginTop: 8, fontSize: 14, color: '#fff' }}>
                        {amountNum.toLocaleString('en-US')} USDC · {from.label} → Hyperliquid
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        Listo para operar. Se acredita en menos de un minuto.
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {flow.burnTx && (
                            <TxLink label={`Envío en ${from.label}`} href={from.explorer + flow.burnTx} />
                        )}
                        {flow.mintTx && (
                            <TxLink label={`Recibido en ${to.label}`} href={to.explorer + flow.mintTx} />
                        )}
                        {flow.depositTx && (
                            <TxLink label="Depósito a Hyperliquid" href={to.explorer + flow.depositTx} />
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                        <button type="button" onClick={flow.reset} style={secondaryBtn}>
                            Otro depósito
                        </button>
                        <button
                            type="button"
                            onClick={() => (onArrivedOnArbitrum ? onArrivedOnArbitrum() : onClose?.())}
                            style={primaryBtn}
                        >
                            Empezar a operar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
            <ScreenHeader title="Depositar." onBack={onClose} large italic />

            <div style={{ padding: '4px 6px 0' }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 16px' }}>
                    Deposita USDC desde cualquier red. Llega directo a tu balance de Hyperliquid —
                    con Circle CCTP, 1:1 y en segundos.
                </p>

                {/* Source chain picker */}
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
                        Desde
                    </div>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                        {SOURCE_KEYS.map((key) => {
                            const selected = key === fromKey;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => pickSource(key)}
                                    disabled={flow.inProgress}
                                    style={{
                                        flexShrink: 0,
                                        padding: '8px 14px',
                                        borderRadius: 999,
                                        border: `1px solid ${selected ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.1)'}`,
                                        background: selected ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.025)',
                                        color: selected ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: flow.inProgress ? 'not-allowed' : 'pointer',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    {sourceMeta(key).label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Amount */}
                <ChainCard role="Monto" chainLabel={from.label}>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => handleType(e.target.value)}
                        placeholder="0"
                        disabled={flow.inProgress}
                        className="font-display tabular-mono"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#fff',
                            fontSize: 32,
                            fontWeight: 500,
                            width: '100%',
                            caretColor: 'var(--color-brand-primary)',
                        }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 700 }}>USDC</span>
                </ChainCard>

                {/* Destination (fixed → perps) */}
                <div style={{ marginTop: 10 }}>
                    <ChainCard role="Hacia" chainLabel="Hyperliquid">
                        <span className="font-display tabular-mono" style={{ fontSize: 32, fontWeight: 500, color: amountNum > 0 ? '#fff' : 'rgba(255,255,255,0.25)' }}>
                            {amountNum > 0 ? `~${amountNum.toLocaleString('en-US')}` : '0'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 700 }}>USDC</span>
                    </ChainCard>
                </div>

                {/* Info */}
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <InfoRow label="Vía" value="Circle CCTP · USDC nativo" />
                    <InfoRow label="Tiempo" value="~segundos (Fast Transfer)" />
                    <InfoRow label="Comisión de red" value="hasta 0.1% (real ~0.01%)" />
                    <InfoRow label="Mínimo" value={`$${MIN_BRIDGE_DEPOSIT} USDC`} />
                </div>

                {/* Below-minimum hint */}
                {belowMin && (
                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-negative)', fontWeight: 600 }}>
                        El depósito mínimo es ${MIN_BRIDGE_DEPOSIT} USDC.
                    </div>
                )}

                {/* Progress */}
                {flow.inProgress && (
                    <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.18)' }}>
                        {order.slice(0, -1).map((s, i) => {
                            const active = flow.status === s;
                            const done = currentStepIdx > i;
                            return (
                                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                                    {done ? (
                                        <Check size={14} color="var(--color-positive)" />
                                    ) : active ? (
                                        <Loader2 size={14} className="animate-spin" color="var(--color-brand-primary)" />
                                    ) : (
                                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)' }} />
                                    )}
                                    <span style={{ fontSize: 12, color: active ? '#fff' : done ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)', fontWeight: active ? 700 : 500 }}>
                                        {STEP_LABEL[s]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Error */}
                {flow.status === 'error' && flow.error && (
                    <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', gap: 10 }}>
                        <AlertCircle size={16} color="var(--color-negative)" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{flow.error}</span>
                    </div>
                )}

                {/* CTA */}
                <div style={{ padding: '18px 0 6px' }}>
                    <button
                        type="button"
                        onClick={flow.run}
                        disabled={!canSubmit}
                        style={{
                            width: '100%',
                            padding: 16,
                            borderRadius: 14,
                            background: canSubmit
                                ? 'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)'
                                : 'rgba(255,255,255,0.04)',
                            border: 'none',
                            color: canSubmit ? '#1A1304' : 'rgba(255,255,255,0.3)',
                            fontWeight: 800,
                            fontSize: 14,
                            cursor: canSubmit ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 8,
                            fontFamily: 'inherit',
                        }}
                    >
                        {flow.inProgress ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                {STEP_LABEL[flow.status]}
                            </>
                        ) : (
                            <>
                                Depositar desde {from.label}
                                <ArrowUpRight size={16} strokeWidth={2.6} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ChainCard({ role, chainLabel, children }: { role: string; chainLabel: string; children: React.ReactNode }) {
    return (
        <div
            style={{
                padding: '14px 16px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-text-tertiary)' }}>
                    {role}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-brand-primary)' }}>{chainLabel}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>{children}</div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{value}</span>
        </div>
    );
}

function TxLink({ label, href }: { label: string; href: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--color-brand-primary)',
                textDecoration: 'none',
            }}
        >
            {label}
            <ArrowUpRight size={13} />
        </a>
    );
}

const primaryBtn: React.CSSProperties = {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    background: 'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
    border: 'none',
    color: '#1A1304',
    fontWeight: 800,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
};

const secondaryBtn: React.CSSProperties = {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
};

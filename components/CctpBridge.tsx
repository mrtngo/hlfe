'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, Loader2, AlertCircle } from 'lucide-react';
import ScreenHeader from '@/components/ScreenHeader';
import { CCTP_CHAINS, type CctpChainKey } from '@/lib/cctp/constants';
import { useCctpTransfer, type CctpStatus } from '@/hooks/useCctpTransfer';

interface CctpBridgeProps {
    onClose?: () => void;
    /** Which leg to start on. Base→Arbitrum is the on-ramp default. */
    defaultFrom?: CctpChainKey;
    /** Fired after a successful transfer that lands on Arbitrum (ready for an
     *  Hyperliquid deposit). Lets the caller chain into the deposit flow. */
    onArrivedOnArbitrum?: () => void;
}

const STEP_LABEL: Record<CctpStatus, string> = {
    idle: '',
    approving: 'Aprobando USDC…',
    burning: 'Enviando en origen…',
    attesting: 'Esperando atestación de Circle…',
    minting: 'Acreditando en destino…',
    success: 'Listo',
    error: 'Error',
};

const ORDER: CctpStatus[] = ['approving', 'burning', 'attesting', 'minting', 'success'];

export default function CctpBridge({ onClose, defaultFrom = 'base', onArrivedOnArbitrum }: CctpBridgeProps) {
    const [fromKey, setFromKey] = useState<CctpChainKey>(defaultFrom);
    const toKey: CctpChainKey = fromKey === 'base' ? 'arbitrum' : 'base';
    const [amount, setAmount] = useState('');

    const { status, inProgress, error, burnTxHash, mintTxHash, transfer, reset } = useCctpTransfer();

    const from = CCTP_CHAINS[fromKey];
    const to = CCTP_CHAINS[toKey];
    const amountNum = parseFloat(amount || '0') || 0;
    const canSubmit = amountNum > 0 && !inProgress;

    const swap = () => {
        if (inProgress) return;
        setFromKey(toKey);
        reset();
    };

    const handleType = (v: string) => {
        let c = v.replace(/[^0-9.]/g, '');
        const d = c.indexOf('.');
        if (d >= 0) c = c.slice(0, d + 1) + c.slice(d + 1).replace(/\./g, '');
        if (c.startsWith('.')) c = '0' + c;
        setAmount(c);
    };

    const currentStepIdx = useMemo(() => ORDER.indexOf(status), [status]);

    if (status === 'success') {
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
                        ¡USDC en {to.label}!
                    </div>
                    <div className="tabular-mono" style={{ marginTop: 8, fontSize: 14, color: '#fff' }}>
                        {amountNum.toLocaleString('en-US')} USDC · {from.label} → {to.label}
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {burnTxHash && (
                            <TxLink label={`Burn en ${from.label}`} href={from.explorer + burnTxHash} />
                        )}
                        {mintTxHash && (
                            <TxLink label={`Mint en ${to.label}`} href={to.explorer + mintTxHash} />
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                        <button type="button" onClick={reset} style={secondaryBtn}>
                            Otra transferencia
                        </button>
                        {toKey === 'arbitrum' && onArrivedOnArbitrum ? (
                            <button type="button" onClick={onArrivedOnArbitrum} style={primaryBtn}>
                                Depositar a Hyperliquid
                            </button>
                        ) : (
                            <button type="button" onClick={onClose} style={primaryBtn}>
                                Listo
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
            <ScreenHeader title="USDC nativo." onBack={onClose} large italic />

            <div style={{ padding: '4px 6px 0' }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 16px' }}>
                    Mueve USDC nativo entre {CCTP_CHAINS.base.label} y {CCTP_CHAINS.arbitrum.label} con Circle CCTP —
                    1:1, sin slippage, en segundos.
                </p>

                {/* From */}
                <ChainCard role="Desde" chainLabel={from.label}>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => handleType(e.target.value)}
                        placeholder="0"
                        disabled={inProgress}
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

                {/* Swap */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: '-6px 0' }}>
                    <button
                        type="button"
                        onClick={swap}
                        disabled={inProgress}
                        aria-label="Invertir"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'var(--color-bg-elevated)',
                            color: 'var(--color-brand-primary)',
                            cursor: inProgress ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2,
                        }}
                    >
                        <ArrowDown size={16} strokeWidth={2.4} />
                    </button>
                </div>

                {/* To */}
                <ChainCard role="Hacia" chainLabel={to.label}>
                    <span className="font-display tabular-mono" style={{ fontSize: 32, fontWeight: 500, color: amountNum > 0 ? '#fff' : 'rgba(255,255,255,0.25)' }}>
                        {amountNum > 0 ? `~${amountNum.toLocaleString('en-US')}` : '0'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 700 }}>USDC</span>
                </ChainCard>

                {/* Info */}
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <InfoRow label="Vía" value="Circle CCTP · USDC nativo" />
                    <InfoRow label="Tiempo" value="~segundos (Fast Transfer)" />
                    <InfoRow label="Comisión de red" value="hasta 0.1% (real ~0.01%)" />
                </div>

                {/* Progress */}
                {inProgress && (
                    <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.18)' }}>
                        {ORDER.slice(0, 4).map((s, i) => {
                            const active = status === s;
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
                {status === 'error' && error && (
                    <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', gap: 10 }}>
                        <AlertCircle size={16} color="var(--color-negative)" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{error}</span>
                    </div>
                )}

                {/* CTA */}
                <div style={{ padding: '18px 0 6px' }}>
                    <button
                        type="button"
                        onClick={() => transfer(fromKey, toKey, amount)}
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
                        {inProgress ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                {STEP_LABEL[status]}
                            </>
                        ) : (
                            <>
                                Transferir a {to.label}
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

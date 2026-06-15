'use client';

// Receive-address deposit screen — "pick a network, copy your address, send".
//
// The deposit address is the user's own Privy embedded wallet (same 0x address
// on every EVM chain; the embedded Solana wallet for Solana). While this screen
// is open we poll the USDC balance of that address on the selected chain and,
// the moment funds land (>= the per-network minimum), automatically sweep them
// to the Hyperliquid perps balance:
//
//   • EVM chains  → useCctpTransfer (burn → attest → mint → HL bridge), silent
//   • Solana      → useSolanaDeposit (same flow, Solana burn)  [beta]
//   • Arbitrum    → direct sponsored ERC20 transfer into the HL bridge
//
// All legs are gas-sponsored and sign silently (showWalletUIs: false), so from
// the user's POV: send USDC → balance appears. No second tap.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWallets, useSendTransaction } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { createPublicClient, http, formatUnits, type Hex } from 'viem';
import { mainnet, avalanche, optimism, arbitrum, base, polygon } from 'viem/chains';
import {
    CCTP_CHAINS,
    ERC20_ABI,
    USDC_DECIMALS,
    type CctpChainKey,
} from '@/lib/cctp/constants';
import { encodeTransfer } from '@/lib/cctp/client';
import { HYPERLIQUID_BRIDGE_ADDRESS } from '@/lib/constants/bridge';
import { makeSendOnChain } from '@/lib/cctp/evm-send';
import { useCctpTransfer } from '@/hooks/useCctpTransfer';
import { useSolanaDeposit } from '@/hooks/useSolanaDeposit';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { copyToClipboard } from '@/lib/clipboard';
import { haptic } from '@/lib/haptics';
import { ScreenV2, Icon, V2 } from '@/components/V2Kit';

// Same kill-switch as the manual bridge: Solana is on-chain-untested.
const SOLANA_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SOLANA_DEPOSIT !== '0';

const SOLANA_RPC =
    process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

type NetKey = CctpChainKey | 'solana';

interface Network {
    key: NetKey;
    label: string;
    /** Minimum deposit in USDC — below this we don't sweep. */
    min: number;
    /** /public logo path; null renders the inline Base mark. */
    logo: string | null;
    beta?: boolean;
}

const NETWORKS: Network[] = [
    { key: 'arbitrum', label: 'Arbitrum One', min: 10, logo: '/logos/ARB.svg' },
    { key: 'base', label: 'Base', min: 10, logo: null },
    ...(SOLANA_ENABLED
        ? [{ key: 'solana' as const, label: 'Solana', min: 10, logo: '/logos/SOL.svg', beta: true }]
        : []),
    // Mainnet gas (sponsored by us) is expensive — higher minimum.
    { key: 'ethereum', label: 'Ethereum', min: 50, logo: '/logos/ETH.svg' },
    { key: 'optimism', label: 'Optimism', min: 10, logo: '/logos/OP.svg' },
    { key: 'polygon', label: 'Polygon', min: 10, logo: '/logos/MATIC.svg' },
    { key: 'avalanche', label: 'Avalanche', min: 10, logo: '/logos/AVAX.svg' },
];

const VIEM_CHAINS = {
    ethereum: mainnet,
    avalanche,
    optimism,
    arbitrum,
    base,
    polygon,
} as const;

const STEP_LABEL: Record<string, string> = {
    approving: 'Preparando…',
    building: 'Preparando…',
    burning: 'Enviando a Hyperliquid…',
    attesting: 'Confirmando con Circle…',
    minting: 'Recibiendo en Arbitrum…',
    depositing: 'Acreditando a tu balance…',
};

const EVM_ORDER = ['approving', 'burning', 'attesting', 'minting', 'depositing'];
const SOL_ORDER = ['building', 'burning', 'attesting', 'minting', 'depositing'];
const ARB_ORDER = ['depositing'];

interface DepositScreenProps {
    onBack?: () => void;
    /** Fired from the success state ("Empezar a operar"). */
    onDone?: () => void;
}

export default function DepositScreen({ onBack, onDone }: DepositScreenProps) {
    const { wallets: evmWallets } = useWallets();
    const { wallets: solWallets } = useSolanaWallets();
    const { sendTransaction } = useSendTransaction();
    const { refreshAccountData } = useHyperliquid();

    const evm = useCctpTransfer();
    const sol = useSolanaDeposit();

    const [net, setNet] = useState<Network | null>(null);
    const [copied, setCopied] = useState(false);
    const [detected, setDetected] = useState<bigint>(BigInt(0));
    const [baseline, setBaseline] = useState<bigint | null>(null);
    const [sweepAmount, setSweepAmount] = useState('');

    // Direct Arbitrum → HL bridge forward (no CCTP needed).
    const [arbStatus, setArbStatus] = useState<'idle' | 'depositing' | 'success' | 'error'>('idle');
    const [arbError, setArbError] = useState('');
    const baselineRef = useRef<bigint | null>(null);

    const evmWallet =
        evmWallets.find((w) => w.walletClientType === 'privy') ?? evmWallets?.[0];
    const evmAddress = evmWallet?.address;
    const solAddress = solWallets?.[0]?.address;
    const depositAddress = net?.key === 'solana' ? solAddress : evmAddress;

    // Normalize whichever flow applies so the render is agnostic.
    const flow = useMemo(() => {
        if (net?.key === 'solana') {
            return {
                status: sol.status as string,
                inProgress: sol.inProgress,
                error: sol.error,
                order: SOL_ORDER,
            };
        }
        if (net?.key === 'arbitrum') {
            return {
                status: arbStatus as string,
                inProgress: arbStatus === 'depositing',
                error: arbError,
                order: ARB_ORDER,
            };
        }
        return {
            status: evm.status as string,
            inProgress: evm.inProgress,
            error: evm.error,
            order: EVM_ORDER,
        };
    }, [net?.key, sol.status, sol.inProgress, sol.error, arbStatus, arbError, evm.status, evm.inProgress, evm.error]);

    const resetFlows = useCallback(() => {
        evm.reset();
        sol.reset();
        setArbStatus('idle');
        setArbError('');
        setSweepAmount('');
        setDetected(BigInt(0));
        setBaseline(null);
        baselineRef.current = null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [evm.reset, sol.reset]);

    const runSweep = useCallback(
        async (balance: bigint) => {
            if (!net) return;
            const amountStr = formatUnits(balance, USDC_DECIMALS);
            setSweepAmount(amountStr);

            if (net.key === 'solana') {
                sol.deposit(amountStr);
                return;
            }
            if (net.key === 'arbitrum') {
                setArbStatus('depositing');
                setArbError('');
                try {
                    const sendOnChain = makeSendOnChain(evmWallet as never, sendTransaction as never);
                    await sendOnChain(CCTP_CHAINS.arbitrum.chainId, {
                        to: CCTP_CHAINS.arbitrum.usdc,
                        data: encodeTransfer(HYPERLIQUID_BRIDGE_ADDRESS, balance),
                        value: BigInt(0),
                    });
                    setArbStatus('success');
                } catch (e) {
                    setArbError(e instanceof Error ? e.message : 'No pudimos acreditar el depósito');
                    setArbStatus('error');
                }
                return;
            }
            evm.transfer(net.key, 'arbitrum', amountStr, { autoDeposit: true, movementKind: 'deposit' });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [net, sol.deposit, evm.transfer, sendTransaction, evmWallet],
    );

    // ── Balance watcher — polls the deposit address on the selected chain ───
    useEffect(() => {
        if (!net || !depositAddress) return;
        if (flow.inProgress || flow.status === 'success' || flow.status === 'error') return;

        let cancelled = false;

        const readBalance = async (): Promise<bigint> => {
            if (net.key === 'solana') {
                const [{ Connection, PublicKey }, { getAssociatedTokenAddressSync }, { SOLANA_USDC_MINT }] =
                    await Promise.all([
                        import('@solana/web3.js'),
                        import('@solana/spl-token'),
                        import('@/lib/cctp/solana'),
                    ]);
                const conn = new Connection(SOLANA_RPC, 'confirmed');
                const ata = getAssociatedTokenAddressSync(
                    SOLANA_USDC_MINT,
                    new PublicKey(depositAddress),
                    true,
                );
                const bal = await conn.getTokenAccountBalance(ata);
                return BigInt(bal.value.amount);
            }
            const chain = CCTP_CHAINS[net.key];
            const pub = createPublicClient({
                chain: VIEM_CHAINS[net.key],
                transport: http(),
            });
            return (await pub.readContract({
                address: chain.usdc,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [depositAddress as Hex],
            })) as bigint;
        };

        const tick = async () => {
            try {
                const bal = await readBalance();
                if (cancelled) return;
                if (baselineRef.current === null) {
                    baselineRef.current = bal;
                    setBaseline(bal);
                    setDetected(BigInt(0));
                    return;
                }
                if (bal < baselineRef.current) {
                    baselineRef.current = bal;
                    setBaseline(bal);
                    setDetected(BigInt(0));
                    return;
                }
                setDetected(bal - baselineRef.current);
            } catch {
                /* no ATA yet / transient RPC error — keep watching */
            }
        };

        tick();
        const id = setInterval(tick, 6000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [net, depositAddress, flow.inProgress, flow.status]);

    // Refresh the HL balance once the sweep lands.
    useEffect(() => {
        if (flow.status === 'success') {
            haptic.success();
            const t = setTimeout(() => refreshAccountData(), 500);
            return () => clearTimeout(t);
        }
        if (flow.status === 'error') haptic.error();
    }, [flow.status, refreshAccountData]);

    const handleCopy = async () => {
        if (!depositAddress) return;
        const ok = await copyToClipboard(depositAddress);
        if (ok) {
            haptic.light();
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const pickNetwork = (n: Network) => {
        haptic.light();
        resetFlows();
        setNet(n);
    };

    const detectedNum = Number(formatUnits(detected, USDC_DECIMALS));
    const baselineNum = Number(formatUnits(baseline ?? BigInt(0), USDC_DECIMALS));
    const minUnitsForNet = net ? BigInt(net.min) * BigInt(10 ** USDC_DECIMALS) : BigInt(0);
    const canCreditDetected = net ? detected >= minUnitsForNet : false;
    const pendingEvmDeposit = evm.pending?.autoDeposit ? evm.pending : null;
    const pendingSolanaDeposit = sol.pending;
    const pendingDepositAmount = pendingSolanaDeposit?.amountStr || pendingEvmDeposit?.amountStr || '';

    const resumePending = () => {
        haptic.medium();
        if (pendingSolanaDeposit) {
            const solNet = NETWORKS.find((n) => n.key === 'solana');
            if (solNet) setNet(solNet);
            void sol.resumePendingDeposit();
            return;
        }
        if (pendingEvmDeposit) {
            const pendingNet = NETWORKS.find((n) => n.key === pendingEvmDeposit.fromKey);
            if (pendingNet) setNet(pendingNet);
            void evm.resumePendingTransfer();
        }
    };

    // ════════════════════════════════════════════════════════════════════════
    // Stage A — network list
    // ════════════════════════════════════════════════════════════════════════
    if (!net) {
        return (
            <ScreenV2 pad={0} glow={false}>
                <div style={{ padding: '54px 18px 0' }}>
                    <button onClick={onBack} style={circleBtn} aria-label="Volver">
                        <Icon name="chevronLeft" size={18} color={V2.t1} />
                    </button>
                </div>
                <div style={{ padding: '18px 20px 30px' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>
                        Elegí la red
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, fontSize: 15, color: V2.t2 }}>
                        Vas a enviar <UsdcPill /> por
                    </div>

                    {(pendingEvmDeposit || pendingSolanaDeposit) && (
                        <button
                            onClick={resumePending}
                            style={{
                                marginTop: 18,
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: 16,
                                background: V2.accentSoft,
                                border: `1px solid ${V2.accent}`,
                                color: V2.t1,
                                cursor: 'pointer',
                                fontFamily: V2.ui,
                                textAlign: 'left',
                            }}
                        >
                            <div style={{ fontSize: 14, fontWeight: 800, color: V2.accent }}>
                                Reanudar depósito pendiente
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12.5, color: V2.t2, lineHeight: 1.45 }}>
                                {pendingDepositAmount
                                    ? `Hay ${Number(pendingDepositAmount).toLocaleString('en-US', { maximumFractionDigits: 6 })} USDC en proceso.`
                                    : 'Hay un depósito CCTP pendiente.'}
                            </div>
                        </button>
                    )}

                    <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {NETWORKS.map((n) => (
                            <button
                                key={n.key}
                                onClick={() => pickNetwork(n)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    padding: '16px 16px', borderRadius: 16, cursor: 'pointer',
                                    background: V2.card, border: `1px solid ${V2.hair}`,
                                    fontFamily: V2.ui, textAlign: 'left', width: '100%',
                                }}
                            >
                                <NetworkLogo net={n} size={38} />
                                <span style={{ fontSize: 16.5, fontWeight: 700, color: V2.t1, flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {n.label}
                                    {n.beta && (
                                        <span style={{ fontSize: 10, fontWeight: 800, color: V2.accent, background: V2.accentSoft, padding: '2px 7px', borderRadius: 99, letterSpacing: '0.04em' }}>
                                            BETA
                                        </span>
                                    )}
                                </span>
                                <span style={{ fontSize: 14, color: V2.t3, fontFamily: V2.mono }}>
                                    Mín. ${n.min}
                                </span>
                                <Icon name="chevronRight" size={16} color={V2.t3} />
                            </button>
                        ))}
                    </div>

                    <div style={{ marginTop: 18, fontSize: 12.5, color: V2.t3, lineHeight: 1.5, textAlign: 'center' }}>
                        Te avisamos cuando detectemos fondos nuevos para acreditarlos a tu balance.
                    </div>
                </div>
            </ScreenV2>
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    // Stage B — address + auto-credit watcher
    // ════════════════════════════════════════════════════════════════════════
    const chunked = depositAddress ? (depositAddress.match(/.{1,4}/g) || []).join(' ') : '';
    const success = flow.status === 'success';

    return (
        <ScreenV2 pad={0} glow={false}>
            <div style={{ padding: '54px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={() => { resetFlows(); setNet(null); }} style={circleBtn} aria-label="Volver">
                    <Icon name="chevronLeft" size={18} color={V2.t1} />
                </button>
            </div>

            <div style={{ padding: '14px 20px 30px' }}>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>
                    Agregar dinero
                </div>

                {/* Token + network pills */}
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                    <div style={pill}>
                        <UsdcMark size={22} />
                        <span style={{ fontSize: 15, fontWeight: 700 }}>USDC</span>
                    </div>
                    <button onClick={() => { resetFlows(); setNet(null); }} style={{ ...pill, cursor: 'pointer', border: `1px solid ${V2.hair2}` }}>
                        <NetworkLogo net={net} size={22} />
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{net.label}</span>
                        <Icon name="chevronDown" size={14} color={V2.t3} />
                    </button>
                </div>

                {!depositAddress ? (
                    <div style={{ marginTop: 40, textAlign: 'center', color: V2.t2, fontSize: 14 }}>
                        Iniciá sesión para ver tu dirección de depósito.
                    </div>
                ) : success ? (
                    /* ── Success ── */
                    <div style={{ marginTop: 36, textAlign: 'center' }}>
                        <div
                            style={{
                                width: 84, height: 84, margin: '0 auto 18px', borderRadius: '50%',
                                background: 'radial-gradient(circle at 30% 30%, rgba(34,197,94,0.35), rgba(34,197,94,0.06))',
                                border: '1px solid rgba(34,197,94,0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 40px -8px rgba(34,197,94,0.5)',
                            }}
                        >
                            <Icon name="bolt" size={36} color={V2.pos} />
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>
                            ¡Dinero acreditado!
                        </div>
                        <div style={{ marginTop: 8, fontSize: 16, color: V2.t2, fontFamily: V2.mono }}>
                            +${Number(sweepAmount || '0').toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                            <button onClick={resetFlows} style={secondaryBtn}>Depositar más</button>
                            <button onClick={onDone} style={primaryBtn}>Empezar a operar</button>
                        </div>
                    </div>
                ) : flow.inProgress ? (
                    /* ── Crediting in progress ── */
                    <div style={{ marginTop: 30 }}>
                        <div style={{ textAlign: 'center', marginBottom: 18 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: V2.pos }}>
                                Detectamos tu envío
                            </div>
                            <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800, fontFamily: V2.mono, letterSpacing: '-0.02em' }}>
                                ${Number(sweepAmount || '0').toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div style={{ padding: 16, borderRadius: 16, background: V2.card, border: `1px solid ${V2.hair}` }}>
                            {flow.order.map((s, i) => {
                                const idx = flow.order.indexOf(flow.status);
                                const active = flow.status === s;
                                const done = idx > i;
                                return (
                                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                                        {done ? (
                                            <Icon name="bolt" size={13} color={V2.pos} />
                                        ) : active ? (
                                            <div className="spinner" style={{ width: 13, height: 13, borderWidth: 2, borderTopColor: V2.accent }} />
                                        ) : (
                                            <div style={{ width: 13, height: 13, borderRadius: '50%', border: `1px solid ${V2.hair2}` }} />
                                        )}
                                        <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? V2.t1 : done ? V2.t2 : V2.t3 }}>
                                            {STEP_LABEL[s]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ marginTop: 12, fontSize: 12, color: V2.t3, textAlign: 'center' }}>
                            No cierres la app — tarda menos de un minuto.
                        </div>
                    </div>
                ) : (
                    /* ── Waiting for funds ── */
                    <>
                        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 14, color: V2.t2 }}>
                            Mínimo <span style={{ fontFamily: V2.mono, fontWeight: 700, color: V2.t1 }}>${net.min}</span>
                        </div>

                        <div
                            style={{
                                marginTop: 22, fontSize: 21, fontWeight: 700, fontFamily: V2.mono,
                                lineHeight: 1.7, letterSpacing: '0.02em', textAlign: 'center',
                                wordBreak: 'break-word', padding: '0 6px', color: V2.t1,
                            }}
                        >
                            {chunked}
                        </div>

                        <div style={{ marginTop: 20, fontSize: 13.5, color: V2.t2, textAlign: 'center', lineHeight: 1.55, padding: '0 14px' }}>
                            Enviá solo <b style={{ color: V2.t1 }}>USDC en {net.label}</b> a esta
                            dirección desde tu exchange o billetera.
                        </div>

                        {/* Watcher status */}
                        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
                                <span className="animate-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: V2.accent, opacity: 0.6 }} />
                                <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: V2.accent }} />
                            </span>
                            <span style={{ fontSize: 12.5, color: V2.t3, fontWeight: 600 }}>
                                {canCreditDetected
                                    ? `Detectamos $${detectedNum.toLocaleString('en-US', { maximumFractionDigits: 2 })} nuevos`
                                    : detected > BigInt(0) && detectedNum < net.min
                                    ? `Detectamos $${detectedNum.toLocaleString('en-US', { maximumFractionDigits: 2 })} — el mínimo es $${net.min}`
                                    : baseline && baselineNum > 0
                                      ? 'Esperando fondos nuevos'
                                      : 'Esperando tu envío'}
                            </span>
                        </div>

                        {canCreditDetected && (
                            <button
                                onClick={() => runSweep(detected)}
                                style={{
                                    marginTop: 16,
                                    width: '100%',
                                    padding: 16,
                                    borderRadius: 16,
                                    border: 'none',
                                    background: V2.accent,
                                    color: V2.accentInk,
                                    fontWeight: 800,
                                    fontSize: 15,
                                    cursor: 'pointer',
                                    fontFamily: V2.ui,
                                }}
                            >
                                Acreditar ${detectedNum.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC
                            </button>
                        )}

                        {flow.status === 'error' && (
                            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: V2.negSoft, border: '1px solid rgba(239,68,68,0.2)' }}>
                                <div style={{ fontSize: 12.5, color: V2.t1, lineHeight: 1.5 }}>{flow.error}</div>
                                <button
                                    onClick={resetFlows}
                                    style={{ marginTop: 10, width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.08)', color: V2.t1, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: V2.ui }}
                                >
                                    Reintentar
                                </button>
                            </div>
                        )}

                        {/* Copy CTA */}
                        <button
                            onClick={handleCopy}
                            style={{
                                marginTop: 26, width: '100%', padding: 17, borderRadius: 18, border: 'none',
                                background: copied ? V2.pos : V2.accent, color: copied ? '#06130A' : V2.accentInk,
                                fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: V2.ui,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                transition: 'background 0.2s',
                            }}
                        >
                            <Icon name="copy" size={17} color={copied ? '#06130A' : V2.accentInk} strokeWidth={2.4} />
                            {copied ? 'Dirección copiada' : 'Copiar dirección'}
                        </button>
                    </>
                )}
            </div>
        </ScreenV2>
    );
}

// ── Bits ────────────────────────────────────────────────────────────────────

function NetworkLogo({ net, size = 38 }: { net: Network; size?: number }) {
    if (net.logo) {
        return (
            <img
                src={net.logo}
                alt={net.label}
                width={size}
                height={size}
                style={{ borderRadius: '50%', flexShrink: 0 }}
            />
        );
    }
    // Base — solid blue circle with the white bar mark.
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" style={{ flexShrink: 0 }} aria-hidden>
            <circle cx="16" cy="16" r="16" fill="#0052FF" />
            <path d="M16 28c6.627 0 12-5.373 12-12S22.627 4 16 4 4 9.373 4 16c0 .337.014.67.041 1h15.917v-2H4.04A12.004 12.004 0 0 1 16 4v24z" fill="#fff" opacity="0" />
            <rect x="7" y="14.6" width="13" height="2.8" rx="1.4" fill="#fff" />
        </svg>
    );
}

function UsdcMark({ size = 22 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden style={{ flexShrink: 0 }}>
            <circle cx="16" cy="16" r="16" fill="#2775CA" />
            <text x="16" y="21.5" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">$</text>
        </svg>
    );
}

function UsdcPill() {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: V2.card, border: `1px solid ${V2.hair}` }}>
            <UsdcMark size={17} />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: V2.t1 }}>USDC</span>
        </span>
    );
}

const circleBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

const pill: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 99,
    background: V2.card, border: `1px solid ${V2.hair}`, color: V2.t1, fontFamily: V2.ui,
};

const primaryBtn: React.CSSProperties = {
    flex: 1, padding: 15, borderRadius: 16, border: 'none', background: V2.accent,
    color: V2.accentInk, fontWeight: 800, fontSize: 14.5, cursor: 'pointer', fontFamily: V2.ui,
};

const secondaryBtn: React.CSSProperties = {
    flex: 1, padding: 15, borderRadius: 16, border: `1px solid ${V2.hair2}`,
    background: 'rgba(255,255,255,0.04)', color: V2.t1, fontWeight: 700, fontSize: 14.5,
    cursor: 'pointer', fontFamily: V2.ui,
};

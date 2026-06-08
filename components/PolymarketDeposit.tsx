'use client';

import React, { useState, useEffect } from 'react';
import { usePolymarket } from '@/hooks/usePolymarket';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useWallets, useSendTransaction } from '@privy-io/react-auth';
import {
    Copy, Check, ExternalLink, Loader2, AlertCircle,
    ArrowDown, RefreshCw, Info, ChevronRight,
} from 'lucide-react';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { arbitrum, mainnet, polygon, base, optimism } from 'viem/chains';
import { USDC_ADDRESSES, USDC_ABI } from '@/lib/constants/bridge';
import { apiUrl } from '@/lib/api-base';

const BRIDGE_CHAINS = {
    ethereum: mainnet,
    base: base,
    optimism: optimism,
    arbitrum: arbitrum,
} as const;

type BridgeChainKey = keyof typeof BRIDGE_CHAINS;

const CHAIN_NAME_MAP: Record<BridgeChainKey, string> = {
    ethereum: 'ETHEREUM',
    base: 'BASE',
    optimism: 'OPTIMISM',
    arbitrum: 'ARBITRUM',
};

const CHAIN_OPTIONS: { key: BridgeChainKey; name: string; logo: string }[] = [
    { key: 'arbitrum', name: 'Arbitrum', logo: '🔵' },
    { key: 'ethereum', name: 'Ethereum', logo: '⬡' },
    { key: 'base', name: 'Base', logo: '🔷' },
    { key: 'optimism', name: 'Optimism', logo: '🔴' },
];

type DepositTab = 'transfer' | 'bridge';
type BridgeStep = 'input' | 'confirming' | 'bridging' | 'success' | 'error';

export default function PolymarketDeposit() {
    const { t, formatNumber } = useLanguage();
    const { address, proxyWalletAddress, eoaUsdcBalance, accountState, depositToPolymarket } = usePolymarket();
    const { account } = useHyperliquid();
    const [activeTab, setActiveTab] = useState<DepositTab>('transfer');

    if (!address) {
        return (
            <div
                className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}
            >
                <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                    {t.polymarket?.connectToViewPositions || 'Connect wallet to deposit'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Wallet overview */}
            <WalletOverview
                eoaUsdcBalance={eoaUsdcBalance}
                polymarketBalance={accountState.usdcBalance}
                hlEquity={account.equity}
                formatNumber={formatNumber}
                t={t}
            />

            {/* Tabs */}
            <div
                className="flex rounded-xl p-1 gap-1"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
                {(['transfer', 'bridge'] as const).map(tab => {
                    const label = tab === 'transfer'
                        ? (t.polymarket?.transferTab || 'Polygon → Polymarket')
                        : (t.polymarket?.bridgeTab || 'Bridge → Polygon');
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                            style={{
                                backgroundColor: activeTab === tab ? 'var(--color-bg-elevated)' : 'transparent',
                                color: activeTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                                boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'transfer' ? (
                <TransferToProxy
                    proxyWalletAddress={proxyWalletAddress}
                    eoaUsdcBalance={eoaUsdcBalance}
                    proxyBalance={accountState.usdcBalance}
                    depositToPolymarket={depositToPolymarket}
                    formatNumber={formatNumber}
                    t={t}
                />
            ) : (
                <BridgeToPolygon address={address} t={t} />
            )}
        </div>
    );
}

// ─── Wallet Overview ───────────────────────────────────────────────────────────
function WalletOverview({
    eoaUsdcBalance,
    polymarketBalance,
    hlEquity,
    formatNumber,
    t,
}: {
    eoaUsdcBalance: number;
    polymarketBalance: number;
    hlEquity: number;
    formatNumber: (n: number, d: number) => string;
    t: any;
}) {
    const pockets = [
        { label: t.polymarket?.pocketPolygon || 'Polygon USDC.e', value: eoaUsdcBalance, dot: '#8247E5' },
        { label: t.polymarket?.pocketPolymarket || 'Polymarket', value: polymarketBalance, dot: '#00D395' },
        { label: t.polymarket?.pocketHlPerp || 'HL Perp', value: hlEquity, dot: 'var(--color-brand-primary)' },
    ];
    const total = pockets.reduce((s, p) => s + p.value, 0);

    return (
        <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}
        >
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
                    {t.polymarket?.pocketsTitle || 'Balances'}
                </p>
                <span className="text-base font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    ${formatNumber(total, 2)}
                </span>
            </div>

            <div className="space-y-2.5">
                {pockets.map(({ label, value, dot }) => (
                    <div key={label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                        </div>
                        <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            ${formatNumber(value, 2)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Transfer Polygon → Proxy ──────────────────────────────────────────────────
function TransferToProxy({
    proxyWalletAddress,
    eoaUsdcBalance,
    proxyBalance,
    depositToPolymarket,
    formatNumber,
    t,
}: {
    proxyWalletAddress: string | null;
    eoaUsdcBalance: number;
    proxyBalance: number;
    depositToPolymarket: (amount: string) => Promise<{ success: boolean; message: string; txHash?: string }>;
    formatNumber: (n: number, d: number) => string;
    t: any;
}) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successTx, setSuccessTx] = useState('');
    const [copied, setCopied] = useState(false);

    const amountNum = parseFloat(amount || '0');
    const isValid = amountNum > 0 && amountNum <= eoaUsdcBalance;

    const handleCopy = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDeposit = async () => {
        if (!isValid) return;
        setLoading(true); setError(''); setSuccessTx('');
        const result = await depositToPolymarket(amount);
        if (result.success) { setSuccessTx(result.txHash || 'success'); setAmount(''); }
        else setError(result.message);
        setLoading(false);
    };

    return (
        <div className="space-y-3">
            {/* Info banner */}
            <div
                className="rounded-xl px-3 py-2.5 flex items-start gap-2"
                style={{ backgroundColor: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.18)' }}
            >
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-brand-primary)' }} />
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {t.polymarket?.depositInfo || 'Transfer USDC.e from your Polygon wallet to your Polymarket trading wallet.'}
                </p>
            </div>

            {/* Flow: from → to */}
            <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--color-border-subtle)' }}
            >
                <div className="flex items-center justify-between px-3 py-2.5" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                    <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Polygon USDC.e</span>
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        ${formatNumber(eoaUsdcBalance, 2)}
                    </span>
                </div>
                <div className="flex items-center justify-center py-1" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                    <ArrowDown className="w-3 h-3" style={{ color: 'var(--color-text-tertiary)' }} />
                </div>
                <div className="flex items-center justify-between px-3 py-2.5" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                    <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Polymarket</span>
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        ${formatNumber(proxyBalance, 2)}
                    </span>
                </div>
            </div>

            {/* Amount input */}
            <div>
                <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>Amount</label>
                    <span
                        className="text-[11px] font-mono cursor-pointer"
                        style={{ color: 'var(--color-brand-primary)' }}
                        onClick={() => eoaUsdcBalance > 0 && setAmount(eoaUsdcBalance.toFixed(2))}
                    >
                        Max: ${formatNumber(eoaUsdcBalance, 2)}
                    </span>
                </div>
                <div
                    className="flex items-center rounded-xl overflow-hidden"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-default)' }}
                >
                    <input
                        type="number"
                        value={amount}
                        onChange={e => { setAmount(e.target.value); setError(''); setSuccessTx(''); }}
                        placeholder="0.00"
                        className="flex-1 px-4 py-3 text-base font-mono outline-none bg-transparent"
                        style={{ color: 'var(--color-text-primary)' }}
                    />
                    <span className="pr-4 text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>USDC.e</span>
                </div>

                {/* Percentage quick-selects */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[0.25, 0.5, 0.75, 1].map(pct => (
                        <button
                            key={pct}
                            onClick={() => setAmount((eoaUsdcBalance * pct).toFixed(2))}
                            className="py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{
                                backgroundColor: 'var(--color-bg-elevated)',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border-subtle)',
                            }}
                        >
                            {pct === 1 ? 'MAX' : `${pct * 100}%`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Deposit button */}
            <button
                onClick={handleDeposit}
                disabled={loading || !isValid}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                    backgroundColor: isValid && !loading ? 'var(--color-brand-primary)' : 'var(--color-bg-hover)',
                    color: isValid && !loading ? 'var(--color-text-on-brand)' : 'var(--color-text-tertiary)',
                    cursor: (loading || !isValid) ? 'not-allowed' : 'pointer',
                }}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t.polymarket?.depositing || 'Depositando...'}
                    </>
                ) : (
                    t.polymarket?.depositToPolymarket || 'Depositar en Polymarket'
                )}
            </button>

            {/* Error */}
            {error && (
                <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-negative)' }}
                >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Success */}
            {successTx && (
                <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs"
                    style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'var(--color-positive)' }}
                >
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{t.polymarket?.depositSuccess || '¡Depósito exitoso!'}</span>
                    {successTx !== 'success' && (
                        <a href={`https://polygonscan.com/tx/${successTx}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>
            )}

            {/* Proxy address */}
            {proxyWalletAddress && (
                <div
                    className="rounded-xl p-3"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}
                >
                    <p className="text-[11px] mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                        {t.polymarket?.externalDeposit || 'También puedes enviar directamente a tu billetera de trading:'}
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="text-[11px] font-mono flex-1 truncate" style={{ color: 'var(--color-brand-primary)' }}>
                            {proxyWalletAddress}
                        </code>
                        <button
                            onClick={() => handleCopy(proxyWalletAddress)}
                            className="p-1 rounded-md transition-colors"
                            style={{ color: 'var(--color-text-tertiary)' }}
                        >
                            {copied
                                ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-positive)' }} />
                                : <Copy className="w-3.5 h-3.5" />
                            }
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Bridge to Polygon ─────────────────────────────────────────────────────────
function BridgeToPolygon({ address, t }: { address: string; t: any }) {
    const { wallets } = useWallets();
    const { sendTransaction } = useSendTransaction();
    const activeWallet = wallets?.[0];

    const [fromChain, setFromChain] = useState<BridgeChainKey>('arbitrum');
    const [amount, setAmount] = useState('');
    const [step, setStep] = useState<BridgeStep>('input');
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState('');
    const [fromBalance, setFromBalance] = useState<string | null>(null);
    const [loadingBalance, setLoadingBalance] = useState(false);

    useEffect(() => {
        if (!activeWallet?.address) return;
        let cancelled = false;
        const fetch = async () => {
            setLoadingBalance(true);
            try {
                const client = createPublicClient({ chain: BRIDGE_CHAINS[fromChain], transport: http() });
                const bal = await client.readContract({
                    address: USDC_ADDRESSES[fromChain] as Address,
                    abi: USDC_ABI,
                    functionName: 'balanceOf',
                    args: [activeWallet.address as Address],
                });
                if (!cancelled) setFromBalance(formatUnits(bal as bigint, 6));
            } catch { /* ignore */ }
            finally { if (!cancelled) setLoadingBalance(false); }
        };
        fetch();
        const iv = setInterval(fetch, 30000);
        return () => { cancelled = true; clearInterval(iv); };
    }, [activeWallet?.address, fromChain]);

    const handleBridge = async () => {
        if (!activeWallet || !amount) return;
        setStep('confirming'); setError('');
        try {
            await activeWallet.switchChain(BRIDGE_CHAINS[fromChain].id);
            setStep('bridging');
            const res = await fetch(apiUrl('/api/bridge/execute'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromChain: CHAIN_NAME_MAP[fromChain],
                    toChain: 'MATIC_POS',
                    token: 'USDC',
                    amount,
                    depositor: activeWallet.address,
                    recipient: activeWallet.address,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to prepare bridge');
            const data = await res.json();
            const chainId = BRIDGE_CHAINS[fromChain].id;
            if (data.approval) {
                try {
                    await sendTransaction({ to: data.approval.to, data: data.approval.data, value: BigInt(0), chainId }, { sponsor: true });
                    await new Promise(r => setTimeout(r, 3000));
                } catch { /* approval may already exist */ }
            }
            if (data.transaction) {
                const result = await sendTransaction({
                    to: data.transaction.to,
                    data: data.transaction.data,
                    value: data.transaction.value ? BigInt(data.transaction.value) : BigInt(0),
                    chainId,
                }, { sponsor: true });
                setTxHash(result.hash || '');
            } else {
                setTxHash(data.depositTxHash || '');
            }
            setStep('success');
        } catch (err: any) {
            setError(err.message || 'Failed to bridge funds');
            setStep('error');
        }
    };

    if (step === 'success') return (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
                <Check className="w-7 h-7" style={{ color: 'var(--color-positive)' }} />
            </div>
            <div>
                <p className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {t.bridge?.bridgeInitiated || 'Bridge Initiated!'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {t.polymarket?.bridgeToPolygonSuccess || 'USDC is on its way to Polygon (~1–3 min).'}
                </p>
            </div>
            {txHash && (
                <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-brand-primary)' }}
                >
                    Ver transacción <ExternalLink className="w-3 h-3" />
                </a>
            )}
            <button
                onClick={() => { setStep('input'); setAmount(''); setTxHash(''); }}
                className="w-full py-3 rounded-xl text-sm font-bold"
                style={{ backgroundColor: 'var(--color-brand-primary)', color: 'var(--color-text-on-brand)' }}
            >
                {t.bridge?.bridgeMoreFunds || 'Bridge More'}
            </button>
        </div>
    );

    if (step === 'error') return (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
                <AlertCircle className="w-7 h-7" style={{ color: 'var(--color-negative)' }} />
            </div>
            <div>
                <p className="text-base font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    {t.bridge?.bridgeFailed || 'Bridge Failed'}
                </p>
                <p className="text-xs px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--color-negative)' }}>
                    {error}
                </p>
            </div>
            <button
                onClick={() => { setStep('input'); setError(''); }}
                className="w-full py-3 rounded-xl text-sm font-bold"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-default)' }}
            >
                {t.bridge?.tryAgain || 'Try Again'}
            </button>
        </div>
    );

    if (step === 'bridging' || step === 'confirming') return (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
            <div>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {step === 'confirming' ? (t.bridge?.switchingNetwork || 'Switching network...') : (t.bridge?.bridgingFunds || 'Bridging funds...')}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {step === 'confirming' ? (t.bridge?.confirmNetworkSwitch || 'Confirm in your wallet') : (t.bridge?.confirmTransaction || 'Confirm the transaction')}
                </p>
            </div>
        </div>
    );

    return (
        <div className="space-y-3">
            {/* Info banner */}
            <div
                className="rounded-xl px-3 py-2.5 flex items-start gap-2"
                style={{ backgroundColor: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}
            >
                <RefreshCw className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#8b5cf6' }} />
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {t.polymarket?.bridgeInfo || 'Bridge USDC from other chains to Polygon, then transfer to your Polymarket trading wallet.'}
                </p>
            </div>

            {/* Source chain */}
            <div>
                <p className="text-[11px] mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                    {t.bridge?.fromChain || 'From chain'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {CHAIN_OPTIONS.map(chain => (
                        <button
                            key={chain.key}
                            onClick={() => setFromChain(chain.key)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                            style={{
                                backgroundColor: fromChain === chain.key ? 'var(--color-brand-primary-muted)' : 'var(--color-bg-tertiary)',
                                color: fromChain === chain.key ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                                border: `1px solid ${fromChain === chain.key ? 'var(--color-brand-primary)' : 'var(--color-border-subtle)'}`,
                            }}
                        >
                            <span>{chain.logo}</span>
                            {chain.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
                <ArrowDown className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
            </div>

            {/* Destination */}
            <div
                className="flex justify-between items-center px-3 py-2.5 rounded-xl text-xs"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)' }}
            >
                <span style={{ color: 'var(--color-text-tertiary)' }}>Polygon (USDC.e)</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>{t.polymarket?.yourWallet || 'Tu Billetera'}</span>
            </div>

            {/* Amount */}
            <div>
                <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                        {t.bridge?.amountUsdc || 'Amount (USDC)'}
                    </label>
                    <span
                        className="text-[11px] font-mono cursor-pointer"
                        style={{ color: 'var(--color-brand-primary)' }}
                        onClick={() => fromBalance && setAmount(fromBalance)}
                    >
                        {loadingBalance ? '...' : fromBalance ? `${parseFloat(fromBalance).toFixed(2)} USDC` : '0.00 USDC'}
                    </span>
                </div>
                <div
                    className="flex items-center rounded-xl overflow-hidden"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-default)' }}
                >
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 px-4 py-3 text-base font-mono outline-none bg-transparent"
                        style={{ color: 'var(--color-text-primary)' }}
                    />
                    <span className="pr-4 text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>USDC</span>
                </div>
            </div>

            {/* Bridge button */}
            <button
                onClick={handleBridge}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                    backgroundColor: amount && parseFloat(amount) > 0 ? 'var(--color-brand-primary)' : 'var(--color-bg-hover)',
                    color: amount && parseFloat(amount) > 0 ? 'var(--color-text-on-brand)' : 'var(--color-text-tertiary)',
                    cursor: (!amount || parseFloat(amount) <= 0) ? 'not-allowed' : 'pointer',
                }}
            >
                {t.polymarket?.bridgeToPolygon || 'Bridge a Polygon'}
                <ChevronRight className="w-4 h-4" />
            </button>

            {/* Note */}
            <p className="text-[11px] text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                {t.polymarket?.bridgeNote || 'After bridging, go to "Polygon → Polymarket" tab. Bridge takes ~1–3 min.'}
            </p>
        </div>
    );
}

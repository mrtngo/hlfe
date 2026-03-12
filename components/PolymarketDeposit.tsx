'use client';

import React, { useState, useEffect } from 'react';
import { usePolymarket } from '@/hooks/usePolymarket';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useWallets, useSendTransaction } from '@privy-io/react-auth';
import { Copy, Check, ExternalLink, Loader2, AlertCircle, ArrowDown, ArrowRight, RefreshCw, Wallet, Info } from 'lucide-react';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { arbitrum, mainnet, polygon, base, optimism } from 'viem/chains';
import { USDC_ADDRESSES, USDC_ABI } from '@/lib/constants/bridge';
import { tokens } from '@/lib/design-tokens';

// Chains that can bridge to Polygon
const BRIDGE_CHAINS = {
    ethereum: mainnet,
    base: base,
    optimism: optimism,
    arbitrum: arbitrum,
};

type BridgeChainKey = keyof typeof BRIDGE_CHAINS;

const CHAIN_NAME_MAP: Record<BridgeChainKey, string> = {
    ethereum: 'ETHEREUM',
    base: 'BASE',
    optimism: 'OPTIMISM',
    arbitrum: 'ARBITRUM',
};

const CHAIN_OPTIONS: { key: BridgeChainKey; name: string }[] = [
    { key: 'arbitrum', name: 'Arbitrum' },
    { key: 'ethereum', name: 'Ethereum' },
    { key: 'base', name: 'Base' },
    { key: 'optimism', name: 'Optimism' },
];

type DepositTab = 'transfer' | 'bridge';
type BridgeStep = 'input' | 'confirming' | 'bridging' | 'success' | 'error';

export default function PolymarketDeposit() {
    const { t, formatNumber } = useLanguage();
    const {
        address,
        proxyWalletAddress,
        eoaUsdcBalance,
        accountState,
        depositToPolymarket,
    } = usePolymarket();
    const { account } = useHyperliquid();

    const [activeTab, setActiveTab] = useState<DepositTab>('transfer');

    if (!address) {
        return (
            <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                    {t.polymarket?.connectToViewPositions || 'Connect wallet to deposit'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Bolsillos overview */}
            <BolsillosOverview
                address={address}
                proxyWalletAddress={proxyWalletAddress}
                eoaUsdcBalance={eoaUsdcBalance}
                polymarketBalance={accountState.usdcBalance}
                hlPerpEquity={account.equity}
                hlAvailableMargin={account.availableMargin}
                formatNumber={formatNumber}
                t={t}
            />

            {/* Tab bar */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('transfer')}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                        backgroundColor: activeTab === 'transfer' ? 'var(--color-brand-primary-muted)' : 'var(--color-bg-tertiary)',
                        color: activeTab === 'transfer' ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                        border: activeTab === 'transfer' ? '1px solid var(--color-brand-primary)' : '1px solid transparent',
                    }}
                >
                    {t.polymarket?.transferTab || 'Polygon → Polymarket'}
                </button>
                <button
                    onClick={() => setActiveTab('bridge')}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                        backgroundColor: activeTab === 'bridge' ? 'var(--color-brand-primary-muted)' : 'var(--color-bg-tertiary)',
                        color: activeTab === 'bridge' ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                        border: activeTab === 'bridge' ? '1px solid var(--color-brand-primary)' : '1px solid transparent',
                    }}
                >
                    {t.polymarket?.bridgeTab || 'Bridge → Polygon'}
                </button>
            </div>

            {activeTab === 'transfer' ? (
                <TransferToProxy
                    address={address}
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

// --- Bolsillos (Pockets) Overview ---
function BolsillosOverview({
    address,
    proxyWalletAddress,
    eoaUsdcBalance,
    polymarketBalance,
    hlPerpEquity,
    hlAvailableMargin,
    formatNumber,
    t,
}: {
    address: string;
    proxyWalletAddress: string | null;
    eoaUsdcBalance: number;
    polymarketBalance: number;
    hlPerpEquity: number;
    hlAvailableMargin: number;
    formatNumber: (n: number, d: number) => string;
    t: any;
}) {
    const pockets = [
        {
            label: t.polymarket?.pocketPolygon || 'Polygon USDC.e',
            value: eoaUsdcBalance,
            chain: 'Polygon',
            color: '#8247E5',
        },
        {
            label: t.polymarket?.pocketPolymarket || 'Polymarket',
            value: polymarketBalance,
            chain: 'Polygon',
            color: '#00D395',
        },
        {
            label: t.polymarket?.pocketHlPerp || 'HL Perp',
            value: hlPerpEquity,
            chain: 'HyperCore',
            color: 'var(--color-brand-primary)',
        },
    ];

    const totalValue = pockets.reduce((s, p) => s + p.value, 0);

    return (
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
            <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4" style={{ color: 'var(--color-brand-primary)' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {t.polymarket?.pocketsTitle || 'Bolsillos'}
                </p>
                <span className="ml-auto text-sm font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    ${formatNumber(totalValue, 2)}
                </span>
            </div>
            <div className="space-y-2">
                {pockets.map((pocket) => (
                    <div key={pocket.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pocket.color }} />
                            <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                                {pocket.label}
                            </span>
                            <span className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                                {pocket.chain}
                            </span>
                        </div>
                        <span className="text-xs font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            ${formatNumber(pocket.value, 2)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Transfer from Polygon EOA to Polymarket Proxy ---
function TransferToProxy({
    address,
    proxyWalletAddress,
    eoaUsdcBalance,
    proxyBalance,
    depositToPolymarket,
    formatNumber,
    t,
}: {
    address: string;
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
    const isValidAmount = amountNum > 0 && amountNum <= eoaUsdcBalance;

    const handleCopy = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDeposit = async () => {
        if (!isValidAmount) return;
        setLoading(true);
        setError('');
        setSuccessTx('');

        const result = await depositToPolymarket(amount);

        if (result.success) {
            setSuccessTx(result.txHash || 'success');
            setAmount('');
        } else {
            setError(result.message);
        }
        setLoading(false);
    };

    const handleQuickAmount = (pct: number) => {
        const val = eoaUsdcBalance * pct;
        setAmount(val > 0 ? val.toFixed(2) : '');
    };

    return (
        <div className="space-y-3">
            {/* Info */}
            <div className="rounded-xl p-3 flex gap-2" style={{ backgroundColor: 'rgba(250, 204, 21, 0.05)', border: '1px solid rgba(250, 204, 21, 0.2)' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-brand-primary)' }} />
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {t.polymarket?.depositInfo || 'Polymarket uses a separate trading wallet. Transfer USDC.e from your Polygon wallet to your Polymarket trading wallet.'}
                </p>
            </div>

            {/* From / To display */}
            <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex justify-between items-center text-[11px]">
                    <span style={{ color: 'var(--color-text-tertiary)' }}>Polygon USDC.e</span>
                    <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>${formatNumber(eoaUsdcBalance, 2)}</span>
                </div>
                <div className="flex justify-center"><ArrowDown className="w-3 h-3" style={{ color: 'var(--color-text-tertiary)' }} /></div>
                <div className="flex justify-between items-center text-[11px]">
                    <span style={{ color: 'var(--color-text-tertiary)' }}>Polymarket</span>
                    <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>${formatNumber(proxyBalance, 2)}</span>
                </div>
            </div>

            {/* Amount input */}
            <div className="relative">
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setError(''); setSuccessTx(''); }}
                    placeholder="0.00"
                    className="w-full py-3 px-4 pr-20 rounded-xl text-base font-mono outline-none"
                    style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-default)',
                    }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                    USDC.e
                </span>
            </div>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-4 gap-2">
                {[0.25, 0.5, 0.75, 1].map(pct => (
                    <button
                        key={pct}
                        onClick={() => handleQuickAmount(pct)}
                        className="py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                            backgroundColor: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border-subtle)',
                        }}
                    >
                        {pct === 1 ? 'MAX' : `${pct * 100}%`}
                    </button>
                ))}
            </div>

            {/* Action button */}
            <button
                onClick={handleDeposit}
                disabled={loading || !isValidAmount}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                style={{
                    backgroundColor: (loading || !isValidAmount) ? 'var(--color-bg-hover)' : 'var(--color-brand-primary)',
                    color: (loading || !isValidAmount) ? 'var(--color-text-tertiary)' : 'var(--color-text-on-brand)',
                    opacity: (loading || !isValidAmount) ? 0.6 : 1,
                    cursor: (loading || !isValidAmount) ? 'not-allowed' : 'pointer',
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
                <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-negative)' }}>
                    {error}
                </div>
            )}

            {/* Success */}
            {successTx && (
                <div className="rounded-xl p-3 text-xs flex items-center gap-2" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-positive)' }}>
                    <Check className="w-4 h-4" />
                    <span>{t.polymarket?.depositSuccess || '¡Depósito exitoso!'}</span>
                    {successTx !== 'success' && (
                        <a href={`https://polygonscan.com/tx/${successTx}`} target="_blank" rel="noopener noreferrer" className="ml-auto">
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>
            )}

            {/* External deposit hint */}
            {proxyWalletAddress && (
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
                    <p className="text-[11px] mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                        {t.polymarket?.externalDeposit || 'También puedes enviar USDC.e en Polygon directamente a tu billetera de trading:'}
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="text-[11px] font-mono flex-1 truncate" style={{ color: 'var(--color-brand-primary)' }}>
                            {proxyWalletAddress}
                        </code>
                        <button onClick={() => handleCopy(proxyWalletAddress)} className="p-1" style={{ color: 'var(--color-text-tertiary)' }}>
                            {copied ? <Check className="w-3 h-3" style={{ color: 'var(--color-positive)' }} /> : <Copy className="w-3 h-3" />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Bridge from other chains to Polygon ---
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
    const [loadingBalances, setLoadingBalances] = useState(false);

    // Fetch source chain balance
    useEffect(() => {
        const fetchBalances = async () => {
            if (!activeWallet?.address) return;
            setLoadingBalances(true);
            try {
                const chainData = BRIDGE_CHAINS[fromChain];
                const client = createPublicClient({ chain: chainData, transport: http() });
                const usdcAddress = USDC_ADDRESSES[fromChain];
                const bal = await client.readContract({
                    address: usdcAddress as Address,
                    abi: USDC_ABI,
                    functionName: 'balanceOf',
                    args: [activeWallet.address as Address],
                });
                setFromBalance(formatUnits(bal as bigint, 6));
            } catch (err) {
                console.error('Error fetching bridge balance:', err);
            } finally {
                setLoadingBalances(false);
            }
        };

        fetchBalances();
        const interval = setInterval(fetchBalances, 30000);
        return () => clearInterval(interval);
    }, [activeWallet?.address, fromChain]);

    const handleBridge = async () => {
        if (!activeWallet || !amount) return;
        setStep('confirming');
        setError('');

        try {
            const sourceChainId = BRIDGE_CHAINS[fromChain].id;
            await activeWallet.switchChain(sourceChainId);
            setStep('bridging');

            // Call Rhino bridge API but target Polygon instead of Arbitrum
            const response = await fetch('/api/bridge/execute', {
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

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to prepare bridge');
            }

            const bridgeData = await response.json();

            // Approve if needed
            if (bridgeData.approval) {
                try {
                    const approvalResult = await sendTransaction(
                        {
                            to: bridgeData.approval.to as `0x${string}`,
                            data: bridgeData.approval.data as `0x${string}`,
                            value: BigInt(0),
                            chainId: sourceChainId,
                        },
                        { sponsor: true }
                    );
                    await new Promise(resolve => setTimeout(resolve, 3000));
                } catch (approvalError: any) {
                    console.log('Approval may already exist:', approvalError.message);
                }
            }

            // Execute bridge
            if (bridgeData.transaction) {
                const result = await sendTransaction(
                    {
                        to: bridgeData.transaction.to as `0x${string}`,
                        data: bridgeData.transaction.data as `0x${string}`,
                        value: bridgeData.transaction.value ? BigInt(bridgeData.transaction.value) : BigInt(0),
                        chainId: sourceChainId,
                    },
                    { sponsor: true }
                );
                setTxHash(result.hash || '');
            } else {
                setTxHash(bridgeData.depositTxHash || '');
            }

            setStep('success');
        } catch (err: any) {
            console.error('Bridge error:', err);
            setError(err.message || 'Failed to bridge funds');
            setStep('error');
        }
    };

    const handleReset = () => {
        setStep('input');
        setAmount('');
        setError('');
        setTxHash('');
    };

    const isValidAmount = amount && parseFloat(amount) > 0;

    if (!activeWallet) {
        return (
            <div className="text-center py-6" style={{ color: 'var(--color-text-tertiary)' }}>
                <p className="text-sm">{t.bridge?.connectToBridge || 'Connect wallet to bridge'}</p>
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                    <Check className="w-6 h-6" style={{ color: 'var(--color-positive)' }} />
                </div>
                <div>
                    <p className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                        {t.bridge?.bridgeInitiated || 'Bridge Initiated!'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                        {t.polymarket?.bridgeToPolygonSuccess || 'USDC is being bridged to Polygon. This may take 1-3 minutes.'}
                    </p>
                </div>
                {txHash && (
                    <a
                        href={`https://polygonscan.com/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--color-brand-primary)' }}
                    >
                        Ver transacción <ExternalLink className="w-3 h-3" />
                    </a>
                )}
                <button
                    onClick={handleReset}
                    className="w-full py-3 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: 'var(--color-brand-primary)', color: 'var(--color-text-on-brand)' }}
                >
                    {t.bridge?.bridgeMoreFunds || 'Bridge More'}
                </button>
            </div>
        );
    }

    if (step === 'error') {
        return (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
                <AlertCircle className="w-12 h-12" style={{ color: 'var(--color-negative)' }} />
                <div>
                    <p className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                        {t.bridge?.bridgeFailed || 'Bridge Failed'}
                    </p>
                    <p className="text-xs px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-negative)' }}>
                        {error}
                    </p>
                </div>
                <button
                    onClick={handleReset}
                    className="w-full py-3 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-default)' }}
                >
                    {t.bridge?.tryAgain || 'Try Again'}
                </button>
            </div>
        );
    }

    if (step === 'bridging' || step === 'confirming') {
        return (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                <div>
                    <p className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                        {step === 'confirming'
                            ? (t.bridge?.switchingNetwork || 'Switching network...')
                            : (t.bridge?.bridgingFunds || 'Bridging funds...')}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                        {step === 'confirming'
                            ? (t.bridge?.confirmNetworkSwitch || 'Confirm in your wallet')
                            : (t.bridge?.confirmTransaction || 'Confirm the transaction')}
                    </p>
                </div>
            </div>
        );
    }

    // Input form
    return (
        <div className="space-y-3">
            {/* Info */}
            <div className="rounded-xl p-3 flex gap-2" style={{ backgroundColor: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <RefreshCw className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#8b5cf6' }} />
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {t.polymarket?.bridgeInfo || 'Bridge USDC from other chains to your Polygon wallet. Once on Polygon, transfer to your Polymarket trading wallet.'}
                </p>
            </div>

            {/* Source chain selector */}
            <div>
                <p className="text-[11px] mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                    {t.bridge?.fromChain || 'From chain'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {CHAIN_OPTIONS.map((chain) => (
                        <button
                            key={chain.key}
                            onClick={() => setFromChain(chain.key)}
                            className="py-2.5 px-3 rounded-xl text-xs font-semibold transition-all"
                            style={{
                                backgroundColor: fromChain === chain.key ? 'var(--color-brand-primary-muted)' : 'var(--color-bg-tertiary)',
                                color: fromChain === chain.key ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                                border: fromChain === chain.key ? '1px solid var(--color-brand-primary)' : '1px solid var(--color-border-subtle)',
                            }}
                        >
                            {chain.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Arrow + destination */}
            <div className="flex items-center justify-center gap-2 py-1">
                <ArrowDown className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
            </div>

            <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex justify-between items-center text-xs">
                    <span style={{ color: 'var(--color-text-tertiary)' }}>Polygon (USDC.e)</span>
                    <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                        {t.polymarket?.yourWallet || 'Tu Billetera'}
                    </span>
                </div>
            </div>

            {/* Amount */}
            <div>
                <div className="flex justify-between text-[11px] mb-1">
                    <span style={{ color: 'var(--color-text-tertiary)' }}>{t.bridge?.amountUsdc || 'Amount (USDC)'}</span>
                    <span
                        style={{ color: 'var(--color-brand-primary)', cursor: 'pointer' }}
                        onClick={() => fromBalance && setAmount(fromBalance)}
                    >
                        {loadingBalances ? '...' : fromBalance ? `${parseFloat(fromBalance).toFixed(2)} USDC` : '0.00 USDC'}
                    </span>
                </div>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full py-3 px-4 rounded-xl text-base font-mono outline-none"
                    style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-default)',
                    }}
                />
            </div>

            {/* Bridge button */}
            <button
                onClick={handleBridge}
                disabled={!isValidAmount}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                style={{
                    backgroundColor: !isValidAmount ? 'var(--color-bg-hover)' : 'var(--color-brand-primary)',
                    color: !isValidAmount ? 'var(--color-text-tertiary)' : 'var(--color-text-on-brand)',
                    opacity: !isValidAmount ? 0.6 : 1,
                    cursor: !isValidAmount ? 'not-allowed' : 'pointer',
                }}
            >
                {t.polymarket?.bridgeToPolygon || 'Bridge a Polygon'}
            </button>

            {/* Note */}
            <div className="flex gap-2 text-[11px] p-2" style={{ color: 'var(--color-text-tertiary)' }}>
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{t.polymarket?.bridgeNote || 'After bridging, go to the "Polygon → Polymarket" tab to transfer funds to your trading wallet. Bridge takes ~1-3 min.'}</span>
            </div>
        </div>
    );
}

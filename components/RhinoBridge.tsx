'use client';

import { useState } from 'react';
import { useWallets, useSendTransaction } from '@privy-io/react-auth';
import {
    AlertCircle,
    RefreshCw,
    Info,
    CheckCircle,
    ArrowRight,
    Loader2,
    ExternalLink
} from 'lucide-react';
import { parseUnits, formatUnits, createPublicClient, http, type Address } from 'viem';
import { tokens } from '@/lib/design-tokens';
import { arbitrum, mainnet, polygon, base, optimism } from 'viem/chains';
import { USDC_ADDRESSES, USDC_ABI } from '@/lib/constants/bridge';
import { useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

interface RhinoBridgeProps {
    onComplete?: () => void;
}

type BridgeStep = 'input' | 'confirming' | 'bridging' | 'success' | 'error';

// Supported chains for bridging
const SUPPORTED_CHAINS = {
    ethereum: mainnet,
    polygon: polygon,
    base: base,
    optimism: optimism,
    arbitrum: arbitrum,
};

type SupportedChainKey = keyof typeof SUPPORTED_CHAINS;

// Chain name mapping for Rhino API
const CHAIN_NAME_MAP: Record<SupportedChainKey, string> = {
    ethereum: 'ETHEREUM',
    polygon: 'MATIC_POS',
    base: 'BASE',
    optimism: 'OPTIMISM',
    arbitrum: 'ARBITRUM',
};

export default function RhinoBridge({ onComplete }: RhinoBridgeProps) {
    const { t } = useLanguage();
    const { wallets } = useWallets();
    const { sendTransaction } = useSendTransaction();
    const activeWallet = wallets?.[0];

    // Form state
    const [fromChain, setFromChain] = useState<SupportedChainKey>('base');
    const [amount, setAmount] = useState('');
    const [step, setStep] = useState<BridgeStep>('input');
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState('');
    const [estimatedTime, setEstimatedTime] = useState('1-3 minutes');
    const [fromBalance, setFromBalance] = useState<string | null>(null);
    const [toBalance, setToBalance] = useState<string | null>(null);
    const [loadingBalances, setLoadingBalances] = useState(false);

    // Chain options
    const chainOptions: { key: SupportedChainKey; name: string; icon: string }[] = [
        { key: 'ethereum', name: 'Ethereum', icon: 'ETH' },
        { key: 'polygon', name: 'Polygon', icon: 'MATIC' },
        { key: 'base', name: 'Base', icon: 'BASE' },
        { key: 'optimism', name: 'Optimism', icon: 'OP' },
    ];

    // Fetch balances
    useEffect(() => {
        const fetchBalances = async () => {
            if (!activeWallet?.address) return;

            setLoadingBalances(true);
            try {
                // Fetch fromChain balance
                const fromChainData = SUPPORTED_CHAINS[fromChain];
                const fromClient = createPublicClient({
                    chain: fromChainData,
                    transport: http(),
                });

                const fromUsdcAddress = USDC_ADDRESSES[fromChain];
                const fromBal = await fromClient.readContract({
                    address: fromUsdcAddress as Address,
                    abi: USDC_ABI,
                    functionName: 'balanceOf',
                    args: [activeWallet.address as Address],
                });

                // Fetch Arbitrum (toChain) balance
                const arbiClient = createPublicClient({
                    chain: arbitrum,
                    transport: http(),
                });

                const arbiUsdcAddress = USDC_ADDRESSES.arbitrum;
                const arbiBal = await arbiClient.readContract({
                    address: arbiUsdcAddress as Address,
                    abi: USDC_ABI,
                    functionName: 'balanceOf',
                    args: [activeWallet.address as Address],
                });

                // USDC has 6 decimals on most chains (Canonical/Native)
                // Note: On some old bridged versions it might be different, but Rhino uses 6-decimal USDC
                setFromBalance(formatUnits(fromBal as bigint, 6));
                setToBalance(formatUnits(arbiBal as bigint, 6));
            } catch (err) {
                console.error('Error fetching bridge balances:', err);
            } finally {
                setLoadingBalances(false);
            }
        };

        fetchBalances();

        // Refresh balances every 30 seconds
        const interval = setInterval(fetchBalances, 30000);
        return () => clearInterval(interval);
    }, [activeWallet?.address, fromChain]);

    const handleBridge = async () => {
        if (!activeWallet || !amount) return;

        setStep('confirming');
        setError('');

        try {
            // Switch to the source chain if needed
            const sourceChainId = SUPPORTED_CHAINS[fromChain].id;
            await activeWallet.switchChain(sourceChainId);

            setStep('bridging');

            // Call our API endpoint that uses the Rhino SDK's bridge() method with chain adapter
            const response = await fetch('/api/bridge/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromChain: CHAIN_NAME_MAP[fromChain],
                    toChain: 'ARBITRUM',
                    token: 'USDC',
                    amount: amount,
                    depositor: activeWallet.address,
                    recipient: activeWallet.address,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to prepare bridge');
            }

            const bridgeData = await response.json();
            console.log('Bridge data from API:', bridgeData);

            // Step 1: Approve the bridge contract to spend tokens (if needed)
            if (bridgeData.approval) {
                console.log('Sending approval transaction...');
                try {
                    const approvalResult = await sendTransaction(
                        {
                            to: bridgeData.approval.to as `0x${string}`,
                            data: bridgeData.approval.data as `0x${string}`,
                            value: BigInt(0),
                            chainId: sourceChainId,
                        },
                        {
                            sponsor: true,
                        }
                    );
                    console.log('Approval tx hash:', approvalResult.hash);

                    // Wait a bit for the approval to be mined
                    await new Promise(resolve => setTimeout(resolve, 3000));
                } catch (approvalError: any) {
                    // If approval fails with "already approved" or similar, continue
                    console.log('Approval may already exist:', approvalError.message);
                }
            }

            // Step 2: Execute the bridge deposit
            if (bridgeData.transaction) {
                console.log('Sending deposit transaction...');
                const result = await sendTransaction(
                    {
                        to: bridgeData.transaction.to as `0x${string}`,
                        data: bridgeData.transaction.data as `0x${string}`,
                        value: bridgeData.transaction.value ? BigInt(bridgeData.transaction.value) : BigInt(0),
                        chainId: sourceChainId,
                    },
                    {
                        sponsor: true,
                    }
                );

                setTxHash(result.hash || '');
            } else {
                setTxHash(bridgeData.depositTxHash || '');
            }

            setStep('success');

            // Call completion callback after a delay
            setTimeout(() => {
                onComplete?.();
            }, 3000);

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

    // Check if amount is valid
    const isValidAmount = amount && parseFloat(amount) > 0;

    // Render different views based on step
    if (!activeWallet) {
        return (
            <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255, 255, 255, 0.5)' }}>
                {t.bridge.connectToBridge}
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                padding: '32px 16px',
                textAlign: 'center'
            }}>
                <CheckCircle style={{ width: '64px', height: '64px', color: tokens.positive }} />
                <div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                        {t.bridge.bridgeInitiated}
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '16px' }}>
                        {t.bridge.usdcBeingBridged}
                    </div>
                    <div style={{ fontSize: '13px', color: tokens.brand }}>
                        {t.bridge.estimatedTime}
                    </div>
                </div>

                {txHash && (
                    <a
                        href={`https://arbiscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: tokens.brand,
                            fontSize: '14px',
                            textDecoration: 'none',
                            padding: '10px 16px',
                            backgroundColor: 'rgba(250, 204, 21, 0.1)',
                            borderRadius: tokens.radiusFull,
                        }}
                    >
                        {t.bridge.viewTransaction} <ExternalLink style={{ width: '14px', height: '14px' }} />
                    </a>
                )}

                <div style={{
                    padding: '12px',
                    backgroundColor: 'rgba(250, 204, 21, 0.05)',
                    border: '1px solid rgba(250, 204, 21, 0.2)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    width: '100%'
                }}>
                    <strong style={{ color: tokens.brand }}>{t.bridge.nextStep}</strong> {t.bridge.nextStepDesc}
                </div>

                <button
                    onClick={handleReset}
                    className="btn-primary"
                    style={{ width: '100%', marginTop: '8px' }}
                >
                    {t.bridge.bridgeMoreFunds}
                </button>
            </div>
        );
    }

    if (step === 'error') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '32px 16px', textAlign: 'center' }}>
                <AlertCircle style={{ width: '64px', height: '64px', color: tokens.negative }} />
                <div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>{t.bridge.bridgeFailed}</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>
                </div>
                <button onClick={handleReset} className="btn-secondary" style={{ width: '100%' }}>{t.bridge.tryAgain}</button>
            </div>
        );
    }

    if (step === 'bridging' || step === 'confirming') {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                padding: '32px 16px',
                textAlign: 'center'
            }}>
                <Loader2 style={{
                    width: '64px',
                    height: '64px',
                    color: tokens.brand,
                    animation: 'spin 1s linear infinite'
                }} />
                <div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                        {step === 'confirming' ? t.bridge.switchingNetwork : t.bridge.bridgingFunds}
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                        {step === 'confirming'
                            ? t.bridge.confirmNetworkSwitch
                            : t.bridge.confirmTransaction
                        }
                    </div>
                </div>
            </div>
        );
    }

    // Input form
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Info Banner */}
            <div style={{
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                gap: '12px'
            }}>
                <RefreshCw style={{ width: '20px', height: '20px', color: '#8b5cf6', flexShrink: 0 }} />
                <div style={{ fontSize: '13px' }}>
                    <div style={{ fontWeight: 600, color: '#8b5cf6', marginBottom: '4px' }}>
                        {t.bridge.crossChainBridge}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {t.bridge.crossChainDesc}
                    </div>
                </div>
            </div>

            {/* Chain Selector */}
            <div>
                <label style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px', display: 'block' }}>
                    {t.bridge.fromChain}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {chainOptions.map((chain) => (
                        <button
                            key={chain.key}
                            onClick={() => setFromChain(chain.key)}
                            style={{
                                padding: '12px',
                                backgroundColor: fromChain === chain.key ? 'rgba(250, 204, 21, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${fromChain === chain.key ? tokens.brand : 'rgba(255, 255, 255, 0.1)'}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: fromChain === chain.key ? tokens.brand : 'white',
                                fontSize: '14px',
                                fontWeight: 600,
                            }}
                        >
                            {chain.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Arrow */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ArrowRight style={{ width: '24px', height: '24px', color: 'rgba(255, 255, 255, 0.3)' }} />
            </div>

            {/* To Chain (Fixed) */}
            <div>
                <label style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px', display: 'block' }}>
                    {t.bridge.toChain}
                </label>
                <div style={{
                    padding: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.7)',
                }}>
                    {t.bridge.arbitrumForHl}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '4px', textAlign: 'right' }}>
                    Balance: <span style={{ color: 'white', fontWeight: 600 }}>{loadingBalances ? '...' : toBalance ? `${parseFloat(toBalance).toFixed(2)} USDC` : '0.00 USDC'}</span>
                </div>
            </div>

            {/* Amount Input */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', display: 'block' }}>
                        {t.bridge.amountUsdc}
                    </label>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                        {t.bridge.available}: <span
                            style={{ color: tokens.brand, cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => fromBalance && setAmount(fromBalance)}
                        >
                            {loadingBalances ? '...' : fromBalance ? `${parseFloat(fromBalance).toFixed(2)} USDC` : '0.00 USDC'}
                        </span>
                    </div>
                </div>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="input"
                    style={{
                        width: '100%',
                        fontSize: '18px',
                        fontFamily: 'var(--font-mono)',
                    }}
                />
            </div>

            {/* Bridge Button */}
            <button
                onClick={handleBridge}
                disabled={!isValidAmount}
                className="btn-primary"
                style={{ width: '100%', fontSize: '16px', padding: '16px' }}
            >
                {t.bridge.bridgeToArbitrum}
            </button>

            {/* Info */}
            <div style={{
                padding: '12px',
                backgroundColor: 'rgba(250, 204, 21, 0.05)',
                border: '1px solid rgba(250, 204, 21, 0.2)',
                borderRadius: '10px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.6)',
                display: 'flex',
                gap: '8px'
            }}>
                <Info style={{ width: '16px', height: '16px', flexShrink: 0, color: tokens.brand }} />
                <div>
                    {t.bridge.afterBridging}
                    {' '}{t.bridge.estimatedTime}
                </div>
            </div>
        </div>
    );
}

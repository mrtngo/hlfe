'use client';

import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import {
    AlertCircle,
    RefreshCw,
    Info,
    CheckCircle,
    ArrowRight,
    Loader2,
    ExternalLink
} from 'lucide-react';
import {
    executeBridge,
    type SupportedChainKey,
    SUPPORTED_CHAINS
} from '@/lib/rhino/sdk';
import { formatUnits, parseUnits, type Address } from 'viem';
import { tokens } from '@/lib/design-tokens';

interface RhinoBridgeProps {
    onComplete?: () => void;
}

type BridgeStep = 'input' | 'confirming' | 'bridging' | 'success' | 'error';

export default function RhinoBridge({ onComplete }: RhinoBridgeProps) {
    const { wallets } = useWallets();
    const activeWallet = wallets?.[0];

    // Form state
    const [fromChain, setFromChain] = useState<SupportedChainKey>('ethereum');
    const [amount, setAmount] = useState('');
    const [step, setStep] = useState<BridgeStep>('input');
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState('');
    const [estimatedTime, setEstimatedTime] = useState('1-3 minutes');

    // Chain options
    const chainOptions: { key: SupportedChainKey; name: string; icon: string }[] = [
        { key: 'ethereum', name: 'Ethereum', icon: 'ETH' },
        { key: 'polygon', name: 'Polygon', icon: 'MATIC' },
        { key: 'base', name: 'Base', icon: 'BASE' },
        { key: 'optimism', name: 'Optimism', icon: 'OP' },
    ];

    const handleBridge = async () => {
        if (!activeWallet || !amount) return;

        setStep('confirming');
        setError('');

        try {
            // Get Ethereum provider from Privy wallet
            const provider = await activeWallet.getEthereumProvider();

            // Switch to the source chain if needed
            const sourceChainId = SUPPORTED_CHAINS[fromChain].id;
            await activeWallet.switchChain(sourceChainId);

            setStep('bridging');

            // Execute the bridge using Rhino SDK
            const result = await executeBridge({
                fromChainKey: fromChain,
                toChainKey: 'arbitrum', // Always bridge to Arbitrum
                token: 'USDC',
                amount: parseUnits(amount, 6).toString(),
                walletAddress: activeWallet.address as Address,
                ethereumProvider: provider,
            });

            setTxHash(result.hash);
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
                Connect your wallet to bridge funds.
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
                        Bridge Initiated!
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '16px' }}>
                        Your USDC is being bridged to Arbitrum
                    </div>
                    <div style={{ fontSize: '13px', color: tokens.brand }}>
                        Estimated time: {estimatedTime}
                    </div>
                </div>

                {txHash && (
                    <a
                        href={`https://etherscan.io/tx/${txHash}`}
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
                        View Transaction <ExternalLink style={{ width: '14px', height: '14px' }} />
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
                    <strong style={{ color: tokens.brand }}>Next Step:</strong> Once your USDC arrives on Arbitrum,
                    use the "Bridge" tab in the Deposit Modal to complete your deposit to Hyperliquid.
                </div>

                <button
                    onClick={handleReset}
                    className="btn-primary"
                    style={{ width: '100%', marginTop: '8px' }}
                >
                    Bridge More Funds
                </button>
            </div>
        );
    }

    if (step === 'error') {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                padding: '32px 16px',
                textAlign: 'center'
            }}>
                <AlertCircle style={{ width: '64px', height: '64px', color: tokens.negative }} />
                <div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                        Bridge Failed
                    </div>
                    <div style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '8px'
                    }}>
                        {error}
                    </div>
                </div>

                <button
                    onClick={handleReset}
                    className="btn-secondary"
                    style={{ width: '100%' }}
                >
                    Try Again
                </button>
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
                        {step === 'confirming' ? 'Switching Network...' : 'Bridging Funds...'}
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                        {step === 'confirming'
                            ? 'Please confirm the network switch in your wallet'
                            : 'Please confirm the transaction in your wallet'
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
                        Cross-Chain Bridge
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Bridge USDC from Ethereum, Polygon, Base, and more to Arbitrum using your Privy wallet.
                    </div>
                </div>
            </div>

            {/* Chain Selector */}
            <div>
                <label style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px', display: 'block' }}>
                    From Chain
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
                    To Chain
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
                    Arbitrum (for Hyperliquid deposit)
                </div>
            </div>

            {/* Amount Input */}
            <div>
                <label style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px', display: 'block' }}>
                    Amount (USDC)
                </label>
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
                Bridge to Arbitrum
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
                    After bridging to Arbitrum, use the "Bridge" tab to deposit USDC from Arbitrum to Hyperliquid.
                    Estimated time: {estimatedTime}
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useWallets } from '@privy-io/react-auth';
import { X, ArrowLeftRight, Loader2, AlertCircle } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { useLanguage } from '@/hooks/useLanguage';
import { API_URL } from '@/lib/hyperliquid/client';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function TransferModal({ isOpen, onClose }: TransferModalProps) {
    const { wallets } = useWallets();
    const { address, account } = useHyperliquid();
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const activeWallet = wallets?.[0];

    const [amount, setAmount] = useState('');
    const [toPerp, setToPerp] = useState(true); // true = Spot → Perp, false = Perp → Spot
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setError('');
            setSuccess(false);
        }
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const availableBalance = account?.availableMargin || 0;
    const spotBalance = account?.spotBalance || 0;
    const amountNum = parseFloat(amount || '0');
    const sourceBalance = toPerp ? spotBalance : availableBalance;
    const isValidAmount = amountNum > 0 && amountNum <= sourceBalance;

    const handleTransfer = async () => {
        if (!activeWallet || !address || !isValidAmount) return;

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const provider = await activeWallet.getEthereumProvider();
            const nonce = Date.now();

            // Prepare the transfer action - CORRECT FORMAT
            const transferAction = {
                type: 'usdClassTransfer',
                hyperliquidChain: 'Mainnet',
                signatureChainId: '0xa4b1',
                amount: amount,
                toPerp: toPerp,
                nonce: nonce,
            };

            // EIP-712 domain
            const domain = {
                name: 'HyperliquidSignTransaction',
                version: '1',
                chainId: 42161,
                verifyingContract: '0x0000000000000000000000000000000000000000',
            };

            // Sign with EIP-712
            const signature = await provider.request({
                method: 'eth_signTypedData_v4',
                params: [
                    address,
                    JSON.stringify({
                        domain,
                        types: {
                            EIP712Domain: [
                                { name: 'name', type: 'string' },
                                { name: 'version', type: 'string' },
                                { name: 'chainId', type: 'uint256' },
                                { name: 'verifyingContract', type: 'address' },
                            ],
                            'HyperliquidTransaction:UsdClassTransfer': [
                                { name: 'hyperliquidChain', type: 'string' },
                                { name: 'amount', type: 'string' },
                                { name: 'toPerp', type: 'bool' },
                                { name: 'nonce', type: 'uint64' },
                            ],
                        },
                        primaryType: 'HyperliquidTransaction:UsdClassTransfer',
                        message: {
                            hyperliquidChain: 'Mainnet',
                            amount: amount,
                            toPerp: toPerp,
                            nonce: nonce,
                        },
                    }),
                ],
            });

            // Parse signature
            const sig = signature.slice(2);
            const r = '0x' + sig.slice(0, 64);
            const s = '0x' + sig.slice(64, 128);
            const v = parseInt(sig.slice(128, 130), 16);

            // Send to Hyperliquid
            const response = await fetch(`${API_URL}/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: transferAction,
                    nonce,
                    signature: { r, s, v },
                }),
            });

            const result = await response.json();

            if (result.status === 'ok' || result.response?.type === 'default') {
                setSuccess(true);
                setAmount('');
                // Auto-close after 2 seconds
                setTimeout(() => onClose(), 2000);
            } else {
                throw new Error(result.response?.data || result.error || 'Transfer failed');
            }
        } catch (err: any) {
            console.error('Transfer error:', err);
            setError(err.message || 'Failed to process transfer');
        } finally {
            setLoading(false);
        }
    };

    const modalContent = (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}
        >
            {/* Backdrop */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(8px)',
                }}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '400px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px',
                    padding: '24px',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                        {t.transfer.title}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px',
                            borderRadius: '50%',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <X style={{ width: '20px', height: '20px', color: 'white' }} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Info */}
                    <div style={{
                        backgroundColor: 'rgba(255, 255, 0, 0.1)',
                        border: '1px solid rgba(255, 255, 0, 0.2)',
                        borderRadius: '12px',
                        padding: '12px',
                        display: 'flex',
                        gap: '12px'
                    }}>
                        <ArrowLeftRight style={{ width: '20px', height: '20px', color: '#FFFF00', flexShrink: 0 }} />
                        <div style={{ fontSize: '13px' }}>
                            <div style={{ fontWeight: 600, color: '#FFFF00', marginBottom: '4px' }}>{t.transfer.betweenAccounts}</div>
                            <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                {t.transfer.moveBetween}
                            </div>
                        </div>
                    </div>

                    {/* Direction Toggle */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        padding: '4px',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        borderRadius: '12px',
                    }}>
                        <button
                            onClick={() => setToPerp(true)}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: 'bold',
                                fontSize: '13px',
                                cursor: 'pointer',
                                backgroundColor: toPerp ? '#FFFF00' : 'transparent',
                                color: toPerp ? 'black' : 'rgba(255, 255, 255, 0.5)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {t.transfer.spotToPerp}
                        </button>
                        <button
                            onClick={() => setToPerp(false)}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: 'bold',
                                fontSize: '13px',
                                cursor: 'pointer',
                                backgroundColor: !toPerp ? '#FFFF00' : 'transparent',
                                color: !toPerp ? 'black' : 'rgba(255, 255, 255, 0.5)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {t.transfer.perpToSpot}
                        </button>
                    </div>

                    {/* Balances */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '12px'
                        }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '6px' }}>
                                {t.transfer.spotBalance}
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFFF00', fontFamily: 'monospace' }}>
                                {formatCurrency(spotBalance)}
                            </div>
                        </div>
                        <div style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '12px'
                        }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '6px' }}>
                                {t.transfer.perpBalance}
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFFF00', fontFamily: 'monospace' }}>
                                {formatCurrency(availableBalance)}
                            </div>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{t.order.amount}:</span>
                            <span
                                style={{ color: 'white', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => setAmount(toPerp ? spotBalance.toString() : availableBalance.toString())}
                            >
                                {t.order.max}: {formatCurrency(sourceBalance)}
                            </span>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError('');
                                    setSuccess(false);
                                }}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    paddingRight: '80px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '18px',
                                    fontFamily: 'monospace',
                                    outline: 'none',
                                }}
                            />
                            <span style={{
                                position: 'absolute',
                                right: '16px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }}>
                                USDC
                            </span>
                        </div>
                    </div>

                    {/* Transfer Button */}
                    <button
                        onClick={handleTransfer}
                        disabled={loading || !isValidAmount || !address}
                        style={{
                            width: '100%',
                            padding: '16px',
                            backgroundColor: '#FFFF00',
                            color: 'black',
                            fontWeight: 'bold',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: (loading || !isValidAmount) ? 'not-allowed' : 'pointer',
                            opacity: (loading || !isValidAmount) ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                                {t.common.processing}
                            </>
                        ) : (
                            <>
                                <ArrowLeftRight style={{ width: '16px', height: '16px' }} />
                                {t.transfer.transfer}
                            </>
                        )}
                    </button>

                    {/* Feedback */}
                    {error && (
                        <div style={{
                            backgroundColor: 'rgba(255, 107, 107, 0.1)',
                            border: '1px solid rgba(255, 107, 107, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            color: '#FF6B6B',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px'
                        }}>
                            <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{
                            backgroundColor: 'rgba(74, 222, 128, 0.1)',
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            color: '#4ade80',
                            fontSize: '13px'
                        }}>
                            {t.transfer.transferComplete}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

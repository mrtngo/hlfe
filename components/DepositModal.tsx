'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { X, Copy, Check, ExternalLink } from 'lucide-react';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
    const { address } = useHyperliquid();
    const [copied, setCopied] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const copyAddress = async () => {
        if (address) {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen || !mounted) return null;

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
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>Deposit</h2>
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

                {/* Content - Crypto Deposit Only */}
                <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', textAlign: 'center', margin: 0 }}>
                            Send USDC (Arbitrum) to your wallet address
                        </p>

                        {/* Wallet Address */}
                        <div style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px',
                            padding: '16px'
                        }}>
                            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Your Wallet Address
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <code style={{ flex: 1, fontSize: '13px', color: '#FFFF00', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                    {address || 'Connect wallet first'}
                                </code>
                                <button
                                    onClick={copyAddress}
                                    disabled={!address}
                                    style={{
                                        flexShrink: 0,
                                        padding: '8px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: address ? 'pointer' : 'not-allowed',
                                        opacity: address ? 1 : 0.5,
                                    }}
                                >
                                    {copied ? (
                                        <Check style={{ width: '16px', height: '16px', color: '#4ade80' }} />
                                    ) : (
                                        <Copy style={{ width: '16px', height: '16px', color: 'white' }} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Network Warning */}
                        <div style={{
                            backgroundColor: 'rgba(255, 255, 0, 0.1)',
                            border: '1px solid rgba(255, 255, 0, 0.2)',
                            borderRadius: '12px',
                            padding: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ fontSize: '18px' }}>⚠️</span>
                                <div style={{ fontSize: '14px' }}>
                                    <div style={{ fontWeight: 600, color: '#FFFF00' }}>Only send USDC on Arbitrum</div>
                                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                                        Sending other tokens or using wrong network may result in loss of funds.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bridge Link */}
                        <a
                            href="https://app.hyperliquid.xyz/portfolio"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '12px',
                                fontSize: '14px',
                                color: 'rgba(255, 255, 255, 0.5)',
                                textDecoration: 'none',
                            }}
                        >
                            <span>Deposit to Hyperliquid L1</span>
                            <ExternalLink style={{ width: '16px', height: '16px' }} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );

    // Use portal to render at document.body level
    return createPortal(modalContent, document.body);
}


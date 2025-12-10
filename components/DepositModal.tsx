'use client';

/**
 * DepositModal
 * Supports two flows:
 * 1. Direct Arbitrum deposit - show address and copy
 * 2. Base bridge - bridge USDC from Base to Arbitrum, then deposit to Hyperliquid
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useBridge } from '@/hooks/useBridge';
import { X, Copy, Check, ExternalLink, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type SourceChain = 'arbitrum' | 'base';
type DepositStep = 'select-chain' | 'bridge-amount' | 'bridge-quote' | 'bridging' | 'complete' | 'direct-deposit';

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
    const { address } = useHyperliquid();
    const { t, language } = useLanguage();
    const bridge = useBridge(address);

    const [copied, setCopied] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [sourceChain, setSourceChain] = useState<SourceChain | null>(null);
    const [step, setStep] = useState<DepositStep>('select-chain');
    const [amount, setAmount] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSourceChain(null);
            setStep('select-chain');
            setAmount('');
            bridge.reset();
        }
    }, [isOpen]);

    const copyAddress = async () => {
        if (address) {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleChainSelect = (chain: SourceChain) => {
        setSourceChain(chain);
        if (chain === 'arbitrum') {
            setStep('direct-deposit');
        } else {
            setStep('bridge-amount');
        }
    };

    const handleGetQuote = async () => {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum < bridge.minAmount) {
            return;
        }
        await bridge.fetchQuote(amountNum);
        if (bridge.status === 'quote-ready') {
            setStep('bridge-quote');
        }
    };

    const handleExecuteBridge = async () => {
        setStep('bridging');
        const success = await bridge.executeBridgeTransaction();
        if (success) {
            setStep('complete');
        }
    };

    const handleBack = () => {
        if (step === 'direct-deposit' || step === 'bridge-amount') {
            setSourceChain(null);
            setStep('select-chain');
            bridge.reset();
        } else if (step === 'bridge-quote') {
            setStep('bridge-amount');
            bridge.reset();
        }
    };

    if (!isOpen || !mounted) return null;

    // Translations
    const texts = {
        title: language === 'es' ? 'Depositar' : 'Deposit',
        selectChain: language === 'es' ? '¿Dónde tienes tu USDC?' : 'Where is your USDC?',
        base: 'Base',
        arbitrum: 'Arbitrum',
        bridgeFromBase: language === 'es' ? 'Puente desde Base' : 'Bridge from Base',
        enterAmount: language === 'es' ? 'Ingresa monto (USDC)' : 'Enter amount (USDC)',
        min: language === 'es' ? 'Mínimo' : 'Minimum',
        getQuote: language === 'es' ? 'Obtener Cotización' : 'Get Quote',
        bridgeQuote: language === 'es' ? 'Cotización de Puente' : 'Bridge Quote',
        youSend: language === 'es' ? 'Envías' : 'You send',
        youReceive: language === 'es' ? 'Recibes' : 'You receive',
        gasFee: language === 'es' ? 'Gas' : 'Gas fee',
        bridgeFee: language === 'es' ? 'Comisión puente' : 'Bridge fee',
        estimatedTime: language === 'es' ? 'Tiempo estimado' : 'Est. time',
        seconds: language === 'es' ? 'seg' : 'sec',
        startBridge: language === 'es' ? 'Iniciar Puente' : 'Start Bridge',
        bridging: language === 'es' ? 'Ejecutando puente...' : 'Bridging...',
        waitingApproval: language === 'es' ? 'Esperando aprobación...' : 'Waiting for approval...',
        complete: language === 'es' ? '¡Puente completado!' : 'Bridge complete!',
        completeDesc: language === 'es' ? 'Tu USDC llegará a Arbitrum pronto. Después deposita a Hyperliquid.' : 'Your USDC will arrive on Arbitrum soon. Then deposit to Hyperliquid.',
        depositToHL: language === 'es' ? 'Depositar a Hyperliquid' : 'Deposit to Hyperliquid',
        back: language === 'es' ? '← Atrás' : '← Back',
        directDeposit: language === 'es' ? 'Depósito Directo' : 'Direct Deposit',
        sendUsdcArb: language === 'es' ? 'Envía USDC en Arbitrum a:' : 'Send USDC on Arbitrum to:',
        warningTitle: t.depositModal?.warningTitle || 'Arbitrum Only',
        warningText: t.depositModal?.warningText || 'Only send USDC on Arbitrum network',
        viewOnExplorer: language === 'es' ? 'Ver en explorador' : 'View on explorer',
    };

    const renderContent = () => {
        switch (step) {
            case 'select-chain':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '15px', textAlign: 'center', margin: 0 }}>
                            {texts.selectChain}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Base Option */}
                            <button
                                onClick={() => handleChainSelect('base')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '16px',
                                    backgroundColor: 'rgba(0, 82, 255, 0.1)',
                                    border: '1px solid rgba(0, 82, 255, 0.3)',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: '#0052FF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    color: 'white'
                                }}>
                                    B
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>{texts.base}</div>
                                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>
                                        {texts.bridgeFromBase}
                                    </div>
                                </div>
                                <ArrowRight style={{ width: '20px', height: '20px', color: 'rgba(255, 255, 255, 0.5)' }} />
                            </button>

                            {/* Arbitrum Option */}
                            <button
                                onClick={() => handleChainSelect('arbitrum')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '16px',
                                    backgroundColor: 'rgba(40, 160, 240, 0.1)',
                                    border: '1px solid rgba(40, 160, 240, 0.3)',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: '#28A0F0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: 'white'
                                }}>
                                    A
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>{texts.arbitrum}</div>
                                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>
                                        {texts.directDeposit}
                                    </div>
                                </div>
                                <ArrowRight style={{ width: '20px', height: '20px', color: 'rgba(255, 255, 255, 0.5)' }} />
                            </button>
                        </div>
                    </div>
                );

            case 'bridge-amount':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button
                            onClick={handleBack}
                            style={{
                                alignSelf: 'flex-start',
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.5)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: 0,
                            }}
                        >
                            {texts.back}
                        </button>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            justifyContent: 'center',
                            marginBottom: '8px'
                        }}>
                            <div style={{
                                padding: '4px 12px',
                                backgroundColor: 'rgba(0, 82, 255, 0.2)',
                                borderRadius: '20px',
                                color: '#0052FF',
                                fontSize: '13px',
                                fontWeight: 600
                            }}>
                                Base
                            </div>
                            <ArrowRight style={{ width: '16px', height: '16px', color: 'rgba(255, 255, 255, 0.5)' }} />
                            <div style={{
                                padding: '4px 12px',
                                backgroundColor: 'rgba(40, 160, 240, 0.2)',
                                borderRadius: '20px',
                                color: '#28A0F0',
                                fontSize: '13px',
                                fontWeight: 600
                            }}>
                                Arbitrum
                            </div>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontSize: '12px',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                {texts.enterAmount}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    min={bridge.minAmount}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        paddingRight: '70px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '16px',
                                        color: 'white',
                                        fontSize: '20px',
                                        fontWeight: 600,
                                        outline: 'none',
                                    }}
                                />
                                <span style={{
                                    position: 'absolute',
                                    right: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontSize: '16px',
                                    fontWeight: 600
                                }}>
                                    USDC
                                </span>
                            </div>
                            <p style={{
                                color: 'rgba(255, 255, 255, 0.4)',
                                fontSize: '12px',
                                margin: '8px 0 0 0'
                            }}>
                                {texts.min}: ${bridge.minAmount}
                            </p>
                        </div>

                        {bridge.error && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px',
                                backgroundColor: 'rgba(255, 68, 68, 0.1)',
                                border: '1px solid rgba(255, 68, 68, 0.2)',
                                borderRadius: '12px',
                                color: '#FF4444',
                                fontSize: '14px'
                            }}>
                                <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                                {bridge.error}
                            </div>
                        )}

                        <button
                            onClick={handleGetQuote}
                            disabled={!amount || parseFloat(amount) < bridge.minAmount || bridge.status === 'fetching-quote'}
                            style={{
                                width: '100%',
                                padding: '16px',
                                backgroundColor: '#FFFF00',
                                color: '#000',
                                border: 'none',
                                borderRadius: '16px',
                                fontSize: '16px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                opacity: (!amount || parseFloat(amount) < bridge.minAmount) ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {bridge.status === 'fetching-quote' ? (
                                <>
                                    <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                                    Loading...
                                </>
                            ) : (
                                texts.getQuote
                            )}
                        </button>
                    </div>
                );

            case 'bridge-quote':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button
                            onClick={handleBack}
                            style={{
                                alignSelf: 'flex-start',
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.5)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: 0,
                            }}
                        >
                            {texts.back}
                        </button>

                        <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 600, margin: 0, textAlign: 'center' }}>
                            {texts.bridgeQuote}
                        </h3>

                        {bridge.quote && (
                            <div style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '16px',
                                padding: '16px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>{texts.youSend}</span>
                                    <span style={{ color: 'white', fontSize: '16px', fontWeight: 600 }}>${amount} USDC</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>{texts.youReceive}</span>
                                    <span style={{ color: '#FFFF00', fontSize: '16px', fontWeight: 600 }}>
                                        ~${bridge.quote.estimatedOutputUsd.toFixed(2)} USDC
                                    </span>
                                </div>
                                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '12px', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px' }}>{texts.gasFee}</span>
                                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                                            ~${bridge.quote.gasCostUsd.toFixed(2)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px' }}>{texts.bridgeFee}</span>
                                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                                            ~${bridge.quote.bridgeFeeUsd.toFixed(2)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px' }}>{texts.estimatedTime}</span>
                                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                                            ~{Math.ceil(bridge.quote.estimatedDurationSeconds / 60)} min
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleExecuteBridge}
                            style={{
                                width: '100%',
                                padding: '16px',
                                backgroundColor: '#FFFF00',
                                color: '#000',
                                border: 'none',
                                borderRadius: '16px',
                                fontSize: '16px',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            {texts.startBridge}
                        </button>
                    </div>
                );

            case 'bridging':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '24px 0' }}>
                        <Loader2 style={{ width: '48px', height: '48px', color: '#FFFF00', animation: 'spin 1s linear infinite' }} />
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>
                                {bridge.status === 'approving' ? texts.waitingApproval : texts.bridging}
                            </h3>
                            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', margin: 0 }}>
                                Base → Arbitrum
                            </p>
                        </div>
                    </div>
                );

            case 'complete':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px 0' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(74, 222, 128, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Check style={{ width: '32px', height: '32px', color: '#4ade80' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>
                                {texts.complete}
                            </h3>
                            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', margin: 0 }}>
                                {texts.completeDesc}
                            </p>
                        </div>

                        {bridge.txHash && (
                            <a
                                href={`https://basescan.org/tx/${bridge.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontSize: '14px',
                                    textDecoration: 'none'
                                }}
                            >
                                {texts.viewOnExplorer}
                                <ExternalLink style={{ width: '14px', height: '14px' }} />
                            </a>
                        )}

                        <button
                            onClick={onClose}
                            style={{
                                width: '100%',
                                padding: '16px',
                                backgroundColor: '#FFFF00',
                                color: '#000',
                                border: 'none',
                                borderRadius: '16px',
                                fontSize: '16px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                marginTop: '8px'
                            }}
                        >
                            {texts.depositToHL}
                        </button>
                    </div>
                );

            case 'direct-deposit':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button
                            onClick={handleBack}
                            style={{
                                alignSelf: 'flex-start',
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.5)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: 0,
                            }}
                        >
                            {texts.back}
                        </button>

                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', textAlign: 'center', margin: 0 }}>
                            {texts.sendUsdcArb}
                        </p>

                        {/* Wallet Address */}
                        <div style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px',
                            padding: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <code style={{ flex: 1, fontSize: '13px', color: '#FFFF00', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                    {address || 'Connect wallet'}
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
                                    <div style={{ fontWeight: 600, color: '#FFFF00' }}>{texts.warningTitle}</div>
                                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                                        {texts.warningText}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hyperliquid Link */}
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
                            <span>{t.depositModal?.hyperliquidLink || 'Deposit via Hyperliquid'}</span>
                            <ExternalLink style={{ width: '16px', height: '16px' }} />
                        </a>
                    </div>
                );
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
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>{texts.title}</h2>
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

                {/* Content */}
                <div style={{ padding: '16px' }}>
                    {renderContent()}
                </div>
            </div>

            {/* CSS for spinner animation */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );

    return createPortal(modalContent, document.body);
}

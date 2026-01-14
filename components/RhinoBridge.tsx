'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWallets } from '@privy-io/react-auth';
import {
    AlertCircle,
    ExternalLink,
    RefreshCw,
    Info
} from 'lucide-react';
import {
    buildRhinoWidgetUrl,
    RHINO_WIDGET_THEME,
    RHINO_API_KEY,
} from '@/lib/rhino';

interface RhinoBridgeProps {
    onComplete?: () => void;
}

export default function RhinoBridge({ onComplete }: RhinoBridgeProps) {
    const { wallets } = useWallets();
    const activeWallet = wallets?.[0];
    const [isLoading, setIsLoading] = useState(true);
    const [showWidget, setShowWidget] = useState(false);

    // Build the widget URL with current wallet address
    const widgetUrl = useMemo(() => {
        if (!activeWallet?.address) return '';

        return buildRhinoWidgetUrl({
            apiKey: RHINO_API_KEY,
            chainOut: 'ARBITRUM_ONE', // Bridge to Arbitrum
            token: 'USDC',            // USDC only
            recipient: activeWallet.address,
            walletAddress: activeWallet.address, // Pre-connect with Privy wallet
            mode: 'dark',
            theme: RHINO_WIDGET_THEME,
        });
    }, [activeWallet?.address]);

    // Listen for messages from the widget
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Only accept messages from rhino.fi
            if (!event.origin.includes('rhino.fi')) return;

            console.log('Rhino widget message:', event.data);

            // Handle bridge completion
            if (event.data?.type === 'BRIDGE_COMPLETE' ||
                event.data?.status === 'complete') {
                onComplete?.();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onComplete]);

    const handleIframeLoad = () => {
        setIsLoading(false);
    };

    // Check if API key is configured
    const hasApiKey = !!RHINO_API_KEY;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                        Bridge USDC from Ethereum, Polygon, Base, and more to Arbitrum.
                        Then complete deposit to Hyperliquid using the Bridge tab.
                    </div>
                </div>
            </div>

            {!activeWallet ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Connect your wallet to bridge funds.
                </div>
            ) : !hasApiKey ? (
                /* No API Key State */
                <div style={{
                    textAlign: 'center',
                    padding: '32px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <AlertCircle style={{ width: '48px', height: '48px', color: '#FFFF00' }} />
                    <div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                            API Key Required
                        </div>
                        <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '16px' }}>
                            To enable cross-chain bridging, add your rhino.fi API key to the environment.
                        </div>
                        <code style={{
                            display: 'block',
                            padding: '12px',
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#8b5cf6',
                            marginBottom: '12px'
                        }}>
                            NEXT_PUBLIC_RHINO_API_KEY=your_key
                        </code>
                    </div>
                    <a
                        href="https://developers.rhino.fi"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#8b5cf6',
                            fontSize: '14px',
                            textDecoration: 'none',
                            padding: '10px 16px',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            borderRadius: '8px',
                        }}
                    >
                        Get API Key <ExternalLink style={{ width: '14px', height: '14px' }} />
                    </a>
                </div>
            ) : !showWidget ? (
                /* Pre-widget state - explain and show button */
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '24px 16px'
                }}>
                    {/* Steps explanation */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '12px',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            borderRadius: '10px'
                        }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: '#8b5cf6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                flexShrink: 0,
                            }}>1</div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'white', fontSize: '14px' }}>
                                    Select source chain
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                                    Choose from Ethereum, Polygon, Base, Optimism & more
                                </div>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '12px',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            borderRadius: '10px'
                        }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: '#8b5cf6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                flexShrink: 0,
                            }}>2</div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'white', fontSize: '14px' }}>
                                    Bridge to Arbitrum
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                                    Your USDC will arrive on Arbitrum in 1-3 minutes
                                </div>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '12px',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            borderRadius: '10px'
                        }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255,255,0,0.8)',
                                color: 'black',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                flexShrink: 0,
                            }}>3</div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'white', fontSize: '14px' }}>
                                    Deposit to Hyperliquid
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                                    Use the "Bridge" tab to complete your deposit
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Primary action - Open in new tab (recommended for embedded wallets) */}
                    <a
                        href={widgetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            width: '100%',
                            padding: '16px',
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            fontWeight: 'bold',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '15px',
                            textDecoration: 'none',
                        }}
                    >
                        <ExternalLink style={{ width: '18px', height: '18px' }} />
                        Open Bridge (Recommended)
                    </a>

                    {/* Secondary action - Use in-app iframe */}
                    <button
                        onClick={() => setShowWidget(true)}
                        style={{
                            width: '100%',
                            padding: '14px',
                            backgroundColor: 'transparent',
                            color: 'rgba(255,255,255,0.7)',
                            fontWeight: 600,
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '14px',
                        }}
                    >
                        <RefreshCw style={{ width: '16px', height: '16px' }} />
                        Use In-App Bridge
                    </button>

                    {/* Note about wallet connection */}
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'rgba(255, 255, 0, 0.05)',
                        border: '1px solid rgba(255, 255, 0, 0.2)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.6)',
                    }}>
                        <strong style={{ color: '#FFFF00' }}>💡 Tip:</strong> When prompted to connect wallet, select "WalletConnect" and scan the QR code with your wallet app, or copy your wallet address ({activeWallet.address.slice(0, 6)}...{activeWallet.address.slice(-4)}).
                    </div>

                    {/* Powered by */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.3)',
                    }}>
                        <Info style={{ width: '12px', height: '12px' }} />
                        Powered by rhino.fi
                    </div>
                </div>
            ) : (
                /* Widget embed */
                <div style={{ position: 'relative', minHeight: '500px' }}>
                    {isLoading && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            borderRadius: '12px',
                            zIndex: 10,
                        }}>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px',
                                color: 'rgba(255,255,255,0.6)'
                            }}>
                                <RefreshCw style={{
                                    width: '24px',
                                    height: '24px',
                                    animation: 'spin 1s linear infinite',
                                    color: '#8b5cf6'
                                }} />
                                Loading bridge...
                            </div>
                        </div>
                    )}

                    <iframe
                        src={widgetUrl}
                        style={{
                            width: '100%',
                            height: '520px',
                            border: 'none',
                            borderRadius: '12px',
                            backgroundColor: 'transparent',
                        }}
                        onLoad={handleIframeLoad}
                        allow="clipboard-read; clipboard-write"
                        scrolling="no"
                    />

                    {/* Back button */}
                    <button
                        onClick={() => {
                            setShowWidget(false);
                            setIsLoading(true);
                        }}
                        style={{
                            marginTop: '12px',
                            padding: '10px 16px',
                            backgroundColor: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: 'rgba(255,255,255,0.6)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            width: '100%',
                        }}
                    >
                        ← Back to instructions
                    </button>
                </div>
            )}
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/hooks/useLanguage';

export interface OrderNotificationData {
    symbol: string;
    side: 'buy' | 'sell';
    size: number;
    price: number;
    pnl?: number;
    isClosing?: boolean;
}

interface OrderNotificationProps {
    order: OrderNotificationData | null;
    onClose: () => void;
}

export default function OrderNotification({ order, onClose }: OrderNotificationProps) {
    const { t } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showContent, setShowContent] = useState(false);
    const [fillPercent, setFillPercent] = useState(0);
    const [mounted, setMounted] = useState(false);

    // Handle client-side mounting for portal
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (order) {
            // Reset states
            setFillPercent(0);
            setShowContent(false);
            setIsVisible(true);

            // Small delay then start animations
            const t1 = setTimeout(() => {
                setIsAnimating(true);
            }, 50);

            // Start fill animation
            const t2 = setTimeout(() => {
                setFillPercent(100);
            }, 100);

            // Show content after logo animation
            const t3 = setTimeout(() => {
                setShowContent(true);
            }, 500);

            // No auto-close - user must tap outside to dismiss

            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
                clearTimeout(t3);
            };
        }
    }, [order]);

    const handleClose = () => {
        setIsAnimating(false);
        setShowContent(false);
        setTimeout(() => {
            setIsVisible(false);
            setFillPercent(0);
            onClose();
        }, 300);
    };

    if (!order || !isVisible || !mounted) return null;

    const isLong = order.side === 'buy';
    const actionText = order.isClosing
        ? (t.positions?.positionClosed || 'Position Closed')
        : (t.order?.orderPlaced || 'Order Placed');

    const notificationContent = (
        <>
            {/* Backdrop - covers entire screen */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    zIndex: 99999,
                    opacity: isAnimating ? 1 : 0,
                    transition: 'opacity 0.3s ease-out',
                }}
                onClick={handleClose}
            />

            {/* Modal - centered on screen */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    zIndex: 100000,
                    pointerEvents: 'none',
                    opacity: isAnimating ? 1 : 0,
                    transform: isAnimating ? 'scale(1)' : 'scale(0.95)',
                    transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                }}
            >
                <div
                    style={{
                        backgroundColor: '#000000',
                        border: '2px solid rgba(255, 255, 0, 0.3)',
                        borderRadius: '24px',
                        padding: '32px',
                        maxWidth: '360px',
                        width: '100%',
                        pointerEvents: 'auto',
                        boxShadow: '0 0 60px rgba(255, 255, 0, 0.2), 0 25px 50px rgba(0, 0, 0, 0.5)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Lightning Logo with Fill Animation */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                        <div
                            style={{
                                position: 'relative',
                                width: '120px',
                                height: '120px',
                                animation: isAnimating ? 'pulse 1.5s ease-in-out infinite' : 'none',
                            }}
                        >
                            {/* Background lightning (outline only - dimmed) */}
                            <svg
                                viewBox="0 0 100 100"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                }}
                            >
                                <path
                                    d="M55 10L25 52H45L38 90L75 42H52L55 10Z"
                                    stroke="#FFFF00"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                    opacity="0.2"
                                />
                            </svg>

                            {/* Filled lightning with clip animation */}
                            <svg
                                viewBox="0 0 100 100"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    clipPath: `inset(${100 - fillPercent}% 0 0 0)`,
                                    filter: fillPercent === 100
                                        ? 'drop-shadow(0 0 20px rgba(255, 255, 0, 0.9)) drop-shadow(0 0 40px rgba(255, 255, 0, 0.5))'
                                        : 'drop-shadow(0 0 10px rgba(255, 255, 0, 0.6))',
                                    transition: 'clip-path 0.7s ease-out, filter 0.3s ease-out',
                                }}
                            >
                                <defs>
                                    <linearGradient id="boltGradientNotif" x1="0%" y1="100%" x2="0%" y2="0%">
                                        <stop offset="0%" stopColor="#FFFF00" />
                                        <stop offset="50%" stopColor="#FFFF00" />
                                        <stop offset="100%" stopColor="#FFD700" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d="M55 10L25 52H45L38 90L75 42H52L55 10Z"
                                    fill="url(#boltGradientNotif)"
                                    stroke="#FFFF00"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Success Text */}
                    <div
                        style={{
                            opacity: showContent ? 1 : 0,
                            transform: showContent ? 'translateY(0)' : 'translateY(16px)',
                            transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                        }}
                    >
                        <h2 style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#FFFFFF',
                            textAlign: 'center',
                            marginBottom: '8px',
                            margin: '0 0 8px 0',
                        }}>
                            {actionText}
                        </h2>
                        <p style={{
                            color: '#FFFF00',
                            textAlign: 'center',
                            fontSize: '14px',
                            marginBottom: '24px',
                            fontWeight: '600',
                        }}>
                            ⚡ {order.symbol.replace('-USD', '').replace('-PERP', '')}
                        </p>

                        {/* Order Summary */}
                        <div style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '16px',
                            padding: '16px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontSize: '14px', color: '#888888' }}>{t.positions?.side || 'Side'}</span>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    color: isLong ? '#00FF00' : '#FF4444'
                                }}>
                                    {isLong ? 'LONG' : 'SHORT'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontSize: '14px', color: '#888888' }}>{t.positions?.size || 'Size'}</span>
                                <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: '600', color: '#FFFFFF' }}>
                                    {order.size.toFixed(4)}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '14px', color: '#888888' }}>{t.order?.price || 'Price'}</span>
                                <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: '600', color: '#FFFFFF' }}>
                                    ${order.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            {/* PnL if closing position */}
                            {order.isClosing && order.pnl !== undefined && (
                                <div style={{
                                    paddingTop: '12px',
                                    marginTop: '12px',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '14px', color: '#888888' }}>{t.positions?.pnl || 'Realized P&L'}</span>
                                        <span style={{
                                            fontSize: '14px',
                                            fontFamily: 'monospace',
                                            fontWeight: 'bold',
                                            color: order.pnl >= 0 ? '#00FF00' : '#FF4444'
                                        }}>
                                            {order.pnl >= 0 ? '+' : ''}${order.pnl.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tap to dismiss hint */}
                        <p style={{
                            textAlign: 'center',
                            fontSize: '12px',
                            color: '#666666',
                            marginTop: '16px',
                        }}>
                            Tap anywhere to close
                        </p>
                    </div>
                </div>
            </div>
        </>
    );

    // Use portal to render at document body level
    return createPortal(notificationContent, document.body);
}

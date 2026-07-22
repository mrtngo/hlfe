'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { Position } from '@/types/hyperliquid';
import { X, TrendingUp, TrendingDown, AlertCircle, Loader2 } from 'lucide-react';

interface SetSLTPModalProps {
    isOpen: boolean;
    onClose: () => void;
    position: Position;
}

export default function SetSLTPModal({ isOpen, onClose, position }: SetSLTPModalProps) {
    const { placeTriggerOrder, markets } = useHyperliquid();
    const { formatCurrency } = useLanguage();

    const [takeProfitPrice, setTakeProfitPrice] = useState('');
    const [stopLossPrice, setStopLossPrice] = useState('');
    const [mounted, setMounted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const market = markets.find(m => m.symbol === position.symbol);
    const currentPrice = market?.price || position.markPrice;

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setTakeProfitPrice('');
            setStopLossPrice('');
            setError(null);
            setSuccess(null);
        }
    }, [isOpen]);

    const handleSetTP = async () => {
        const price = parseFloat(takeProfitPrice);

        if (!takeProfitPrice || isNaN(price) || price <= 0) {
            setError('Please enter a valid take profit price');
            return;
        }

        // Validate TP is in the right direction
        if (position.side === 'long' && price <= currentPrice) {
            setError('Take profit must be above current price for long positions');
            return;
        }
        if (position.side === 'short' && price >= currentPrice) {
            setError('Take profit must be below current price for short positions');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const result = await placeTriggerOrder(position.symbol, 'tp', price, position.size);
            setSuccess('Take Profit set successfully!');
            setTakeProfitPrice('');
            setTimeout(() => {
                setSuccess(null);
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to set take profit');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSetSL = async () => {
        const price = parseFloat(stopLossPrice);

        if (!stopLossPrice || isNaN(price) || price <= 0) {
            setError('Please enter a valid stop loss price');
            return;
        }

        // Validate SL is in the right direction
        if (position.side === 'long' && price >= currentPrice) {
            setError('Stop loss must be below current price for long positions');
            return;
        }
        if (position.side === 'short' && price <= currentPrice) {
            setError('Stop loss must be above current price for short positions');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const result = await placeTriggerOrder(position.symbol, 'sl', price, position.size);
            setSuccess('Stop Loss set successfully!');
            setStopLossPrice('');
            setTimeout(() => {
                setSuccess(null);
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to set stop loss');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !mounted) return null;

    // Calculate profit/loss percentage WITH leverage applied
    // ROI on margin = price change % * leverage
    const profitPct = takeProfitPrice ?
        (position.side === 'long'
            ? ((parseFloat(takeProfitPrice) - currentPrice) / currentPrice * 100 * position.leverage)
            : ((currentPrice - parseFloat(takeProfitPrice)) / currentPrice * 100 * position.leverage)
        ) : 0;

    const lossPct = stopLossPrice ?
        (position.side === 'long'
            ? ((currentPrice - parseFloat(stopLossPrice)) / currentPrice * 100 * position.leverage)
            : ((parseFloat(stopLossPrice) - currentPrice) / currentPrice * 100 * position.leverage)
        ) : 0;

    const modalContent = (
        <div style={{
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
        }}>
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
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '500px',
                backgroundColor: '#0A0A0A',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                padding: '24px',
                maxHeight: '90vh',
                overflowY: 'auto',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                            Set SL/TP
                        </h2>
                        <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px', margin: 0 }}>
                            {position.symbol.replace('-USD', '')} • {position.side === 'long' ? 'Long' : 'Short'} • {position.leverage}x
                        </p>
                    </div>
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

                {/* Current Info */}
                <div style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>Current Price:</span>
                        <span style={{ fontSize: '14px', color: 'white', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {formatCurrency(currentPrice)}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>Position Size:</span>
                        <span style={{ fontSize: '14px', color: 'white', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {position.size.toFixed(4)}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>Entry Price:</span>
                        <span style={{ fontSize: '14px', color: 'white', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {formatCurrency(position.entryPrice)}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Take Profit */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <TrendingUp style={{ width: '20px', height: '20px', color: '#22C55E' }} />
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>Take Profit</h3>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px', display: 'block' }}>
                                Target Price
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={takeProfitPrice}
                                    onChange={(e) => {
                                        setTakeProfitPrice(e.target.value);
                                        setError(null);
                                    }}
                                    placeholder={formatCurrency(currentPrice * (position.side === 'long' ? 1.05 : 0.95))}
                                    step="0.01"
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        paddingRight: '80px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        border: '2px solid rgba(34, 197, 94, 0.3)',
                                        borderRadius: '12px',
                                        color: '#E3B34C',
                                        fontSize: '18px',
                                        fontFamily: 'monospace',
                                        fontWeight: 'bold',
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
                                    USD
                                </span>
                            </div>
                            {takeProfitPrice && profitPct > 0 && (
                                <div style={{ marginTop: '8px', fontSize: '13px', color: '#22C55E', textAlign: 'center' }}>
                                    Profit: +{profitPct.toFixed(2)}%
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSetTP}
                            disabled={isSubmitting || !takeProfitPrice}
                            style={{
                                width: '100%',
                                padding: '16px',
                                backgroundColor: '#22C55E',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: (isSubmitting || !takeProfitPrice) ? 'not-allowed' : 'pointer',
                                opacity: (isSubmitting || !takeProfitPrice) ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                                    Setting...
                                </>
                            ) : (
                                'Set Take Profit'
                            )}
                        </button>
                    </div>

                    {/* Stop Loss */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <TrendingDown style={{ width: '20px', height: '20px', color: '#EF4444' }} />
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>Stop Loss</h3>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px', display: 'block' }}>
                                Stop Price
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={stopLossPrice}
                                    onChange={(e) => {
                                        setStopLossPrice(e.target.value);
                                        setError(null);
                                    }}
                                    placeholder={formatCurrency(currentPrice * (position.side === 'long' ? 0.95 : 1.05))}
                                    step="0.01"
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        paddingRight: '80px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        border: '2px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '12px',
                                        color: '#E3B34C',
                                        fontSize: '18px',
                                        fontFamily: 'monospace',
                                        fontWeight: 'bold',
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
                                    USD
                                </span>
                            </div>
                            {stopLossPrice && lossPct > 0 && (
                                <div style={{ marginTop: '8px', fontSize: '13px', color: '#EF4444', textAlign: 'center' }}>
                                    Loss: -{lossPct.toFixed(2)}%
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSetSL}
                            disabled={isSubmitting || !stopLossPrice}
                            style={{
                                width: '100%',
                                padding: '16px',
                                backgroundColor: '#EF4444',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: (isSubmitting || !stopLossPrice) ? 'not-allowed' : 'pointer',
                                opacity: (isSubmitting || !stopLossPrice) ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                                    Setting...
                                </>
                            ) : (
                                'Set Stop Loss'
                            )}
                        </button>
                    </div>

                    {/* Error/Success */}
                    {error && (
                        <div style={{
                            backgroundColor: 'rgba(255, 107, 107, 0.1)',
                            border: '1px solid rgba(255, 107, 107, 0.3)',
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px'
                        }}>
                            <AlertCircle style={{ width: '16px', height: '16px', color: '#FF6B6B', flexShrink: 0, marginTop: '2px' }} />
                            <span style={{ fontSize: '14px', color: '#FF6B6B' }}>{error}</span>
                        </div>
                    )}
                    {success && (
                        <div style={{
                            backgroundColor: 'rgba(74, 222, 128, 0.1)',
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                            borderRadius: '12px',
                            padding: '12px',
                            fontSize: '14px',
                            color: '#4ade80',
                            textAlign: 'center'
                        }}>
                            ✅ {success}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

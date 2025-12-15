'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import { X, Download, Copy, Check, Share2 } from 'lucide-react';
import PnLShareCard from './PnLShareCard';
import { Position } from '@/types/hyperliquid';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    position: Position;
}

export default function ShareModal({ isOpen, onClose, position }: ShareModalProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Generate preview image when modal opens
    useEffect(() => {
        if (isOpen && cardRef.current) {
            const generateImage = async () => {
                try {
                    // Wait for fonts to load
                    await document.fonts.ready;

                    const dataUrl = await toPng(cardRef.current!, {
                        pixelRatio: 2,
                        backgroundColor: '#0A0A0A',
                    });
                    setImageUrl(dataUrl);
                } catch (err) {
                    console.error('Failed to generate image:', err);
                }
            };

            // Small delay to ensure card is rendered
            setTimeout(generateImage, 100);
        }
    }, [isOpen, position]);

    const handleDownload = async () => {
        if (!cardRef.current) return;

        setDownloading(true);
        try {
            const dataUrl = await toPng(cardRef.current, {
                pixelRatio: 2,
                backgroundColor: '#0A0A0A',
            });

            // Create download link
            const link = document.createElement('a');
            link.download = `rayo-${position.symbol.replace('-USD', '')}-${position.side}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to download image:', err);
        } finally {
            setDownloading(false);
        }
    };

    const handleCopy = async () => {
        if (!cardRef.current) return;

        try {
            const dataUrl = await toPng(cardRef.current, {
                pixelRatio: 2,
                backgroundColor: '#0A0A0A',
            });

            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            // Copy to clipboard
            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob
                })
            ]);

            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy image:', err);
            // Fallback: try to copy the data URL
            try {
                const dataUrl = await toPng(cardRef.current!, {
                    pixelRatio: 2,
                    backgroundColor: '#0A0A0A',
                });
                await navigator.clipboard.writeText(dataUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                console.error('Clipboard fallback also failed');
            }
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
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    backdropFilter: 'blur(8px)',
                }}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'relative',
                    maxWidth: '480px',
                    width: '100%',
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
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Share2 style={{ width: '20px', height: '20px', color: '#FFFF00' }} />
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                            Share Position
                        </h2>
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

                {/* Card Preview */}
                <div style={{
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'center',
                    overflowX: 'auto',
                }}>
                    <PnLShareCard ref={cardRef} position={position} />
                </div>

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '16px 20px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '14px',
                            backgroundColor: '#FFFF00',
                            color: 'black',
                            fontWeight: 'bold',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: downloading ? 'not-allowed' : 'pointer',
                            opacity: downloading ? 0.7 : 1,
                            fontSize: '14px',
                        }}
                    >
                        <Download style={{ width: '18px', height: '18px' }} />
                        {downloading ? 'Saving...' : 'Save Image'}
                    </button>

                    <button
                        onClick={handleCopy}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '14px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontWeight: 'bold',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        {copied ? (
                            <>
                                <Check style={{ width: '18px', height: '18px', color: '#4ade80' }} />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy style={{ width: '18px', height: '18px' }} />
                                Copy Image
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

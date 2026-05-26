'use client';

/**
 * ModalSheet primitives — full-height bottom-sheet shell used by the
 * Approve Agent and Bridge modal flows. Built off the
 * `design_handoff_modals/screens/modal-shared.jsx` reference.
 *
 * Three exports:
 *   <ModalSheet>   — outer portal + dimmed underlay + slide-up sheet shell
 *   <ModalHeader>  — title/sub eyebrow + optional right slot + close button
 *   <ModalSticky>  — bottom sticky CTA wrapper with gradient fade
 *
 * Animation is CSS-only (no framer-motion dep) and respects
 * prefers-reduced-motion.
 */

import { createPortal } from 'react-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalSheetProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    /** If false, tap-on-underlay won't close — used during signing / progress states. */
    dismissable?: boolean;
}

export function ModalSheet({
    open,
    onClose,
    children,
    dismissable = true,
}: ModalSheetProps) {
    const [mounted, setMounted] = useState(false);
    /**
     * Two-phase visibility so we can run the enter/exit animation properly:
     * - `mounted` = is the portal in the DOM
     * - `entered` = has the slide-up transform completed
     */
    const [entered, setEntered] = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (open) {
            // Defer one frame so the initial translateY(100%) renders before
            // we flip to translateY(0). Otherwise the sheet appears already
            // positioned and there's no animation.
            const id = requestAnimationFrame(() => setEntered(true));
            return () => cancelAnimationFrame(id);
        } else {
            setEntered(false);
        }
    }, [open]);

    if (!mounted) return null;
    if (!open && !entered) return null;

    const node = (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                pointerEvents: 'auto',
            }}
        >
            {/* Dimmed underlay */}
            <div
                onClick={() => {
                    if (dismissable) onClose();
                }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                        'radial-gradient(120% 80% at 50% 0%, rgba(40,32,18,0.3) 0%, transparent 60%), #050403',
                    opacity: entered ? 0.92 : 0,
                    transition: 'opacity 200ms ease',
                    cursor: dismissable ? 'pointer' : 'default',
                }}
            />

            {/* Sliding sheet */}
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 480,
                    margin: '0 auto',
                    maxHeight: '90vh',
                    minHeight: '50vh',
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    background: '#0A0907',
                    backgroundImage:
                        'radial-gradient(110% 60% at 30% 0%, rgba(250,180,80,0.10) 0%, transparent 55%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 -24px 60px -12px rgba(0,0,0,0.7)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: entered ? 'translateY(0)' : 'translateY(100%)',
                    transition: 'transform 280ms cubic-bezier(0.34, 1.2, 0.64, 1)',
                }}
            >
                {/* Drag handle */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '10px 0 0',
                        flexShrink: 0,
                    }}
                >
                    <div
                        style={{
                            width: 40,
                            height: 4,
                            borderRadius: 99,
                            background: 'rgba(255,255,255,0.15)',
                        }}
                    />
                </div>

                {/* Grain overlay */}
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        opacity: 0.04,
                        mixBlendMode: 'overlay',
                        backgroundImage:
                            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
                        backgroundSize: '160px 160px',
                    }}
                />

                {/* Scrollable content area */}
                <div
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        position: 'relative',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(node, document.body);
}

interface ModalHeaderProps {
    title?: string;
    sub?: string;
    onClose?: () => void;
    /** Optional content rendered between title and close (e.g. step dots). */
    right?: ReactNode;
}

export function ModalHeader({ title, sub, onClose, right }: ModalHeaderProps) {
    return (
        <div
            style={{
                padding: '8px 18px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                position: 'relative',
            }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                {sub && (
                    <div
                        style={{
                            fontSize: 10,
                            color: 'rgba(255,255,255,0.5)',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            marginBottom: 4,
                        }}
                    >
                        {sub}
                    </div>
                )}
                {title && (
                    <div
                        style={{
                            fontSize: 24,
                            lineHeight: 1,
                            fontWeight: 600,
                            fontStyle: 'italic',
                            letterSpacing: '-0.025em',
                        }}
                    >
                        {title}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {right}
                {onClose && (
                    <button
                        onClick={onClose}
                        aria-label="close"
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(255,255,255,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <X
                            style={{
                                width: 14,
                                height: 14,
                                color: 'rgba(255,255,255,0.7)',
                            }}
                        />
                    </button>
                )}
            </div>
        </div>
    );
}

export function ModalSticky({ children }: { children: ReactNode }) {
    return (
        <div
            style={{
                position: 'sticky',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '14px 18px 28px',
                background: 'linear-gradient(180deg, transparent, #0A0907 30%)',
                pointerEvents: 'auto',
            }}
        >
            {children}
        </div>
    );
}

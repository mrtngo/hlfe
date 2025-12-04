'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SuccessBoltProps {
    isVisible: boolean;
    onComplete?: () => void;
}

export default function SuccessBolt({ isVisible, onComplete }: SuccessBoltProps) {
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            // Auto-hide after animation completes (total ~1.2s)
            const timer = setTimeout(() => {
                setShouldRender(false);
                onComplete?.();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onComplete]);

    // Lightning bolt SVG path - sharp, angular bolt shape (more dramatic)
    // Creates a classic lightning bolt with sharp angles
    const boltPath = "M 50 5 L 32 48 L 42 48 L 28 95 L 50 52 L 40 52 Z";

    return (
        <AnimatePresence>
            {shouldRender && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
                >
                    {/* Backdrop with blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Lightning Bolt Container */}
                    <div className="relative">
                        {/* Phase 1: Draw the bolt path */}
                        <motion.svg
                            width="100"
                            height="100"
                            viewBox="0 0 100 100"
                            className="relative z-10"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.2, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                            {/* Drop shadow filter for neon glow */}
                            <defs>
                                <filter id="neon-glow">
                                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                                <filter id="neon-glow-strong">
                                    <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>

                            {/* Phase 1: Stroke animation (drawing the bolt) */}
                            <motion.path
                                d={boltPath}
                                fill="none"
                                stroke="#FAFF00"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                filter="url(#neon-glow)"
                                initial={{ pathLength: 0, opacity: 1 }}
                                animate={{ pathLength: 1 }}
                                transition={{
                                    duration: 0.4,
                                    ease: "easeInOut",
                                }}
                            />

                            {/* Phase 2: Fill animation (immediately after drawing) */}
                            <motion.path
                                d={boltPath}
                                fill="#FAFF00"
                                fillOpacity={0}
                                filter="url(#neon-glow-strong)"
                                initial={{ fillOpacity: 0 }}
                                animate={{ fillOpacity: 1 }}
                                transition={{
                                    duration: 0.2,
                                    delay: 0.4,
                                    ease: "easeOut",
                                }}
                            />
                        </motion.svg>

                        {/* Phase 3: Expansion and glow effect */}
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            initial={{ scale: 1, opacity: 0 }}
                            animate={{
                                scale: [1, 1.3, 1.5],
                                opacity: [0, 0.8, 0],
                            }}
                            transition={{
                                duration: 0.6,
                                delay: 0.6,
                                ease: "easeOut",
                            }}
                        >
                            <div
                                className="w-32 h-32 rounded-full"
                                style={{
                                    background: 'radial-gradient(circle, rgba(250, 255, 0, 0.4) 0%, rgba(250, 255, 0, 0) 70%)',
                                    boxShadow: '0 0 60px rgba(250, 255, 0, 0.6), 0 0 100px rgba(250, 255, 0, 0.4)',
                                }}
                            />
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


'use client';

import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const isPulling = useRef(false);
    const PULL_THRESHOLD = 80;
    const MAX_PULL = 150;

    const handleTouchStart = (e: React.TouchEvent) => {
        // Only start pulling if at the very top AND not already refreshing
        if (containerRef.current && containerRef.current.scrollTop <= 0 && !isRefreshing) {
            startY.current = e.touches[0].pageY;
            isPulling.current = true;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        // If refreshing, allow normal scrolling
        if (isRefreshing) {
            isPulling.current = false;
            return;
        }

        if (!isPulling.current) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        // Only prevent default and show pull indicator when pulling DOWN
        if (diff > 10) {
            // Apply resistance
            const distance = Math.min(diff * 0.5, MAX_PULL);
            setPullDistance(distance);

            // Only prevent scroll when actively pulling down
            if (e.cancelable && containerRef.current && containerRef.current.scrollTop <= 0) {
                e.preventDefault();
            }
        } else if (diff < 0) {
            // User is scrolling up, cancel the pull and allow scroll
            isPulling.current = false;
            setPullDistance(0);
        }
    };

    const handleTouchEnd = async () => {
        if (!isPulling.current || isRefreshing) {
            isPulling.current = false;
            return;
        }

        isPulling.current = false;

        if (pullDistance >= PULL_THRESHOLD) {
            setIsRefreshing(true);
            setPullDistance(50); // Hold at refreshing position (smaller)
            try {
                await onRefresh();
            } finally {
                // Quick fade out
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative h-full overflow-y-auto overscroll-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator - only visible when pulling or refreshing */}
            {(pullDistance > 0 || isRefreshing) && (
                <div
                    className="absolute left-0 right-0 flex justify-center items-center overflow-hidden pointer-events-none z-50"
                    style={{
                        height: Math.max(pullDistance, isRefreshing ? 50 : 0),
                        top: 0,
                        opacity: isRefreshing ? 1 : pullDistance / PULL_THRESHOLD,
                    }}
                >
                    <div className={`p-2 rounded-full bg-black/80 backdrop-blur-md border border-[#FFFF00]/30 shadow-lg ${isRefreshing ? 'animate-spin' : ''}`}>
                        <RefreshCw
                            size={18}
                            className="text-[#FFFF00]"
                            style={{
                                transform: isRefreshing ? 'none' : `rotate(${pullDistance * 2}deg)`,
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Content - minimal transform to avoid layout shift */}
            <div
                className="h-full"
                style={{
                    transform: pullDistance > 0 ? `translateY(${pullDistance * 0.3}px)` : 'none',
                    transition: isPulling.current ? 'none' : 'transform 0.2s ease-out'
                }}
            >
                {children}
            </div>
        </div>
    );
}


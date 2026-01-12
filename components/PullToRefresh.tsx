'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
        // Only trigger if at the top of the container
        if (containerRef.current && containerRef.current.scrollTop === 0) {
            startY.current = e.touches[0].pageY;
            isPulling.current = true;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isPulling.current || isRefreshing) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            // Apply resistance
            const distance = Math.min(diff * 0.5, MAX_PULL);
            setPullDistance(distance);

            // Prevent default scroll when pulling down at top
            if (e.cancelable) e.preventDefault();
        } else {
            isPulling.current = false;
        }
    };

    const handleTouchEnd = async () => {
        if (!isPulling.current || isRefreshing) return;

        isPulling.current = false;

        if (pullDistance >= PULL_THRESHOLD) {
            setIsRefreshing(true);
            setPullDistance(60); // Hold at refreshing position
            try {
                await onRefresh();
            } finally {
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDistance(0);
                }, 500);
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
            {/* Pull indicator */}
            <div
                className="absolute left-0 right-0 flex justify-center items-center overflow-hidden transition-transform duration-200 pointer-events-none"
                style={{
                    height: pullDistance,
                    top: 0,
                    opacity: pullDistance / PULL_THRESHOLD,
                    transform: `translateY(${Math.min(pullDistance - 40, 0)}px)`
                }}
            >
                <div className={`p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg ${isRefreshing ? 'animate-spin' : ''}`}>
                    <RefreshCw
                        size={20}
                        className="text-primary-400"
                        style={{
                            transform: `rotate(${pullDistance * 2}deg)`,
                            transition: isRefreshing ? 'none' : 'transform 0.1s linear'
                        }}
                    />
                </div>
            </div>

            {/* Content with dynamic transform */}
            <div
                className="transition-transform duration-200 will-change-transform h-full"
                style={{ transform: `translateY(${pullDistance * 0.5}px)` }}
            >
                {children}
            </div>
        </div>
    );
}

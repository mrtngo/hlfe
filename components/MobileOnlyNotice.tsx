'use client';

import { useState, useEffect } from 'react';
import { Smartphone, X } from 'lucide-react';

// Max width for mobile devices (in pixels)
// iPhone 15 Pro Max: 430px, Samsung Galaxy S24 Ultra: 412px
const MAX_MOBILE_WIDTH = 480;

export default function MobileOnlyNotice() {
    const [isTooWide, setIsTooWide] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check if user has previously dismissed (session only)
        const checkWidth = () => {
            setIsTooWide(window.innerWidth > MAX_MOBILE_WIDTH);
        };

        checkWidth();
        window.addEventListener('resize', checkWidth);
        
        return () => window.removeEventListener('resize', checkWidth);
    }, []);

    if (!isTooWide || isDismissed) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[99999] bg-[#121212] flex items-center justify-center p-8">
            <div className="max-w-md text-center space-y-6">
                {/* Icon */}
                <div className="mx-auto w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center">
                    <Smartphone className="w-12 h-12 text-primary" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-white font-heading">
                    Mobile Only
                </h1>

                {/* Description */}
                <p className="text-[#A0A0A0] text-lg leading-relaxed">
                    Rayo is designed for mobile devices. For the best experience, please open this app on your phone or resize your browser window to a mobile width.
                </p>

                {/* Device illustration */}
                <div className="flex items-center justify-center gap-6 py-4">
                    {/* Desktop (struck out) */}
                    <div className="relative opacity-50">
                        <div className="w-16 h-12 rounded-lg border-2 border-white/30 bg-white/5 flex items-center justify-center">
                            <div className="w-12 h-8 rounded bg-white/10" />
                        </div>
                        <div className="w-6 h-2 bg-white/30 rounded-full mx-auto mt-1" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-0.5 bg-red-500 rotate-45" />
                        </div>
                    </div>
                    
                    <div className="text-primary text-2xl font-bold">→</div>
                    
                    {/* Mobile (highlighted) */}
                    <div className="w-10 h-16 rounded-lg border-2 border-primary bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/30">
                        <div className="w-7 h-12 rounded bg-primary/30" />
                    </div>
                </div>

                {/* Current width info */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="text-sm text-[#666666]">
                        Current width: <span className="text-white font-mono font-bold">{typeof window !== 'undefined' ? window.innerWidth : '?'}px</span>
                    </p>
                    <p className="text-sm text-[#666666] mt-1">
                        Required: <span className="text-primary font-mono font-bold">&lt; {MAX_MOBILE_WIDTH}px</span>
                    </p>
                </div>

                {/* Dismiss button */}
                <button
                    onClick={() => setIsDismissed(true)}
                    className="mt-4 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-full text-white font-semibold transition-all flex items-center gap-2 mx-auto hover:scale-105 active:scale-95"
                >
                    <X className="w-4 h-4" />
                    Continue Anyway
                </button>
            </div>
        </div>
    );
}


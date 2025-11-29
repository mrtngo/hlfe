'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { BarChart3 } from 'lucide-react';

export default function TradingChart() {
    const { t } = useLanguage();

    return (
        <div className="glass-card h-full flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    {t.chart.candlestick}
                </h3>

                <div className="flex items-center gap-2">
                    {(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map((timeframe) => (
                        <button
                            key={timeframe}
                            className="btn-ghost px-3 py-1 text-xs"
                        >
                            {t.chart.timeframes[timeframe]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Placeholder */}
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-tertiary to-secondary relative overflow-hidden">
                {/* Animated Background Grid */}
                <div className="absolute inset-0 opacity-10">
                    <div className="grid grid-cols-8 h-full">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="border-r border-muted"></div>
                        ))}
                    </div>
                    <div className="absolute inset-0 grid grid-rows-8">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="border-b border-muted"></div>
                        ))}
                    </div>
                </div>

                {/* Mock Chart Visualization */}
                <div className="relative z-10 text-center">
                    <div className="flex items-end justify-center gap-1 mb-4">
                        {[45, 65, 42, 78, 55, 82, 68, 90, 75, 95, 88, 72, 85].map((height, i) => (
                            <div
                                key={i}
                                className="w-8 bg-gradient-to-t from-primary to-accent rounded-t animate-fadeIn"
                                style={{
                                    height: `${height}px`,
                                    animationDelay: `${i * 50}ms`,
                                    opacity: 0.6 + (i / 13) * 0.4,
                                }}
                            />
                        ))}
                    </div>
                    <p className="text-muted text-sm">
                        {t.chart.candlestick} • Real-time
                    </p>
                    <p className="text-xs text-muted mt-2 opacity-60">
                        📊 Visualización de gráficos en tiempo real próximamente
                    </p>
                </div>
            </div>
        </div>
    );
}

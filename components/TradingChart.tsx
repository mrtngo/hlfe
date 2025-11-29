'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useCandleData, type Timeframe } from '@/hooks/useCandleData';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BarChart3 } from 'lucide-react';

interface TradingChartProps {
    symbol?: string;
}

export default function TradingChart({ symbol }: TradingChartProps = {}) {
    const { t } = useLanguage();
    const { selectedMarket, getMarket } = useHyperliquid();
    const [timeframe, setTimeframe] = useState<Timeframe>('1h');

    // Get the market to check if it's a stock
    const marketSymbol = symbol || selectedMarket;
    const market = getMarket(marketSymbol);
    const isStock = market?.isStock === true;

    // Fetch candle data
    const { candles, loading, error } = useCandleData(marketSymbol, timeframe, isStock);

    // Format data for recharts - simple line chart with OHLC
    const chartData = candles.map(candle => ({
        time: new Date(candle.time * 1000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        }),
        timestamp: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        price: candle.close, // For the main line
    }));

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-bg-tertiary p-3 rounded-lg shadow-lg border border-white/10">
                    <p className="text-sm font-semibold text-white mb-2">{data.time}</p>
                    <div className="space-y-1 text-xs">
                        <p><span className="text-coffee-medium">O:</span> <span className="font-semibold text-white">${data.open.toFixed(2)}</span></p>
                        <p><span className="text-coffee-medium">H:</span> <span className="font-semibold text-bullish">${data.high.toFixed(2)}</span></p>
                        <p><span className="text-coffee-medium">L:</span> <span className="font-semibold text-bearish">${data.low.toFixed(2)}</span></p>
                        <p><span className="text-coffee-medium">C:</span> <span className="font-semibold text-white">${data.close.toFixed(2)}</span></p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-card h-full flex flex-col bg-bg-secondary rounded-lg shadow-soft-lg min-w-0 border border-white/10">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-semibold text-white">
                        {marketSymbol?.replace('-PERP', '') || 'BTC'}USD · {timeframe} · Hyperliquid
                    </h3>
                    <div className="w-2 h-2 bg-bullish rounded-full"></div>
                </div>

                <div className="flex items-center gap-2">
                    {(['5m', '15m', '1h', '4h', '1d'] as Timeframe[]).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1.5 text-xs rounded transition-all ${
                                timeframe === tf
                                    ? 'bg-primary text-white'
                                    : 'bg-bg-tertiary hover:bg-bg-hover text-coffee-medium hover:text-white'
                            }`}
                        >
                            {tf === '1d' ? 'D' : tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 relative min-h-0 w-full p-4" style={{ minHeight: '400px', minWidth: 0 }}>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 z-10 rounded-b-lg">
                        <div className="text-center">
                            <div className="spinner mx-auto mb-2"></div>
                            <p className="text-sm text-coffee-medium">Loading chart data...</p>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 z-10 rounded-b-lg">
                        <div className="text-center">
                            <p className="text-sm text-bearish">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-2 px-4 py-2 bg-primary text-white rounded text-sm font-semibold hover:bg-primary-light transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}
                {!loading && !error && candles.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 z-10 rounded-b-lg">
                        <div className="text-center p-6">
                            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-coffee-light" />
                            <p className="text-sm font-medium text-coffee-medium mb-2">No chart data available</p>
                            <p className="text-xs text-coffee-light">Chart data will appear here when trading activity is detected</p>
                    </div>
                </div>
                )}
                {!loading && !error && chartData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                            <XAxis 
                                dataKey="time" 
                                stroke="rgba(255, 255, 255, 0.3)"
                                fontSize={12}
                                tick={{ fill: '#808080' }}
                                interval="preserveStartEnd"
                            />
                            <YAxis 
                                stroke="rgba(255, 255, 255, 0.3)"
                                fontSize={12}
                                tick={{ fill: '#808080' }}
                                domain={['dataMin', 'dataMax']}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            {/* Main price line */}
                            <Line 
                                type="monotone" 
                                dataKey="price" 
                                stroke="#00D9FF" 
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: '#00D9FF' }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

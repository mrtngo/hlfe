'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useCandleData, type Timeframe } from '@/hooks/useCandleData';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area } from 'recharts';
import { BarChart3 } from 'lucide-react';

// Rayo Lightning Yellow
const RAYO_YELLOW = '#FFD60A';

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

    // Timeframe options with display labels
    // Note: 1W, 1M, 3M, All all use '1d' interval but represent different date ranges
    type TimeframeOption = { value: Timeframe; label: string; days?: number };
    const timeframeOptions: TimeframeOption[] = [
        { value: '5m', label: '5m' },
        { value: '15m', label: '15m' },
        { value: '30m', label: '30m' },
        { value: '1h', label: '1h' },
        { value: '4h', label: '4h' },
        { value: '1d', label: '1d' },
        { value: '1d', label: '1W', days: 7 },
        { value: '1d', label: '1M', days: 30 },
        { value: '1d', label: '3M', days: 90 },
        { value: '1d', label: 'All', days: 365 },
    ];

    // Track selected display label separately for ranges
    const [selectedLabel, setSelectedLabel] = useState<string>('1h');
    
    // Get the selected option to determine date range
    const selectedOption = timeframeOptions.find(opt => opt.label === selectedLabel);
    const dateRangeDays = selectedOption?.days || 7; // Default to 7 days if not specified
    
    // Fetch candle data with date range
    const { candles, loading, error } = useCandleData(marketSymbol, timeframe, isStock, dateRangeDays);
    
    const currentTimeframeLabel = selectedLabel;

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

    // Calculate min and max prices for Y-axis domain
    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    // Add some padding (2% above and below) for better visualization
    const priceRange = maxPrice - minPrice;
    const yDomainMin = minPrice - (priceRange * 0.02);
    const yDomainMax = maxPrice + (priceRange * 0.02);

    // Custom tooltip - shows price and date
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const date = new Date(data.timestamp * 1000);
            const dateStr = date.toLocaleDateString('en-US', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
            });
            const timeStr = date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
            
            return (
                <div className="bg-bg-tertiary px-4 py-2 rounded-xl shadow-lg border border-white/10">
                    <p className="text-xs text-coffee-medium mb-1">{dateStr} at {timeStr}</p>
                    <p className="text-lg font-bold text-white">${data.price.toFixed(2)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-card h-full flex flex-col bg-bg-secondary rounded-lg shadow-soft-lg min-w-0 border border-white/10">
            <div className="p-4 border-b border-white/10 flex items-center">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-semibold text-white">
                        {marketSymbol?.replace('-USD', '').replace('-PERP', '') || 'BTC'} · {currentTimeframeLabel} · Hyperliquid
                    </h3>
                    <div className="w-2 h-2 bg-bullish rounded-full"></div>
                </div>
            </div>

            {/* Chart Container - Fixed height to avoid ResponsiveContainer dimension issues */}
            <div className="relative w-full p-4" style={{ height: '340px' }}>
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
                        <ComposedChart 
                            data={chartData} 
                            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                        >
                            <defs>
                                {/* Rayo Yellow gradient for area fill */}
                                <linearGradient id="fillRayo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={RAYO_YELLOW} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={RAYO_YELLOW} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            {/* Hidden YAxis to set domain without showing it */}
                            <YAxis hide domain={[yDomainMin, yDomainMax]} />
                            {/* No grid, no visible axes - clean minimal chart */}
                            <Tooltip 
                                content={<CustomTooltip />}
                                cursor={{ stroke: RAYO_YELLOW, strokeWidth: 1, strokeDasharray: '5 5' }}
                            />
                            {/* Area fill with Rayo Yellow gradient */}
                            <Area
                                type="monotone"
                                dataKey="price"
                                fill="url(#fillRayo)"
                                stroke="none"
                            />
                            {/* Main price line - Rayo Yellow */}
                            <Line 
                                type="monotone" 
                                dataKey="price" 
                                stroke={RAYO_YELLOW} 
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 5, fill: RAYO_YELLOW, stroke: RAYO_YELLOW, strokeWidth: 2 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Timeframe buttons - Footer style */}
            <div className="flex items-center justify-evenly px-4 pb-4">
                {timeframeOptions.map((option, index) => {
                    const isSelected = selectedLabel === option.label;
                    return (
                        <button
                            key={`${option.value}-${index}-${option.label}`}
                            onClick={() => {
                                setTimeframe(option.value);
                                setSelectedLabel(option.label);
                            }}
                            className="flex flex-col items-center px-2 py-2 transition-all border-none outline-none"
                            style={{ 
                                color: '#FFFF00', 
                                background: 'transparent',
                                opacity: isSelected ? 1 : 0.5
                            }}
                        >
                            <span className={`text-xs font-semibold ${isSelected ? 'text-[#FFFF00]' : 'text-[#FFFF00]/50'}`}>
                                {option.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

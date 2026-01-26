'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useCandleData, type Timeframe } from '@/hooks/useCandleData';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, Scatter } from 'recharts';
import { BarChart3, Maximize2 } from 'lucide-react';
import { colors } from '@/rayo-design-system/styles/tokens';

// Design System Colors
const CHART_BRAND = colors.brand.primary;      // #FACC15 - Brand yellow
const CHART_POSITIVE = colors.positive;        // #22C55E - Green for entries
const CHART_NEGATIVE = colors.negative;        // #EF4444 - Red for liquidations

interface TradingChartProps {
    symbol?: string;
}

export default function TradingChart({ symbol }: TradingChartProps = {}) {
    const router = useRouter();
    const { t } = useLanguage();
    const { selectedMarket, getMarket, fills, positions } = useHyperliquid();
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

    // Filter fills for the current symbol
    const symbolFills = useMemo(() => {
        if (!fills || fills.length === 0 || !marketSymbol) return [];
        const symbolBase = marketSymbol.replace('-USD', '').replace('-PERP', '').toUpperCase();
        const filtered = fills.filter(fill => {
            const fillCoin = (fill.coin || '').toUpperCase();
            return fillCoin === symbolBase ||
                fillCoin === marketSymbol.toUpperCase() ||
                fillCoin.includes(symbolBase);
        });

        return filtered.slice(0, 20); // Limit to last 20 trades for performance
    }, [fills, marketSymbol]);

    // Get current position for this symbol (for entry line)
    const currentPosition = useMemo(() => {
        if (!positions || !marketSymbol) return null;

        const cleanM = marketSymbol.split('-')[0].split('/')[0].toUpperCase();

        const matched = positions.find(p => {
            const cleanP = p.symbol.split('-')[0].split('/')[0].toUpperCase();
            return cleanP === cleanM;
        });


        return matched;
    }, [positions, marketSymbol]);

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
        <div id="trading-chart" className="h-full flex flex-col min-w-0">
            <div className="mt-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-semibold text-white">
                        {marketSymbol?.replace('-USD', '').replace('-PERP', '') || 'BTC'} · {currentTimeframeLabel}
                    </h3>
                    <div className="w-2 h-2 bg-bullish rounded-full"></div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Position markers legend */}
                    {currentPosition && (
                        <div className="flex items-center gap-3 text-xs">
                            <span className="text-positive">◆ Entry</span>
                            {currentPosition.liquidationPrice > 0 && (
                                <span className="text-negative">◆ Liq</span>
                            )}
                        </div>
                    )}
                    {/* Expand to Advanced Trading */}
                    <button
                        onClick={() => router.push(`/trade?symbol=${marketSymbol}`)}
                        className="p-1.5 rounded-lg bg-bg-secondary hover:bg-bg-elevated transition-colors"
                        title="Advanced Trading"
                    >
                        <Maximize2 className="w-4 h-4 text-primary" />
                    </button>
                </div>
            </div>

            {/* Chart Container - Fixed height to avoid ResponsiveContainer dimension issues */}
            <div className="relative w-full" style={{ height: '340px' }}>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
                        <div className="text-center">
                            <div className="spinner mx-auto mb-2"></div>
                            <p className="text-sm text-coffee-medium">Loading chart data...</p>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
                        <div className="text-center p-6">
                            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-coffee-light" />
                            <p className="text-sm font-medium text-coffee-medium mb-2">No chart data available</p>
                            <p className="text-xs text-coffee-light">Chart data will appear here when trading activity is detected</p>
                        </div>
                    </div>
                )}
                {!loading && !error && chartData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <ComposedChart
                            data={chartData}
                            margin={{ top: 10, right: 0, left: 0, bottom: 10 }}
                        >
                            <defs>
                                {/* Rayo Yellow gradient for area fill */}
                                <linearGradient id="fillRayo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_BRAND} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={CHART_BRAND} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            {/* Hidden YAxis to set domain without showing it */}
                            <YAxis hide domain={[yDomainMin, yDomainMax]} />
                            {/* No grid, no visible axes - clean minimal chart */}
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: CHART_BRAND, strokeWidth: 1, strokeDasharray: '5 5' }}
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
                                stroke={CHART_BRAND}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 5, fill: CHART_BRAND, stroke: CHART_BRAND, strokeWidth: 2 }}
                            />

                            {/* Current position entry price line */}
                            {currentPosition && (
                                <ReferenceLine
                                    y={currentPosition.entryPrice}
                                    stroke={CHART_POSITIVE}
                                    strokeWidth={2}
                                    strokeDasharray="8 4"
                                    label={{
                                        value: `◆ Entry $${currentPosition.entryPrice.toFixed(2)}`,
                                        position: 'insideTopLeft',
                                        fill: CHART_POSITIVE,
                                        fontSize: 10,
                                        fontWeight: 'bold',
                                        style: {
                                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                            paintOrder: 'stroke fill'
                                        }
                                    }}
                                />
                            )}

                            {/* Liquidation price line - RED warning */}
                            {currentPosition && currentPosition.liquidationPrice > 0 && (
                                <ReferenceLine
                                    y={currentPosition.liquidationPrice}
                                    stroke={CHART_NEGATIVE}
                                    strokeWidth={2}
                                    strokeDasharray="4 2"
                                    label={{
                                        value: `◆ Liq $${currentPosition.liquidationPrice.toFixed(2)}`,
                                        position: 'insideBottomLeft',
                                        fill: CHART_NEGATIVE,
                                        fontSize: 10,
                                        fontWeight: 'bold',
                                        style: {
                                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                            paintOrder: 'stroke fill'
                                        }
                                    }}
                                />
                            )}

                            {/* Take Profit price line - CYAN */}
                            {currentPosition && currentPosition.takeProfitPrice && currentPosition.takeProfitPrice > 0 && (
                                <ReferenceLine
                                    y={currentPosition.takeProfitPrice}
                                    stroke="#22D3EE"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    label={{
                                        value: `◆ TP $${currentPosition.takeProfitPrice.toFixed(2)}`,
                                        position: 'insideTopRight',
                                        fill: '#22D3EE',
                                        fontSize: 10,
                                        fontWeight: 'bold',
                                        style: {
                                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                            paintOrder: 'stroke fill'
                                        }
                                    }}
                                />
                            )}

                            {/* Stop Loss price line - ORANGE */}
                            {currentPosition && currentPosition.stopLossPrice && currentPosition.stopLossPrice > 0 && (
                                <ReferenceLine
                                    y={currentPosition.stopLossPrice}
                                    stroke="#F97316"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    label={{
                                        value: `◆ SL $${currentPosition.stopLossPrice.toFixed(2)}`,
                                        position: 'insideBottomRight',
                                        fill: '#F97316',
                                        fontSize: 10,
                                        fontWeight: 'bold',
                                        style: {
                                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                            paintOrder: 'stroke fill'
                                        }
                                    }}
                                />
                            )}

                            {/* Trade fill markers removed - were breaking chart layout */}
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Timeframe buttons - Footer style */}
            <div className="flex items-center justify-evenly pb-4">
                {timeframeOptions.map((option, index) => {
                    const isSelected = selectedLabel === option.label;
                    return (
                        <button
                            key={`${option.value}-${index}-${option.label}`}
                            onClick={() => {
                                setTimeframe(option.value);
                                setSelectedLabel(option.label);
                            }}
                            className={`flex flex-col items-center px-2 py-2 transition-all border-none outline-none ${isSelected ? 'opacity-100' : 'opacity-50'}`}
                            style={{
                                background: 'transparent',
                            }}
                        >
                            <span className="text-xs font-semibold text-brand">
                                {option.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

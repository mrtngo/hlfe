'use client';

import { useEffect, useState, useCallback, useRef, memo, useMemo } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { ComposedChart, Line, Area, Tooltip, ResponsiveContainer, YAxis } from 'recharts';

// Rayo Lightning Yellow
const RAYO_YELLOW = '#FFD60A';

interface PortfolioDataPoint {
    time: number;
    value: number;
    timestamp: number;
}

type TimeframeOption = '1D' | '7D' | '30D' | '90D' | '1Y' | 'All';

function PortfolioChart() {
    // Use cached fills from the provider - no additional API calls!
    const { address, account, fills, userDataLoading } = useHyperliquid();
    const { t } = useLanguage();
    const [timeframe, setTimeframe] = useState<TimeframeOption>('30D');

    // Helper function to calculate timeframe cutoff
    const getTimeframeCutoff = useCallback((now: number, tf: TimeframeOption): number => {
        switch (tf) {
            case '1D': return now - (1 * 24 * 60 * 60 * 1000);
            case '7D': return now - (7 * 24 * 60 * 60 * 1000);
            case '30D': return now - (30 * 24 * 60 * 60 * 1000);
            case '90D': return now - (90 * 24 * 60 * 60 * 1000);
            case '1Y': return now - (365 * 24 * 60 * 60 * 1000);
            case 'All': return 0;
            default: return now - (30 * 24 * 60 * 60 * 1000);
        }
    }, []);

    // Compute portfolio data from fills - memoized for performance
    // Note: Hyperliquid doesn't provide historical account value snapshots,
    // so we reconstruct the portfolio history from trade fills
    const portfolioData = useMemo<PortfolioDataPoint[]>(() => {
        if (!address || account.equity === 0) return [];

        const now = Date.now();
        const cutoffTime = getTimeframeCutoff(now, timeframe);
        const currentEquity = account.equity;

        // If no fills, show a flat line at current value for the timeframe
        if (!fills || fills.length === 0) {
            // Generate points for a flat line across the timeframe
            const startTime = cutoffTime || (now - 30 * 24 * 60 * 60 * 1000);
            return [
                {
                    time: startTime,
                    value: currentEquity,
                    timestamp: Math.floor(startTime / 1000)
                },
                {
                    time: now,
                    value: currentEquity,
                    timestamp: Math.floor(now / 1000)
                }
            ];
        }

        // Sort fills chronologically (oldest first)
        const sortedFills = [...fills].sort((a: any, b: any) => a.time - b.time);
        
        // Filter fills within timeframe (or use all if 'All' selected)
        const relevantFills = cutoffTime > 0 
            ? sortedFills.filter((f: any) => f.time >= cutoffTime)
            : sortedFills;

        // Calculate total realized PnL from ALL fills (not just filtered)
        const totalRealizedPnl = sortedFills.reduce((sum: number, fill: any) => {
            return sum + parseFloat(fill.closedPnl || '0');
        }, 0);

        // Calculate PnL from fills BEFORE the cutoff time
        const pnlBeforeCutoff = sortedFills
            .filter((f: any) => f.time < cutoffTime)
            .reduce((sum: number, fill: any) => sum + parseFloat(fill.closedPnl || '0'), 0);

        // Initial deposit = current equity - total realized PnL
        // This is the original capital before any trading
        const initialDeposit = Math.max(0, currentEquity - totalRealizedPnl);
        
        // Portfolio value at start of timeframe = initial deposit + PnL accumulated before cutoff
        const startingValue = initialDeposit + pnlBeforeCutoff;

        // Build portfolio value over time
        const dataPoints: PortfolioDataPoint[] = [];
        
        // Add starting point at cutoff time (or first fill time if All)
        const startTime = cutoffTime > 0 ? cutoffTime : (relevantFills[0]?.time || now - 30 * 24 * 60 * 60 * 1000);
        dataPoints.push({
            time: startTime,
            value: Math.max(0, startingValue),
            timestamp: Math.floor(startTime / 1000)
        });

        // Group fills by day for cleaner visualization
        const dailyData: { [key: string]: { pnl: number; timestamp: number } } = {};
        
        relevantFills.forEach((fill: any) => {
            const date = new Date(fill.time);
            const dayKey = date.toISOString().split('T')[0];
            const pnl = parseFloat(fill.closedPnl || '0');
            
            if (!dailyData[dayKey]) {
                dailyData[dayKey] = { pnl: 0, timestamp: fill.time };
            }
            dailyData[dayKey].pnl += pnl;
            // Keep the latest timestamp for the day
            if (fill.time > dailyData[dayKey].timestamp) {
                dailyData[dayKey].timestamp = fill.time;
            }
        });

        // Build cumulative portfolio value
        let runningValue = startingValue;
        Object.keys(dailyData).sort().forEach(dayKey => {
            runningValue += dailyData[dayKey].pnl;
            const portfolioValue = Math.max(0, runningValue);
            
            dataPoints.push({
                time: new Date(dayKey).getTime() + 12 * 60 * 60 * 1000, // Midday for cleaner display
                value: portfolioValue,
                timestamp: Math.floor(dailyData[dayKey].timestamp / 1000)
            });
        });

        // Add current value as the last point
        dataPoints.push({
            time: now,
            value: currentEquity,
            timestamp: Math.floor(now / 1000)
        });

        // Remove duplicates and sort by time
        const uniquePoints = dataPoints.reduce((acc: PortfolioDataPoint[], point) => {
            const existing = acc.find(p => Math.abs(p.time - point.time) < 3600000); // Within 1 hour
            if (!existing) {
                acc.push(point);
            }
            return acc;
        }, []);

        return uniquePoints.sort((a, b) => a.time - b.time);
    }, [address, account.equity, fills, timeframe, getTimeframeCutoff]);

    // Timeframe options
    const timeframeOptions: TimeframeOption[] = ['1D', '7D', '30D', '90D', '1Y', 'All'];

    // Prepare chart data
    const chartData = portfolioData.map(point => ({
        time: new Date(point.time).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        }),
        timestamp: point.timestamp,
        value: point.value,
    }));

    // Calculate min and max for Y-axis domain
    const values = chartData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;
    const yDomainMin = minValue - (valueRange * 0.02);
    const yDomainMax = maxValue + (valueRange * 0.02);

    // Memoized timeframe change handler
    const handleTimeframeChange = useCallback((newTimeframe: TimeframeOption) => {
        setTimeframe(newTimeframe);
    }, []);

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const date = new Date(data.timestamp * 1000);
            const dateStr = date.toLocaleDateString('en-US', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
            });
            
            return (
                <div className="bg-bg-tertiary px-4 py-2 rounded-xl shadow-lg border border-white/10">
                    <p className="text-xs text-coffee-medium mb-1">{dateStr}</p>
                    <p className="text-lg font-bold text-white">${data.value.toFixed(2)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full">
            {/* Title */}
            <h4 className="text-sm font-semibold text-coffee-medium mb-4">{t.home.portfolioHistory}</h4>

            {/* Chart */}
            <div className="w-full relative" style={{ height: '180px' }}>
                {userDataLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 z-10 rounded-lg">
                        <div className="text-center">
                            <div className="spinner mx-auto mb-2"></div>
                            <p className="text-sm text-coffee-medium">Loading chart...</p>
                        </div>
                    </div>
                )}
                {!userDataLoading && portfolioData.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 z-10 rounded-lg">
                        <p className="text-sm text-coffee-medium">No data available</p>
                    </div>
                )}
                {!userDataLoading && chartData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart 
                            data={chartData} 
                            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                        >
                            <defs>
                                <linearGradient id="portfolioFillRayo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={RAYO_YELLOW} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={RAYO_YELLOW} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <YAxis hide domain={[yDomainMin, yDomainMax]} />
                            <Tooltip 
                                content={<CustomTooltip />}
                                cursor={{ stroke: RAYO_YELLOW, strokeWidth: 1, strokeDasharray: '5 5' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                fill="url(#portfolioFillRayo)"
                                stroke="none"
                            />
                            <Line 
                                type="monotone" 
                                dataKey="value" 
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
            <div className="flex items-center justify-evenly mt-4 px-2">
                {timeframeOptions.map((option) => {
                    const isSelected = timeframe === option;
                    return (
                        <button
                            key={option}
                            onClick={() => handleTimeframeChange(option)}
                            className="flex flex-col items-center px-4 py-2 transition-all border-none outline-none"
                            style={{ 
                                color: '#FFFF00', 
                                background: 'transparent',
                                opacity: isSelected ? 1 : 0.5
                            }}
                        >
                            <span className={`text-xs font-semibold ${isSelected ? 'text-[#FFFF00]' : 'text-[#FFFF00]/50'}`}>
                                {option}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Export memoized version to prevent unnecessary re-renders
const MemoizedPortfolioChart = memo(PortfolioChart);
MemoizedPortfolioChart.displayName = 'PortfolioChart';
export default MemoizedPortfolioChart;


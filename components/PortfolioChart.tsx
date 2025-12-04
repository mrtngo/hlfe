'use client';

import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { createHyperliquidClient } from '@/lib/hyperliquid/client';
import { ComposedChart, Line, Area, Tooltip, ResponsiveContainer, YAxis } from 'recharts';
import { ChevronDown } from 'lucide-react';

// Rayo Lightning Yellow
const RAYO_YELLOW = '#FFD60A';

interface PortfolioDataPoint {
    time: number;
    value: number;
    timestamp: number;
}

type TimeframeOption = '1D' | '7D' | '30D' | '90D' | '1Y' | 'All';

function PortfolioChart() {
    const { address, account } = useHyperliquid();
    const [portfolioData, setPortfolioData] = useState<PortfolioDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<TimeframeOption>('30D');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debounce the fetch to avoid rate limits when rapidly changing timeframes
    useEffect(() => {
        // Clear any pending fetch
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        // Set loading immediately
        setLoading(true);

        // Debounce the actual fetch by 300ms
        fetchTimeoutRef.current = setTimeout(() => {
            fetchPortfolioHistory();
        }, 300);

        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, [address, timeframe]); // Removed account.equity to prevent unnecessary refetches

    const fetchPortfolioHistory = async () => {
            if (!address) {
                setPortfolioData([]);
                setLoading(false);
                return;
            }

            try {
                const client = createHyperliquidClient();
                
                // Fetch user funding history - this gives us account value snapshots
                let accountSnapshots: any[] = [];
                try {
                    accountSnapshots = await client.info.perpetuals.getUserFunding(address.toLowerCase());
                } catch (err: any) {
                    console.log('Funding history not available:', err.message || err);
                    accountSnapshots = [];
                }

                // If we have funding history, use that for more accurate snapshots
                if (accountSnapshots && accountSnapshots.length > 0) {
                    console.log('Using funding history for portfolio chart:', accountSnapshots.length, 'snapshots');
                    
                    // Group by day and take last value of each day
                    const dailySnapshots: { [key: string]: { value: number; time: number } } = {};
                    
                    accountSnapshots.forEach((snapshot: any) => {
                        const time = snapshot.time;
                        const date = new Date(time);
                        const dayKey = date.toISOString().split('T')[0];
                        
                        // funding history has account value snapshots
                        const accountValue = parseFloat(snapshot.usdc || '0');
                        
                        if (!dailySnapshots[dayKey] || time > dailySnapshots[dayKey].time) {
                            dailySnapshots[dayKey] = { value: accountValue, time };
                        }
                    });
                    
                    const dataPoints: PortfolioDataPoint[] = Object.keys(dailySnapshots)
                        .sort()
                        .map(dateKey => ({
                            time: new Date(dateKey).getTime(),
                            value: dailySnapshots[dateKey].value,
                            timestamp: Math.floor(dailySnapshots[dateKey].time / 1000)
                        }));
                    
                    // Add current value
                    dataPoints.push({
                        time: Date.now(),
                        value: account.equity,
                        timestamp: Math.floor(Date.now() / 1000)
                    });
                    
                    // Filter by timeframe
                    const now = Date.now();
                    let cutoffTime = getTimeframeCutoff(now, timeframe);
                    
                    const filteredData = dataPoints.filter(d => d.time >= cutoffTime);
                    setPortfolioData(filteredData.length > 0 ? filteredData : dataPoints);
                    setLoading(false);
                    return;
                }
                
                // Fallback: reconstruct from fills
                let fills: any[] = [];
                try {
                    fills = await client.info.getUserFills(address.toLowerCase());
                } catch (err: any) {
                    console.log('User fills not available:', err.message || err);
                    fills = [];
                }

                if (!fills || fills.length === 0) {
                    // No history, show flat line at current value
                    const now = Date.now();
                    setPortfolioData([
                        {
                            time: now - (24 * 60 * 60 * 1000),
                            value: account.equity,
                            timestamp: Math.floor((now - (24 * 60 * 60 * 1000)) / 1000)
                        },
                        {
                            time: now,
                            value: account.equity,
                            timestamp: Math.floor(now / 1000)
                        }
                    ]);
                    setLoading(false);
                    return;
                }

                console.log('Reconstructing portfolio from fills:', fills.length, 'fills');
                
                // Sort fills chronologically
                const sortedFills = [...fills].sort((a: any, b: any) => a.time - b.time);
                
                // Calculate total realized PnL from all fills
                const totalRealizedPnl = sortedFills.reduce((sum: number, fill: any) => {
                    return sum + parseFloat(fill.closedPnl || '0');
                }, 0);
                
                // Starting portfolio value = current equity - total realized PnL
                const startingValue = Math.max(0, account.equity - totalRealizedPnl);
                
                console.log('Portfolio reconstruction:', {
                    currentEquity: account.equity,
                    totalRealizedPnl: totalRealizedPnl,
                    calculatedStartingValue: startingValue
                });
                
                // Build portfolio value over time
                const dataPoints: PortfolioDataPoint[] = [];
                let runningPnl = 0;
                
                // Add starting point (first trade date)
                const firstTradeTime = sortedFills[0].time;
                dataPoints.push({
                    time: firstTradeTime,
                    value: startingValue,
                    timestamp: Math.floor(firstTradeTime / 1000)
                });
                
                // Group fills by hour for smoother line
                const hourlyData: { [key: string]: { pnl: number; timestamp: number } } = {};
                
                sortedFills.forEach((fill: any) => {
                    const date = new Date(fill.time);
                    // Round to nearest hour
                    date.setMinutes(0, 0, 0);
                    const hourKey = date.toISOString();
                    
                    const pnl = parseFloat(fill.closedPnl || '0');
                    
                    if (!hourlyData[hourKey]) {
                        hourlyData[hourKey] = { pnl: 0, timestamp: fill.time };
                    }
                    
                    hourlyData[hourKey].pnl += pnl;
                });
                
                // Build cumulative portfolio value
                Object.keys(hourlyData).sort().forEach(hourKey => {
                    runningPnl += hourlyData[hourKey].pnl;
                    const portfolioValue = Math.max(0, startingValue + runningPnl);
                    
                    dataPoints.push({
                        time: new Date(hourKey).getTime(),
                        value: portfolioValue,
                        timestamp: Math.floor(hourlyData[hourKey].timestamp / 1000)
                    });
                });

                // Add current value as the last point
                dataPoints.push({
                    time: Date.now(),
                    value: account.equity,
                    timestamp: Math.floor(Date.now() / 1000)
                });

                // Filter based on selected timeframe
                const now = Date.now();
                let cutoffTime = getTimeframeCutoff(now, timeframe);
                
                const filteredData = dataPoints.filter(d => d.time >= cutoffTime);
                setPortfolioData(filteredData.length > 0 ? filteredData : dataPoints);
            } catch (error: any) {
                console.error('Error fetching portfolio history:', error.message || error);
                // Fallback to flat line at current value showing last 7 days
                const now = Date.now();
                const dataPoints: PortfolioDataPoint[] = [];
                
                // Create a simple line showing current value over the selected timeframe
                const daysToShow = timeframe === '1D' ? 1 : timeframe === '7D' ? 7 : timeframe === '30D' ? 30 : timeframe === '90D' ? 90 : timeframe === '1Y' ? 365 : 7;
                const startTime = now - (daysToShow * 24 * 60 * 60 * 1000);
                
                // Add a few points to show a flat line
                for (let i = 0; i <= 3; i++) {
                    const pointTime = startTime + ((now - startTime) * i / 3);
                    dataPoints.push({
                        time: pointTime,
                        value: account.equity,
                        timestamp: Math.floor(pointTime / 1000)
                    });
                }
                
                setPortfolioData(dataPoints);
            } finally {
                setLoading(false);
            }
    };

    // Helper function to calculate timeframe cutoff
    const getTimeframeCutoff = (now: number, tf: TimeframeOption): number => {
        switch (tf) {
            case '1D':
                return now - (1 * 24 * 60 * 60 * 1000);
            case '7D':
                return now - (7 * 24 * 60 * 60 * 1000);
            case '30D':
                return now - (30 * 24 * 60 * 60 * 1000);
            case '90D':
                return now - (90 * 24 * 60 * 60 * 1000);
            case '1Y':
                return now - (365 * 24 * 60 * 60 * 1000);
            case 'All':
                return 0;
            default:
                return now - (30 * 24 * 60 * 60 * 1000);
        }
    };

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
        setIsDropdownOpen(false);
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
            {/* Timeframe selector */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-coffee-medium">Portfolio History</h4>
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="px-3 py-1.5 text-xs rounded-lg transition-all font-semibold flex items-center gap-2 bg-primary/20 hover:bg-primary/30 text-white border border-primary/30"
                    >
                        <span>{timeframe}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                        <>
                            <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setIsDropdownOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 bg-bg-secondary border border-white/10 rounded-lg shadow-lg z-20 min-w-[100px] overflow-hidden">
                                {timeframeOptions.map((option) => {
                                    const isSelected = timeframe === option;
                                    
                                    return (
                                        <button
                                            key={option}
                                            onClick={() => handleTimeframeChange(option)}
                                            className={`w-full px-4 py-2 text-xs text-left transition-all font-semibold ${
                                                isSelected 
                                                    ? 'bg-primary text-primary-foreground' 
                                                    : 'text-white hover:bg-bg-hover'
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Chart */}
            <div className="w-full relative" style={{ height: '200px' }}>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 z-10 rounded-lg">
                        <div className="text-center">
                            <div className="spinner mx-auto mb-2"></div>
                            <p className="text-sm text-coffee-medium">Loading chart...</p>
                        </div>
                    </div>
                )}
                {!loading && portfolioData.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 z-10 rounded-lg">
                        <p className="text-sm text-coffee-medium">No data available</p>
                    </div>
                )}
                {!loading && chartData.length > 0 && (
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
        </div>
    );
}

// Export memoized version to prevent unnecessary re-renders
const MemoizedPortfolioChart = memo(PortfolioChart);
MemoizedPortfolioChart.displayName = 'PortfolioChart';
export default MemoizedPortfolioChart;


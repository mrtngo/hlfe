'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
    createChart,
    ColorType,
    CandlestickSeries,
    HistogramSeries,
    type IChartApi,
    type ISeriesApi,
    type CandlestickData,
    type Time
} from 'lightweight-charts';
import { useCandleData, type Timeframe } from '@/hooks/useCandleData';
import { useHyperliquid } from '@/hooks/useHyperliquid';

// Rayo theme colors
const RAYO_YELLOW = '#FFD60A';
const BULLISH = '#00C853';
const BEARISH = '#FF3D00';
const BG_PRIMARY = '#0a0a0a';
const GRID_COLOR = '#1a1a1a';
const TEXT_COLOR = '#888888';

interface CandlestickChartProps {
    symbol?: string;
    height?: number;
    showVolume?: boolean;
    onTimeframeChange?: (tf: Timeframe) => void;
}

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: '1d', label: '1D' },
];

export default function CandlestickChart({
    symbol,
    height = 400,
    showVolume = true,
    onTimeframeChange
}: CandlestickChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

    const [timeframe, setTimeframe] = useState<Timeframe>('1h');
    const [isReady, setIsReady] = useState(false);

    const { selectedMarket, getMarket, positions } = useHyperliquid();
    const marketSymbol = symbol || selectedMarket;
    const market = getMarket(marketSymbol);
    const isStock = market?.isStock === true;

    // Get current position for entry/liq lines
    const currentPosition = positions?.find(p => p.symbol === marketSymbol);

    // Fetch candle data
    const { candles, loading, error } = useCandleData(marketSymbol, timeframe, isStock, 100);

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Create chart with v5 API
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: height,
            layout: {
                background: { type: ColorType.Solid, color: BG_PRIMARY },
                textColor: TEXT_COLOR,
            },
            grid: {
                vertLines: { color: GRID_COLOR },
                horzLines: { color: GRID_COLOR },
            },
            crosshair: {
                mode: 1, // Magnet mode
                vertLine: {
                    color: RAYO_YELLOW,
                    width: 1,
                    style: 2, // Dashed
                    labelBackgroundColor: RAYO_YELLOW,
                },
                horzLine: {
                    color: RAYO_YELLOW,
                    width: 1,
                    style: 2,
                    labelBackgroundColor: RAYO_YELLOW,
                },
            },
            rightPriceScale: {
                borderColor: GRID_COLOR,
                scaleMargins: {
                    top: 0.1,
                    bottom: showVolume ? 0.2 : 0.1,
                },
            },
            timeScale: {
                borderColor: GRID_COLOR,
                timeVisible: true,
                secondsVisible: false,
            },
        });

        // Add candlestick series with v5 API
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: BULLISH,
            downColor: BEARISH,
            borderUpColor: BULLISH,
            borderDownColor: BEARISH,
            wickUpColor: BULLISH,
            wickDownColor: BEARISH,
        });

        // Add volume series if enabled
        let volumeSeries: ISeriesApi<'Histogram'> | null = null;
        if (showVolume) {
            volumeSeries = chart.addSeries(HistogramSeries, {
                color: RAYO_YELLOW,
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: 'volume',
            });

            chart.priceScale('volume').applyOptions({
                scaleMargins: {
                    top: 0.85,
                    bottom: 0,
                },
            });
        }

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;
        setIsReady(true);

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth
                });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
            volumeSeriesRef.current = null;
            setIsReady(false);
        };
    }, [height, showVolume]);

    // Update data when candles change
    useEffect(() => {
        if (!isReady || !candleSeriesRef.current || candles.length === 0) return;

        // Format candles for lightweight-charts
        const formattedCandles: CandlestickData<Time>[] = candles.map(c => ({
            time: c.time as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        candleSeriesRef.current.setData(formattedCandles);

        // Set volume data
        if (showVolume && volumeSeriesRef.current) {
            const volumeData = candles.map(c => ({
                time: c.time as Time,
                value: c.volume || 0,
                color: c.close >= c.open ? BULLISH + '60' : BEARISH + '60',
            }));
            volumeSeriesRef.current.setData(volumeData);
        }

        // Add position lines
        if (currentPosition && candleSeriesRef.current) {
            // Entry price line
            candleSeriesRef.current.createPriceLine({
                price: currentPosition.entryPrice,
                color: BULLISH,
                lineWidth: 2,
                lineStyle: 2, // Dashed
                axisLabelVisible: true,
                title: 'Entry',
            });

            // Liquidation price line
            if (currentPosition.liquidationPrice > 0) {
                candleSeriesRef.current.createPriceLine({
                    price: currentPosition.liquidationPrice,
                    color: BEARISH,
                    lineWidth: 2,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: 'Liq',
                });
            }
        }

        // Fit content
        chartRef.current?.timeScale().fitContent();
    }, [candles, isReady, showVolume, currentPosition]);

    const handleTimeframeChange = useCallback((tf: Timeframe) => {
        setTimeframe(tf);
        onTimeframeChange?.(tf);
    }, [onTimeframeChange]);

    return (
        <div className="flex flex-col h-full bg-bg-primary rounded-xl overflow-hidden">
            {/* Timeframe selector */}
            <div className="flex items-center gap-1 p-2 bg-bg-secondary border-b border-white/5">
                <span className="text-xs text-coffee-light mr-2 font-medium">
                    {marketSymbol?.replace('-USD', '')}
                </span>
                {TIMEFRAMES.map(tf => (
                    <button
                        key={tf.value}
                        onClick={() => handleTimeframeChange(tf.value)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${timeframe === tf.value
                            ? 'bg-primary text-black'
                            : 'text-coffee-medium hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tf.label}
                    </button>
                ))}
            </div>

            {/* Chart container */}
            <div className="flex-1 relative" style={{ minHeight: height }}>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                        <div className="text-center">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-xs text-coffee-medium">Loading chart...</p>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                        <p className="text-xs text-bearish">{error}</p>
                    </div>
                )}
                <div ref={chartContainerRef} className="w-full" style={{ height }} />
            </div>
        </div>
    );
}

'use client';

import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { TrendingUp, DollarSign, Activity, ArrowUpCircle, ArrowDownCircle, Zap } from 'lucide-react';

export default function MarketStats() {
    const { selectedMarket, getMarket } = useHyperliquid();
    const { formatCurrency, formatPercent } = useLanguage();

    const market = getMarket(selectedMarket);

    if (!market) {
        return null;
    }

    // Convert open interest to USD (OI is in token terms, multiply by price)
    const openInterestUSD = market.openInterest * market.price;

    // Format large numbers with B/M suffix
    const formatLargeNumber = (value: number): string => {
        if (value >= 1_000_000_000) {
            return `$${(value / 1_000_000_000).toFixed(2)}B`;
        } else if (value >= 1_000_000) {
            return `$${(value / 1_000_000).toFixed(2)}M`;
        } else {
            return formatCurrency(value);
        }
    };

    // Format funding rate with more precision (4 decimal places)
    const formatFundingRate = (rate: number): string => {
        const sign = rate >= 0 ? '+' : '';
        return `${sign}${rate.toFixed(4)}%`;
    };

    // Calculate 24h high/low from current price and 24h change
    // This is an approximation until we get real high/low data
    const prevDayPrice = market.price / (1 + market.change24h / 100);
    const estimatedHigh = market.change24h >= 0 ? market.price : Math.max(market.price, prevDayPrice);
    const estimatedLow = market.change24h >= 0 ? Math.min(market.price, prevDayPrice) : market.price;

    const stats = [
        {
            icon: Activity,
            label: 'Open Interest',
            value: formatLargeNumber(openInterestUSD),
            color: '#FFD60A', // Rayo yellow
        },
        {
            icon: DollarSign,
            label: '24h Volume',
            value: formatLargeNumber(market.volume24h),
            color: '#00D9FF', // Cyan
        },
        {
            icon: TrendingUp,
            label: 'Funding Rate',
            value: formatFundingRate(market.fundingRate),
            color: market.fundingRate >= 0 ? '#00FF00' : '#FF4444',
        },
        {
            icon: Zap,
            label: 'Max Leverage',
            value: `${market.maxLeverage}x`,
            color: '#FF00FF', // Magenta
        },
        {
            icon: ArrowUpCircle,
            label: '24h High',
            value: formatCurrency(estimatedHigh),
            color: '#00FF00', // Green
        },
        {
            icon: ArrowDownCircle,
            label: '24h Low',
            value: formatCurrency(estimatedLow),
            color: '#FF4444', // Red
        },
    ];

    return (
        <div className="grid grid-cols-3 gap-2 mb-4">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={index}
                        className="rounded-lg p-2.5 transition-all"
                        style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            border: `1px solid ${stat.color}40`,
                            boxShadow: `0 2px 8px rgba(0, 0, 0, 0.3), 0 0 8px ${stat.color}15`,
                        }}
                    >
                        <div className="flex items-center gap-1.5 mb-1">
                            <Icon
                                className="w-3 h-3"
                                style={{ color: stat.color }}
                            />
                            <span
                                className="text-[9px] font-semibold uppercase tracking-wider"
                                style={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                }}
                            >
                                {stat.label}
                            </span>
                        </div>
                        <div
                            className="font-mono font-bold text-xs"
                            style={{
                                color: stat.color,
                                textShadow: `0 0 8px ${stat.color}40`,
                            }}
                        >
                            {stat.value}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

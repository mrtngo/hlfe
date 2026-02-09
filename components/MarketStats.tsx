'use client';

import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { TrendingUp, DollarSign, Activity, ArrowUpCircle, ArrowDownCircle, Zap } from 'lucide-react';
import styles from './MarketStats.module.css';

type StatVariant = 'brand' | 'info' | 'positive' | 'negative' | 'warning';

interface StatItem {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    variant: StatVariant;
}

export default function MarketStats() {
    const { selectedMarket, getMarket } = useHyperliquid();
    const market = getMarket(selectedMarket);
    const { t, formatCurrency } = useLanguage();

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
    const prevDayPrice = market.price / (1 + market.change24h / 100);
    const estimatedHigh = market.change24h >= 0 ? market.price : Math.max(market.price, prevDayPrice);
    const estimatedLow = market.change24h >= 0 ? Math.min(market.price, prevDayPrice) : market.price;

    const stats: StatItem[] = [
        {
            icon: Activity,
            label: t.marketStats.openInterest,
            value: formatLargeNumber(openInterestUSD),
            variant: 'brand',
        },
        {
            icon: DollarSign,
            label: t.marketStats.volume24h,
            value: formatLargeNumber(market.volume24h),
            variant: 'info',
        },
        {
            icon: TrendingUp,
            label: t.marketStats.fundingRate,
            value: formatFundingRate(market.fundingRate),
            variant: market.fundingRate >= 0 ? 'positive' : 'negative',
        },
        {
            icon: Zap,
            label: t.marketStats.maxLeverage,
            value: `${market.maxLeverage}x`,
            variant: 'warning',
        },
        {
            icon: ArrowUpCircle,
            label: t.marketStats.high24h,
            value: formatCurrency(estimatedHigh),
            variant: 'positive',
        },
        {
            icon: ArrowDownCircle,
            label: t.marketStats.low24h,
            value: formatCurrency(estimatedLow),
            variant: 'negative',
        },
    ];

    return (
        <div className={styles.container}>
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={index}
                        className={`${styles.stat} ${styles[`stat--${stat.variant}`]}`}
                    >
                        <div className={styles.header}>
                            <Icon className={`${styles.icon} ${styles[`icon--${stat.variant}`]}`} />
                            <span className={styles.label}>
                                {stat.label}
                            </span>
                        </div>
                        <div className={`${styles.value} ${styles[`value--${stat.variant}`]}`}>
                            {stat.value}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

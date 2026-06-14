import type { Market } from '@/types/market';

const MAX_PERP_DECIMALS = 6;
const MAX_SPOT_DECIMALS = 8;

export function priceDecimalsFromMarket(
    market: Pick<Market, 'price' | 'szDecimals' | 'priceDecimals'> | null | undefined,
): number {
    const price = market?.price ?? 0;
    if (!Number.isFinite(price) || price <= 0) return 2;
    if (typeof market?.priceDecimals === 'number') return market.priceDecimals;

    return priceDecimalsFromRules(price, market?.szDecimals ?? 0);
}

export function priceDecimalsFromRules(price: number, szDecimals: number, isSpot = false): number {
    if (!Number.isFinite(price) || price <= 0) return 2;

    const maxDecimals = (isSpot ? MAX_SPOT_DECIMALS : MAX_PERP_DECIMALS) - szDecimals;
    if (price >= 1000) return 2;
    if (price >= 1) return Math.max(2, Math.min(3, maxDecimals));

    const leadingZeros = Math.max(0, Math.ceil(-Math.log10(price)));
    return Math.max(2, Math.min(leadingZeros + 3, maxDecimals));
}

export function formatUsdPrice(
    price: number,
    market?: Pick<Market, 'price' | 'szDecimals' | 'priceDecimals'> | null,
): string {
    const decimals = priceDecimalsFromMarket(market ?? { price, szDecimals: 0 });
    return price.toLocaleString('en-US', {
        maximumFractionDigits: decimals,
        minimumFractionDigits: Math.min(2, decimals),
    });
}

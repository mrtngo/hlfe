import { describe, expect, it } from 'vitest';
import { formatUsdPrice, priceDecimalsFromRules } from '@/lib/format/price';

describe('price formatting', () => {
    it('keeps meaningful decimals for one-dollar-ish assets', () => {
        expect(formatUsdPrice(1.58, { price: 1.58, szDecimals: 2 })).toBe('1.58');
    });

    it('uses explicit market price decimals when supplied', () => {
        expect(formatUsdPrice(1.58, { price: 1.58, szDecimals: 2, priceDecimals: 2 })).toBe('1.58');
    });

    it('expands precision for tiny assets without exceeding exchange precision', () => {
        expect(priceDecimalsFromRules(0.00001234, 0)).toBe(6);
        expect(priceDecimalsFromRules(0.00001234, 0, true)).toBe(8);
        expect(priceDecimalsFromRules(0.00001234, 4)).toBe(2);
    });
});

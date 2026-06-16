import { describe, expect, it } from 'vitest';
import { toCsv } from '@/lib/tax/csv';

describe('tax export CSV formatting', () => {
    it('escapes commas, quotes, and newlines', () => {
        expect(toCsv([
            {
                time: '2026-01-01T00:00:00Z',
                symbol: 'BTC',
                note: 'fee, builder "rayo"',
                nested: { tx: '0xabc' },
            },
            {
                time: '2026-01-02T00:00:00Z',
                symbol: 'ETH',
                note: 'line\nbreak',
                nested: null,
            },
        ], ['time', 'symbol', 'note', 'nested'])).toBe([
            'time,symbol,note,nested',
            '2026-01-01T00:00:00Z,BTC,"fee, builder ""rayo""","{""tx"":""0xabc""}"',
            '2026-01-02T00:00:00Z,ETH,"line\nbreak",',
        ].join('\n'));
    });
});

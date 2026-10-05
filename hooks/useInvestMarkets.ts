'use client';

// Live data for the "Invertir" list: price, 24h change and 24h volume for the
// curated spot assets (lib/invest/assets), plus any other liquid crypto pair.

import { useQuery } from '@tanstack/react-query';
import { API_URL } from '@/lib/hyperliquid/client';
import {
    INVEST_ASSETS,
    DYNAMIC_MIN_VOLUME,
    NOT_INVESTABLE,
    type InvestAssetSpec,
    type InvestCategory,
} from '@/lib/invest/assets';

export interface InvestMarket {
    key: string;
    ticker: string;
    name: string;
    logo: string;
    category: InvestCategory;
    /** Exact pair id passed to placeOrder, e.g. "@702". */
    pair: string;
    /** Base token index (to match the user's spot balance). */
    tokenIndex: number;
    szDecimals: number;
    price: number;
    change24h: number;
    volume24h: number;
}

interface Tok { name: string; index: number; szDecimals: number; fullName?: string | null }
interface Pair { name: string; tokens: [number, number]; index: number }
interface Ctx { coin: string; markPx?: string; prevDayPx?: string; dayNtlVlm?: string }

/** Known wrapper tokens → the ticker people know. */
const EXTRA_TICKERS: Record<string, string> = { ONEAR: 'NEAR' };

function build(meta: { tokens: Tok[]; universe: Pair[] }, ctxs: Ctx[]): InvestMarket[] {
    const tokByIdx = new Map(meta.tokens.map((t) => [t.index, t]));
    // Contexts are NOT position-aligned with universe — join by coin.
    const ctxByCoin = new Map(ctxs.filter((c) => c?.coin).map((c) => [c.coin, c]));
    const usdcPairs = meta.universe.filter((p) => tokByIdx.get(p.tokens[1])?.name === 'USDC');

    const toMarket = (spec: Pick<InvestAssetSpec, 'key' | 'ticker' | 'name' | 'logo' | 'category'>, pair: Pair): InvestMarket | null => {
        const tok = tokByIdx.get(pair.tokens[0]);
        const c = ctxByCoin.get(pair.name);
        if (!tok || !c) return null;
        const price = parseFloat(c.markPx || '0');
        const prev = parseFloat(c.prevDayPx || '0');
        return {
            ...spec,
            pair: pair.name,
            tokenIndex: tok.index,
            szDecimals: tok.szDecimals,
            price,
            change24h: prev > 0 && price > 0 ? ((price - prev) / prev) * 100 : 0,
            volume24h: parseFloat(c.dayNtlVlm || '0'),
        };
    };

    const out: InvestMarket[] = [];
    const usedTokens = new Set<number>();
    for (const spec of INVEST_ASSETS) {
        // Pinned id first, but only if its base is the expected token name.
        let pair = usdcPairs.find((p) => p.name === spec.pair && tokByIdx.get(p.tokens[0])?.name === spec.base);
        if (!pair) {
            // Fallback: highest-volume USDC pair for that base name.
            pair = usdcPairs
                .filter((p) => tokByIdx.get(p.tokens[0])?.name === spec.base)
                .sort((a, b) => parseFloat(ctxByCoin.get(b.name)?.dayNtlVlm || '0') - parseFloat(ctxByCoin.get(a.name)?.dayNtlVlm || '0'))[0];
        }
        const m = pair && toMarket(spec, pair);
        if (m) {
            out.push(m);
            usedTokens.add(m.tokenIndex);
        }
    }

    // Other liquid crypto, by volume.
    const extras = usdcPairs
        .map((p) => ({ p, tok: tokByIdx.get(p.tokens[0]), vol: parseFloat(ctxByCoin.get(p.name)?.dayNtlVlm || '0') }))
        .filter(({ tok, vol }) => tok && !usedTokens.has(tok.index) && !NOT_INVESTABLE.has(tok.name) && vol >= DYNAMIC_MIN_VOLUME)
        .sort((a, b) => b.vol - a.vol);
    for (const { p, tok } of extras) {
        // Bridged wrappers carry prefixes/suffixes ("UNEAR", "ONEAR", "XMR1",
        // "XMR - Wagyu.xyz") — show the asset people recognize.
        const ticker = (EXTRA_TICKERS[tok!.name] ?? tok!.name.replace(/^U(?=[A-Z]{2,})/, '').replace(/(?<=[A-Z]{2,})[01]$/, ''));
        const name = (tok!.fullName || '').replace(/^Unit\s+/i, '').replace(/\s+-\s+.*$/, '').trim() || ticker;
        const m = toMarket({ key: `x:${p.name}`, ticker, name, logo: ticker, category: 'crypto' }, p);
        if (m) out.push(m);
    }
    return out;
}

export function useInvestMarkets() {
    return useQuery<InvestMarket[]>({
        queryKey: ['invest-markets'],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'spotMetaAndAssetCtxs' }),
            });
            if (!res.ok) throw new Error(`spot meta ${res.status}`);
            const [meta, ctxs] = await res.json();
            return build(meta, ctxs);
        },
        staleTime: 20_000,
        refetchInterval: 30_000,
    });
}

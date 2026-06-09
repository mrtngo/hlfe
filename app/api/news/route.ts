// /api/news — free crypto-news aggregator.
//
// Pulls a handful of public RSS feeds (Spanish-first, plus the two biggest
// English outlets), normalizes them into one list and caches in memory for
// 5 minutes — so the upstream sites see at most ~1 request per feed per
// 5 min regardless of traffic. No API keys, no rate limits.
//
// Shaped for the V2 NewsScreen: each item carries naive ticker tags (title
// keyword match) and a cheap sentiment hint (up/down keyword match) used for
// the Alcista/Bajista badge. Both are heuristics — good enough for a feed,
// not trading signals.

import { NextResponse } from 'next/server';

export interface NewsItem {
    id: string;
    title: string;
    url: string;
    source: string;
    lang: 'es' | 'en';
    /** Unix ms. */
    publishedAt: number;
    image: string | null;
    tickers: string[];
    sentiment: 'up' | 'down' | null;
}

const FEEDS: { source: string; url: string; lang: 'es' | 'en' }[] = [
    // NOTE: Cointelegraph retired its Spanish RSS (es.cointelegraph.com/rss → 410).
    { source: 'CriptoNoticias', url: 'https://www.criptonoticias.com/feed/', lang: 'es' },
    { source: 'BeInCrypto', url: 'https://es.beincrypto.com/feed/', lang: 'es' },
    { source: 'DiarioBitcoin', url: 'https://www.diariobitcoin.com/feed/', lang: 'es' },
    { source: 'Decrypt', url: 'https://decrypt.co/feed', lang: 'en' },
    { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', lang: 'en' },
];

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_ITEMS = 80;
const FEED_TIMEOUT_MS = 8000;

let cache: { at: number; items: NewsItem[] } = { at: 0, items: [] };

// ── Tiny RSS parsing (regex-based; avoids an XML-parser dependency) ─────────

function stripCdata(s: string): string {
    return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function decodeEntities(s: string): string {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&nbsp;/g, ' ')
        .trim();
}

function tag(block: string, name: string): string {
    const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
    return m ? decodeEntities(stripCdata(m[1])) : '';
}

function findImage(block: string): string | null {
    const media = block.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/i);
    if (media) return media[1];
    const enclosure = block.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i)
        ?? block.match(/<enclosure[^>]*type="image[^"]*"[^>]*url="([^"]+)"/i);
    if (enclosure) return enclosure[1];
    const img = stripCdata(block).match(/<img[^>]*src="(https?:\/\/[^"]+)"/i);
    return img ? img[1] : null;
}

// ── Naive enrichment ────────────────────────────────────────────────────────

const TICKER_WORDS: [RegExp, string][] = [
    [/\bbitcoin\b|\bbtc\b/i, 'BTC'],
    [/\bethereum\b|\bether\b|\beth\b/i, 'ETH'],
    [/\bsolana\b|\bsol\b/i, 'SOL'],
    [/\bxrp\b|\bripple\b/i, 'XRP'],
    [/\bdogecoin\b|\bdoge\b/i, 'DOGE'],
    [/\bcardano\b|\bada\b/i, 'ADA'],
    [/\bbnb\b|\bbinance coin\b/i, 'BNB'],
    [/\bavalanche\b|\bavax\b/i, 'AVAX'],
    [/\bchainlink\b|\blink\b/i, 'LINK'],
    [/\bhyperliquid\b|\bhype\b/i, 'HYPE'],
];

const UP_WORDS =
    /\b(sube|alza|récord|record|rally|dispara|máximo|maximo|supera|gana|repunta|surge|soars?|jumps?|rallies|all-time high|ath|gains?|bullish|alcista)\b/i;
const DOWN_WORDS =
    /\b(cae|caída|caida|desploma|derrumba|mínimo|minimo|pierde|hackeo|hack|exploit|crash|drops?|plunges?|falls?|sinks?|tumbles?|bearish|bajista|liquidaciones)\b/i;

function enrich(title: string): { tickers: string[]; sentiment: 'up' | 'down' | null } {
    const tickers = TICKER_WORDS.filter(([re]) => re.test(title)).map(([, t]) => t);
    const up = UP_WORDS.test(title);
    const down = DOWN_WORDS.test(title);
    return { tickers, sentiment: up && !down ? 'up' : down && !up ? 'down' : null };
}

// ── Fetch + assemble ────────────────────────────────────────────────────────

async function fetchFeed(feed: (typeof FEEDS)[number]): Promise<NewsItem[]> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FEED_TIMEOUT_MS);
    try {
        const res = await fetch(feed.url, {
            signal: ctrl.signal,
            headers: { 'user-agent': 'RayoNews/1.0 (+https://www.rayotrade.xyz)' },
            next: { revalidate: 300 },
        });
        if (!res.ok) return [];
        const xml = await res.text();
        const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
        return blocks.slice(0, 25).flatMap((block) => {
            const title = tag(block, 'title');
            const url = tag(block, 'link') || (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '');
            if (!title || !url) return [];
            const pub = tag(block, 'pubDate') || tag(block, 'dc:date');
            const publishedAt = pub ? Date.parse(pub) : Date.now();
            if (!Number.isFinite(publishedAt)) return [];
            const { tickers, sentiment } = enrich(title);
            return [{
                id: `${feed.source}:${url}`,
                title,
                url,
                source: feed.source,
                lang: feed.lang,
                publishedAt,
                image: findImage(block),
                tickers,
                sentiment,
            }];
        });
    } catch {
        return []; // one dead feed never breaks the endpoint
    } finally {
        clearTimeout(timer);
    }
}

export async function GET() {
    if (Date.now() - cache.at > CACHE_TTL_MS) {
        const results = await Promise.allSettled(FEEDS.map(fetchFeed));
        const items = results
            .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
            .sort((a, b) => b.publishedAt - a.publishedAt);

        // Dedupe near-identical titles (same story syndicated across feeds).
        const seen = new Set<string>();
        const deduped = items.filter((it) => {
            const key = it.title.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, ' ').trim().slice(0, 80);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Only replace a good cache with a non-empty refresh.
        if (deduped.length > 0 || cache.items.length === 0) {
            cache = { at: Date.now(), items: deduped.slice(0, MAX_ITEMS) };
        } else {
            cache.at = Date.now(); // back off retries while upstreams are down
        }
    }

    return NextResponse.json(
        { items: cache.items },
        {
            headers: {
                'Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
                // The iOS bundle calls this through NEXT_PUBLIC_API_BASE.
                'Access-Control-Allow-Origin': '*',
            },
        },
    );
}

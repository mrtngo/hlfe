// /api/news — free crypto + TradFi news aggregator.
//
// Pulls a handful of public RSS feeds (crypto, Spanish-first, plus the big
// English TradFi/markets outlets), normalizes them into one list and caches
// in memory for 5 minutes — so the upstream sites see at most ~1 request per
// feed per 5 min regardless of traffic. No API keys, no rate limits.
//
// Two feed flavours:
//   - 'crypto'  → kept as-is (the feed is already on-topic)
//   - 'tradfi'  → general business/markets wire (Yahoo Finance, MarketWatch,
//                 CNBC, Investing.com). These are broad, so we only keep items
//                 that mention one of OUR tickers (crypto majors + the xyz
//                 real-world assets: stocks, commodities, indices, FX…).
//                 Reuters/Bloomberg killed their public RSS; these outlets
//                 carry the same wire stories with real article URLs.
//
// Shaped for the V2 NewsScreen: each item carries ticker tags (title +
// description keyword match) and a cheap sentiment hint (up/down keyword
// match). Both are heuristics — good enough for a feed, not trading signals.

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';

export interface NewsItem {
    id: string;
    title: string;
    url: string;
    source: string;
    lang: 'es' | 'en';
    /** 'crypto' or 'tradfi' — drives the feed filter chips. */
    category: 'crypto' | 'tradfi';
    /** Unix ms. */
    publishedAt: number;
    image: string | null;
    tickers: string[];
    sentiment: 'up' | 'down' | null;
}

type FeedCategory = 'crypto' | 'tradfi';

const FEEDS: { source: string; url: string; lang: 'es' | 'en'; category: FeedCategory }[] = [
    // ── Crypto (kept in full) ───────────────────────────────────────────────
    // NOTE: Cointelegraph retired its Spanish RSS (es.cointelegraph.com/rss → 410).
    { source: 'CriptoNoticias', url: 'https://www.criptonoticias.com/feed/', lang: 'es', category: 'crypto' },
    { source: 'BeInCrypto', url: 'https://es.beincrypto.com/feed/', lang: 'es', category: 'crypto' },
    { source: 'DiarioBitcoin', url: 'https://www.diariobitcoin.com/feed/', lang: 'es', category: 'crypto' },
    { source: 'Decrypt', url: 'https://decrypt.co/feed', lang: 'en', category: 'crypto' },
    { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', lang: 'en', category: 'crypto' },
    // ── TradFi / markets (filtered to items that mention our tickers) ────────
    { source: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', lang: 'en', category: 'tradfi' },
    { source: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', lang: 'en', category: 'tradfi' },
    { source: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_marketpulse', lang: 'en', category: 'tradfi' },
    { source: 'CNBC', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258', lang: 'en', category: 'tradfi' },
    { source: 'Investing.com', url: 'https://www.investing.com/rss/news_25.rss', lang: 'en', category: 'tradfi' },
    { source: 'Investing.com', url: 'https://es.investing.com/rss/news_25.rss', lang: 'es', category: 'tradfi' },
];

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_ITEMS = 100;
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

// Title/description keyword → ticker. Covers crypto majors plus the xyz
// real-world assets (matched by company / instrument name, since TradFi
// headlines say "Nvidia" far more often than "NVDA"). Distinctive cashtags
// are added where the bare ticker isn't an everyday word.
const TICKER_WORDS: [RegExp, string][] = [
    // ── Crypto ──────────────────────────────────────────────────────────────
    [/\bbitcoin\b|\bbtc\b/i, 'BTC'],
    [/\bethereum\b|\bether\b|\beth\b/i, 'ETH'],
    [/\bsolana\b|\bsol\b/i, 'SOL'],
    [/\bxrp\b|\bripple\b/i, 'XRP'],
    [/\bdogecoin\b|\bdoge\b/i, 'DOGE'],
    [/\bcardano\b|\bada\b/i, 'ADA'],
    [/\bbnb\b|\bbinance coin\b/i, 'BNB'],
    [/\bavalanche\b|\bavax\b/i, 'AVAX'],
    [/\bchainlink\b/i, 'LINK'],
    [/\bhyperliquid\b|\bhype\b/i, 'HYPE'],
    [/\bpolygon\b|\bmatic\b/i, 'MATIC'],
    [/\bpolkadot\b/i, 'DOT'],
    [/\bsui\b/i, 'SUI'],
    [/\baptos\b/i, 'APT'],
    [/\barbitrum\b/i, 'ARB'],
    [/\boptimism\b/i, 'OP'],
    [/\btoncoin\b/i, 'TON'],
    [/\btron\b|\btrx\b/i, 'TRX'],
    [/\blitecoin\b|\bltc\b/i, 'LTC'],
    [/\bshiba inu\b|\bshib\b/i, 'SHIB'],
    [/\bpepe\b/i, 'PEPE'],
    [/\bdogwifhat\b|\bwif\b/i, 'WIF'],
    [/\bbonk\b/i, 'BONK'],
    [/\buniswap\b/i, 'UNI'],
    [/\baave\b/i, 'AAVE'],
    [/\bworldcoin\b|\bworld id\b/i, 'WLD'],
    [/\bbittensor\b/i, 'TAO'],
    [/\bzcash\b/i, 'ZEC'],

    // ── US stocks (by company name) ─────────────────────────────────────────
    [/\btesla\b/i, 'TSLA'],
    [/\bnvidia\b/i, 'NVDA'],
    [/\bapple\b/i, 'AAPL'],
    [/\bmicrosoft\b/i, 'MSFT'],
    [/\bgoogle\b|\balphabet\b/i, 'GOOGL'],
    [/\bamazon\b/i, 'AMZN'],
    [/\bmeta platforms\b|\bfacebook\b|\binstagram\b/i, 'META'],
    [/\bnetflix\b/i, 'NFLX'],
    [/\badvanced micro\b|\$amd\b|\bamd\b/i, 'AMD'],
    [/\bintel\b/i, 'INTC'],
    [/\bmicron\b/i, 'MU'],
    [/\bmicrostrategy\b|\bstrategy inc\b/i, 'MSTR'],
    [/\bcoinbase\b/i, 'COIN'],
    [/\brobinhood\b/i, 'HOOD'],
    [/\bpalantir\b/i, 'PLTR'],
    [/\boracle\b/i, 'ORCL'],
    [/\bcostco\b/i, 'COST'],
    [/\beli lilly\b/i, 'LLY'],
    [/\brivian\b/i, 'RIVN'],
    [/\bgamestop\b/i, 'GME'],
    [/\bhims & hers\b|\bhims\b/i, 'HIMS'],
    [/\bdraftkings\b/i, 'DKNG'],
    [/\blumentum\b/i, 'LITE'],
    [/\brocket lab\b/i, 'RKLB'],
    [/\bblackstone\b/i, 'BX'],
    [/\bmarvell\b/i, 'MRVL'],
    [/\bnebius\b/i, 'NBIS'],
    [/\bwestern digital\b/i, 'WDC'],
    [/\bbroadcom\b/i, 'AVGO'],
    [/\bservicenow\b/i, 'NOW'],
    [/\bibm\b/i, 'IBM'],
    [/\bdell\b/i, 'DELL'],
    [/\bzoom video\b/i, 'ZM'],
    [/\bebay\b/i, 'EBAY'],
    [/\ballbirds\b/i, 'BIRD'],
    [/\bblackberry\b/i, 'BB'],
    [/\btsmc\b|\btaiwan semi/i, 'TSM'],
    [/\balibaba\b/i, 'BABA'],
    [/\basml\b/i, 'ASML'],
    [/\barm holdings\b/i, 'ARM'],
    [/\bnokia\b/i, 'NOK'],
    [/\bcircle internet\b/i, 'CRCL'],
    [/\bcoreweave\b/i, 'CRWV'],
    [/\busa rare earth\b/i, 'USAR'],
    [/\bsandisk\b/i, 'SNDK'],

    // ── Korean / Japanese equities ──────────────────────────────────────────
    [/\bsk hynix\b|\bhynix\b/i, 'SKHX'],
    [/\bsamsung\b/i, 'SMSN'],
    [/\bhyundai\b/i, 'HYUNDAI'],
    [/\bsoftbank\b/i, 'SOFTBANK'],
    [/\bkioxia\b/i, 'KIOXIA'],

    // ── Commodities ─────────────────────────────────────────────────────────
    [/\bgold\b|\boro\b/i, 'GOLD'],
    [/\bsilver\b|\bplata\b/i, 'SILVER'],
    [/\bcopper\b|\bcobre\b/i, 'COPPER'],
    [/\bcrude oil\b|\bwti\b|petróleo crudo|\bcrudo\b/i, 'CL'],
    [/\bbrent\b/i, 'BRENTOIL'],
    [/\bnatural gas\b|gas natural/i, 'NATGAS'],
    [/\buranium\b|uranio/i, 'URANIUM'],
    [/\bplatinum\b|platino/i, 'PLATINUM'],
    [/\bpalladium\b|paladio/i, 'PALLADIUM'],
    [/\balumini?um\b|aluminio/i, 'ALUMINIUM'],
    [/\bwheat\b|\btrigo\b/i, 'WHEAT'],
    [/\bcorn\b|\bmaíz\b/i, 'CORN'],

    // ── Indices ─────────────────────────────────────────────────────────────
    [/s&p ?500|\bsp500\b/i, 'SP500'],
    [/\bnikkei\b/i, 'JP225'],
    [/\bkospi\b/i, 'KR200'],
    [/\bnifty\b/i, 'NIFTY'],
    [/\bbovespa\b/i, 'IBOV'],
    [/\bdollar index\b|\bdxy\b/i, 'DXY'],
    [/\bvix\b|volatility index/i, 'VIX'],

    // ── FX ──────────────────────────────────────────────────────────────────
    [/japanese yen\b|\byen\b/i, 'JPY'],
    [/\beuro\b/i, 'EUR'],
    [/british pound|pound sterling|\bsterling\b/i, 'GBP'],
    [/korean won\b/i, 'KRW'],

    // ── Pre-IPO / private ───────────────────────────────────────────────────
    [/\bspacex\b/i, 'SPCX'],
    [/\bminimax\b/i, 'MINIMAX'],
];

const UP_WORDS =
    /\b(sube|alza|récord|record|rally|dispara|máximo|maximo|supera|gana|repunta|surge|soars?|jumps?|rallies|all-time high|ath|gains?|bullish|alcista)\b/i;
const DOWN_WORDS =
    /\b(cae|caída|caida|desploma|derrumba|mínimo|minimo|pierde|hackeo|hack|exploit|crash|drops?|plunges?|falls?|sinks?|tumbles?|bearish|bajista|liquidaciones)\b/i;

function enrich(title: string, description = ''): { tickers: string[]; sentiment: 'up' | 'down' | null } {
    // Match tickers against title + description (better recall on wire stories
    // that name the company in the body), but score sentiment on the title
    // only (the headline is the signal; bodies are noisy). Cap at 4 chips.
    const haystack = `${title} ${description}`;
    const tickers = TICKER_WORDS.filter(([re]) => re.test(haystack)).map(([, t]) => t);
    const deduped = [...new Set(tickers)].slice(0, 4);
    const up = UP_WORDS.test(title);
    const down = DOWN_WORDS.test(title);
    return { tickers: deduped, sentiment: up && !down ? 'up' : down && !up ? 'down' : null };
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
        // TradFi feeds are broad — scan more items before ticker-filtering.
        const limit = feed.category === 'tradfi' ? 45 : 25;
        return blocks.slice(0, limit).flatMap((block) => {
            const title = tag(block, 'title');
            const url = tag(block, 'link') || (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '');
            if (!title || !url) return [];
            const pub = tag(block, 'pubDate') || tag(block, 'dc:date');
            const publishedAt = pub ? Date.parse(pub) : Date.now();
            if (!Number.isFinite(publishedAt)) return [];
            const description = tag(block, 'description') || tag(block, 'content:encoded');
            const { tickers, sentiment } = enrich(title, description);
            // The whole point of the TradFi feeds is "news that alludes to a
            // ticker we trade" — drop the rest.
            if (feed.category === 'tradfi' && tickers.length === 0) return [];
            return [{
                id: `${feed.source}:${url}`,
                title,
                url,
                source: feed.source,
                lang: feed.lang,
                category: feed.category,
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

export function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'GET, OPTIONS') });
}

export async function GET(request: NextRequest) {
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
                ...corsHeaders(request, 'GET, OPTIONS'),
                'Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
            },
        },
    );
}

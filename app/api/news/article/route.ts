// /api/news/article?url=… — in-app text-only reader extraction.
//
// Several feed sources (CoinDesk: X-Frame-Options DENY, BeInCrypto:
// SAMEORIGIN) can't be iframed, so the app shows articles in a native-feeling
// reader instead: this route fetches the article HTML server-side and
// extracts clean paragraphs. JSON-LD `articleBody` first (cleanest), <p>-tag
// harvesting as fallback. Only domains from our own feed list are allowed
// (SSRF guard).

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';

const ALLOWED_HOSTS = [
    'criptonoticias.com',
    'beincrypto.com',
    'diariobitcoin.com',
    'decrypt.co',
    'coindesk.com',
];

// Fallback when the article page itself can't be fetched (e.g. BeInCrypto's
// Cloudflare 403s every server-side request): the WordPress feeds carry the
// full article in <content:encoded>, so we re-read the (revalidate-cached)
// feed and pull the matching item's body.
const FEED_BY_HOST: Record<string, string> = {
    'criptonoticias.com': 'https://www.criptonoticias.com/feed/',
    'beincrypto.com': 'https://es.beincrypto.com/feed/',
    'diariobitcoin.com': 'https://www.diariobitcoin.com/feed/',
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE = 100;
const cache = new Map<string, { at: number; data: ArticleData }>();

interface ArticleData {
    title: string;
    paragraphs: string[];
    url: string;
}

// Named entities the Spanish feeds actually emit (accents, punctuation).
const NAMED_ENTITIES: Record<string, string> = {
    aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
    Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ',
    iexcl: '¡', iquest: '¿', laquo: '«', raquo: '»',
    rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
    mdash: '—', ndash: '–', hellip: '…', percnt: '%', dollar: '$', euro: '€',
};

function decodeEntities(s: string): string {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name] ?? m)
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function stripTags(html: string): string {
    return decodeEntities(html.replace(/<[^>]+>/g, ' '));
}

/** Paragraph-ize a flat articleBody string (JSON-LD bodies lose breaks). */
function splitBody(body: string): string[] {
    const parts = body
        .split(/\n+|(?<=\.)\s{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    // Flat bodies (no newlines at all) come out as one huge blob — regroup
    // by sentence boundaries into readable ~3-sentence paragraphs.
    return parts.flatMap((p) => {
        if (p.length < 800) return [p];
        const sentences = p.split(/(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÑ¿¡"“])/);
        const out: string[] = [];
        for (let i = 0; i < sentences.length; i += 3) {
            out.push(sentences.slice(i, i + 3).join(' '));
        }
        return out;
    });
}

function extract(html: string): Omit<ArticleData, 'url'> | null {
    // Title: og:title beats <title> (no site-name suffix).
    const og = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
        ?? html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:title"/i);
    const title = decodeEntities(og?.[1] ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');

    // 1) JSON-LD articleBody — cleanest when present.
    const ldBlocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of ldBlocks) {
        const json = block.replace(/<script[^>]*>|<\/script>/gi, '');
        try {
            const parsed = JSON.parse(json);
            const nodes = Array.isArray(parsed) ? parsed : parsed['@graph'] ?? [parsed];
            for (const node of nodes) {
                const body = node?.articleBody;
                if (typeof body === 'string' && body.length > 300) {
                    return { title: title || node.headline || '', paragraphs: splitBody(decodeEntities(body)) };
                }
            }
        } catch {
            /* malformed JSON-LD — try the next block */
        }
    }

    // 2) Fallback: harvest <p> tags (prefer the <article> region when present).
    const region = html.match(/<article[\s>][\s\S]*?<\/article>/i)?.[0] ?? html;
    const paragraphs = (region.match(/<p[\s>][\s\S]*?<\/p>/gi) || [])
        .map(stripTags)
        .filter((p) =>
            p.length > 60 &&
            !/suscr[ií]be|newsletter|cookies|all rights reserved|todos los derechos|descargo de responsabilidad|disclaimer/i.test(p),
        )
        .slice(0, 60);

    if (paragraphs.length === 0) return null;
    return { title, paragraphs };
}

/** Paragraphs out of an HTML fragment (feed content:encoded). */
function paragraphsFromHtml(html: string): string[] {
    const ps = (html.match(/<p[\s>][\s\S]*?<\/p>/gi) || [])
        .map(stripTags)
        .filter((p) => p.length > 40 && !/suscr[ií]be|newsletter|descargo de responsabilidad|disclaimer/i.test(p));
    if (ps.length > 0) return ps.slice(0, 60);
    const flat = stripTags(html);
    return flat.length > 200 ? splitBody(flat) : [];
}

async function extractFromFeed(articleUrl: string, host: string): Promise<Omit<ArticleData, 'url'> | null> {
    const root = Object.keys(FEED_BY_HOST).find((h) => host === h || host.endsWith(`.${h}`));
    if (!root) return null;
    try {
        const res = await fetch(FEED_BY_HOST[root], {
            headers: { 'user-agent': 'RayoNews/1.0 (+https://www.rayotrade.xyz)' },
            next: { revalidate: 300 },
        });
        if (!res.ok) return null;
        const xml = await res.text();
        const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
        const block = blocks.find((b) => b.includes(articleUrl));
        if (!block) return null;
        const title = decodeEntities(
            (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'),
        );
        const content = block.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i)?.[1]
            ?? block.match(/<description>([\s\S]*?)<\/description>/i)?.[1]
            ?? '';
        const decoded = decodeEntities(content.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'));
        const paragraphs = paragraphsFromHtml(decoded);
        return paragraphs.length > 0 ? { title, paragraphs } : null;
    } catch {
        return null;
    }
}

export function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'GET, OPTIONS') });
}

export async function GET(req: NextRequest) {
    const responseHeaders = {
        ...corsHeaders(req, 'GET, OPTIONS'),
        'Cache-Control': 'public, max-age=600, stale-while-revalidate=1800',
    };
    const url = req.nextUrl.searchParams.get('url') || '';
    let host: string;
    try {
        const u = new URL(url);
        if (u.protocol !== 'https:') throw new Error('https only');
        host = u.hostname;
    } catch {
        return NextResponse.json({ error: 'URL inválida' }, { status: 400, headers: responseHeaders });
    }
    if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
        return NextResponse.json({ error: 'Fuente no permitida' }, { status: 403, headers: responseHeaders });
    }

    const hit = cache.get(url);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        return NextResponse.json(hit.data, { headers: responseHeaders });
    }

    let extracted: Omit<ArticleData, 'url'> | null = null;
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10_000);
        const res = await fetch(url, {
            signal: ctrl.signal,
            headers: {
                // Some outlets serve bots a stub — a browser-ish UA gets the real page.
                'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile Safari/604.1',
                accept: 'text/html',
            },
            next: { revalidate: 1800 },
        });
        clearTimeout(timer);
        if (res.ok) extracted = extract(await res.text());
    } catch {
        /* fall through to the feed fallback */
    }

    if (!extracted) extracted = await extractFromFeed(url, host);
    if (!extracted) {
        return NextResponse.json({ error: 'No pudimos cargar el artículo' }, { status: 502, headers: responseHeaders });
    }

    const data: ArticleData = { ...extracted, url };
    cache.set(url, { at: Date.now(), data });
    if (cache.size > MAX_CACHE) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
    }
    return NextResponse.json(data, { headers: responseHeaders });
}

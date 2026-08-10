'use client';

import Image from 'next/image';
import { useState } from 'react';

interface TokenLogoProps {
    symbol: string;
    size?: number;
    className?: string;
}

// Forex and Commodity logos - using local files
const FOREX_COMMODITY_LOGOS: Record<string, string> = {
    // Forex
    'EUR': '/logos/eur.svg',
    'JPY': '/logos/jpy.svg',
    'GBP': 'https://wise.com/public-resources/assets/flags/rectangle/gbp.png',
    'CHF': 'https://wise.com/public-resources/assets/flags/rectangle/chf.png',
    'AUD': 'https://wise.com/public-resources/assets/flags/rectangle/aud.png',
    'CAD': 'https://wise.com/public-resources/assets/flags/rectangle/cad.png',
    'NZD': 'https://wise.com/public-resources/assets/flags/rectangle/nzd.png',
    // Commodities
    'XAU': '/logos/gold.svg',
    'GOLD': '/logos/gold.svg',
    'GC': '/logos/gold.svg',
    'XAG': '/logos/silver.svg',
    'SILVER': '/logos/silver.svg',
    'SI': '/logos/silver.svg',
    'COPPER': '/logos/copper.svg',
    'HG': '/logos/copper.svg',
    'CL': '', // fallback to emoji
    'OIL': '', // fallback to emoji
    'WTI': '', // fallback to emoji
    'BRENT': '', // fallback to emoji
    'NG': '/logos/natgas.svg',
    'NATGAS': '/logos/natgas.svg',
};

// Stock symbol to Twitter handle mapping for unavatar.io fallback
const STOCK_TO_TWITTER: Record<string, string> = {
    // Tech Giants
    'AAPL': 'apple',
    'MSFT': 'microsoft',
    'GOOGL': 'google',
    'GOOG': 'google',
    'AMZN': 'amazon',
    'META': 'meta',
    'NVDA': 'nvidia',
    'TSLA': 'tesla',
    'AMD': 'amd',
    'INTC': 'intel',
    'CRM': 'salesforce',
    'ORCL': 'oracle',
    'ADBE': 'adobe',
    'CSCO': 'cisco',
    'IBM': 'ibm',
    'QCOM': 'qualcomm',
    'TXN': 'txinstruments',
    'AVGO': 'broadcom',
    // Semis traded as xStocks on spot (MUx, SKHYx) — MU resolves from the
    // local /logos/mu.svg first; the handles are the remote fallback.
    'MU': 'MicronTech',
    'SKHX': 'skhynix',
    'NOW': 'servicenow',
    'INTU': 'intuit',
    // Finance
    'JPM': 'jpmorgan',
    'BAC': 'bankofamerica',
    'WFC': 'wellsfargo',
    'GS': 'goldmansachs',
    'V': 'visa',
    'MA': 'mastercard',
    'AXP': 'americanexpress',
    'BLK': 'blackrock',
    'C': 'citi',
    'SCHW': 'charlesschwab',
    'COIN': 'coinbase',
    'HOOD': 'robinhoodapp',
    // Consumer
    'KO': 'cocacola',
    'PEP': 'pepsi',
    'MCD': 'mcdonalds',
    'SBUX': 'starbucks',
    'NKE': 'nike',
    'DIS': 'disney',
    'NFLX': 'netflix',
    'COST': 'costco',
    'WMT': 'walmart',
    'TGT': 'target',
    'HD': 'homedepot',
    'LOW': 'lowes',
    // Healthcare
    'JNJ': 'jnj',
    'PFE': 'pfizer',
    'UNH': 'uhc',
    'MRK': 'merck',
    'ABBV': 'abbvie',
    'LLY': 'lillypad',
    'TMO': 'thermofisher',
    'BMY': 'bmsnews',
    // Energy/Industrial
    'XOM': 'exxonmobil',
    'CVX': 'chevron',
    'BA': 'boeing',
    'CAT': 'caterpillarinc',
    'GE': 'generalelectric',
    'HON': 'honeywell',
    'UPS': 'ups',
    'FDX': 'fedex',
    // Auto
    'F': 'ford',
    'GM': 'gm',
    'RIVN': 'rivian',
    'LCID': 'lucidmotors',
    // Communications
    'T': 'att',
    'VZ': 'verizon',
    'TMUS': 'tmobile',
    // Other Tech
    'UBER': 'uber',
    'LYFT': 'lyft',
    'ABNB': 'airbnb',
    'SQ': 'square',
    'SHOP': 'shopify',
    'SNOW': 'snowflake',
    'PLTR': 'palantirtech',
    'ZM': 'zoom',
    'SNAP': 'snap',
    'PINS': 'pinterest',
    'TWLO': 'twilio',
    'DDOG': 'datadoghq',
    'NET': 'cloudflare',
    'CRWD': 'crowdstrike',
    'ZS': 'zscaler',
    'OKTA': 'okta',
    'MDB': 'mongodb',
    'SPOT': 'spotify',
    'ROKU': 'roku',
    'U': 'unitygames',
    'RBLX': 'roblox',
    'EA': 'ea',
    'TTWO': 'rockstargames',
    'ATVI': 'activision',
    // SPY/Indexes — SPY is a State Street SPDR fund, not S&P Global; the
    // old 'spglobal' handle 403s on unavatar and fell through to the
    // letter placeholder.
    'SPY': 'SPDRETFs',
    'QQQ': 'invesco',
    'IWM': 'ishares',
    'DIA': 'spglobal',
    // PayPal
    'PYPL': 'paypal',
};

// Tickers whose brand lives on a website rather than a usable X avatar.
// ETFs are the main case: @SPDRETFs and @invesco resolve to a smiley and a
// default egg respectively, so we pull the issuer/index mark by domain.
const STOCK_TO_DOMAIN: Record<string, string> = {
    'SPY': 'ssga.com', // State Street, the SPDR S&P 500 issuer
    'QQQ': 'nasdaq.com', // the index the fund tracks — clearer than Invesco's mark
};

// Get logo URLs for stocks - try local first, then trade.xyz, then unavatar.io
function getStockLogoUrls(symbol: string): string[] {
    const lowerSymbol = symbol.toLowerCase();
    const urls: string[] = [];

    // 1. Local logos (lowercase for stocks)
    urls.push(`/logos/${lowerSymbol}.svg`);

    // 2. app.trade.xyz - fallback
    urls.push(`https://app.trade.xyz/markets/${lowerSymbol}.svg`);

    // 3. unavatar.io by brand domain, where the X avatar is unusable
    const domain = STOCK_TO_DOMAIN[symbol];
    if (domain) {
        urls.push(`https://unavatar.io/${domain}`);
    }

    // 4. unavatar.io via Twitter handle as fallback
    const twitterHandle = STOCK_TO_TWITTER[symbol];
    if (twitterHandle) {
        urls.push(`https://unavatar.io/x/${twitterHandle}`);
    }

    return urls;
}

// Check if symbol is a stock
function isStockSymbol(symbol: string): boolean {
    return symbol in STOCK_TO_TWITTER;
}

// Check if symbol is forex or commodity
function isForexOrCommodity(symbol: string): boolean {
    return symbol in FOREX_COMMODITY_LOGOS;
}

// Get forex/commodity logo URL
function getForexCommodityUrl(symbol: string): string | null {
    return FOREX_COMMODITY_LOGOS[symbol] || null;
}

// Dynamic logo sources for crypto
function getCryptoLogoUrls(symbol: string): string[] {
    const lowerSymbol = symbol.toLowerCase();
    const upperSymbol = symbol.toUpperCase();

    const urls: string[] = [];

    // 1. Local logos (uppercase for crypto)
    urls.push(`/logos/${upperSymbol}.svg`);

    // 2. Hyperliquid CDN - fallback (uppercase ticker)
    urls.push(`https://app.hyperliquid.xyz/coins/${upperSymbol}.svg`);

    // 3. cryptocurrency-icons GitHub CDN (fallback)
    urls.push(`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${lowerSymbol}.png`);

    // 4. trade.xyz markets CDN — covers the HIP-3 "xyz:" stock/commodity/index
    //    perps (SP500, MU, EWY, GOLD, MSTR, KR200, …). These RWAs aren't in the
    //    hardcoded stock map, so they land in this crypto branch; this last
    //    fallback gives them their real logo instead of a generic letter. Real
    //    crypto resolves above and never reaches here.
    urls.push(`https://app.trade.xyz/markets/${lowerSymbol}.svg`);

    return urls;
}

// Global cache for working logo URLs to prevent 404 spam
const logoCache = new Map<string, string>();

export default function TokenLogo({ symbol, size = 32, className = '' }: TokenLogoProps) {
    // Get the base symbol (remove -USD, -PERP, etc.)
    const baseSymbol = symbol.replace(/-USD$/, '').replace(/-PERP$/, '').toUpperCase();

    // Check cache first
    const cachedUrl = logoCache.get(baseSymbol);
    const [useCached, setUseCached] = useState(!!cachedUrl);
    const [errorIndex, setErrorIndex] = useState(0);

    // Check asset type
    const isStock = isStockSymbol(baseSymbol);
    const isForexCommodity = isForexOrCommodity(baseSymbol);

    // Get logo URLs based on asset type
    let logoUrls: string[] = [];

    if (isForexCommodity) {
        // For forex/commodities, use dedicated URLs
        const url = getForexCommodityUrl(baseSymbol);
        if (url) logoUrls.push(url);
    } else if (isStock) {
        // For stocks, try trade.xyz first then unavatar.io
        logoUrls = getStockLogoUrls(baseSymbol);
    } else {
        // For crypto, get multiple fallback URLs
        logoUrls = getCryptoLogoUrls(baseSymbol);
    }

    // Determine which URL to use
    // If cached, use that. Otherwise use current index from list.
    const currentUrl = useCached ? cachedUrl : logoUrls[errorIndex];

    // If we've exhausted all URLs, show custom fallback
    if (!currentUrl || (!useCached && errorIndex >= logoUrls.length)) {
        // Custom fallbacks for specific commodities with nice colors
        const COMMODITY_COLORS: Record<string, { bg: string; icon: string }> = {
            'GOLD': { bg: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)', icon: '🥇' },
            'XAU': { bg: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)', icon: '🥇' },
            'GC': { bg: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)', icon: '🥇' },
            'SILVER': { bg: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)', icon: '🥈' },
            'XAG': { bg: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)', icon: '🥈' },
            'SI': { bg: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)', icon: '🥈' },
            'COPPER': { bg: 'linear-gradient(135deg, #B87333 0%, #8B4513 100%)', icon: '🔶' },
            'HG': { bg: 'linear-gradient(135deg, #B87333 0%, #8B4513 100%)', icon: '🔶' },
            'OIL': { bg: 'linear-gradient(135deg, #1C1C1C 0%, #4A4A4A 100%)', icon: '🛢️' },
            'CL': { bg: 'linear-gradient(135deg, #1C1C1C 0%, #4A4A4A 100%)', icon: '🛢️' },
            'WTI': { bg: 'linear-gradient(135deg, #1C1C1C 0%, #4A4A4A 100%)', icon: '🛢️' },
            'BRENT': { bg: 'linear-gradient(135deg, #1C1C1C 0%, #4A4A4A 100%)', icon: '🛢️' },
            'NG': { bg: 'linear-gradient(135deg, #4169E1 0%, #1E3A8A 100%)', icon: '🔥' },
            'NATGAS': { bg: 'linear-gradient(135deg, #4169E1 0%, #1E3A8A 100%)', icon: '🔥' },
            'EUR': { bg: 'linear-gradient(135deg, #003399 0%, #001a4d 100%)', icon: '€' },
            'JPY': { bg: 'linear-gradient(135deg, #BC002D 0%, #8B0000 100%)', icon: '¥' },
            'GBP': { bg: 'linear-gradient(135deg, #012169 0%, #00008B 100%)', icon: '£' },
            'CHF': { bg: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)', icon: '₣' },
            'AUD': { bg: 'linear-gradient(135deg, #00008B 0%, #000066 100%)', icon: 'A$' },
            'CAD': { bg: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)', icon: 'C$' },
            'NZD': { bg: 'linear-gradient(135deg, #00247D 0%, #001a4d 100%)', icon: 'N$' },
        };

        const commodityStyle = COMMODITY_COLORS[baseSymbol];

        // Determine background color based on asset type
        let bgGradient = 'linear-gradient(135deg, #FFD60A 0%, #FF9500 100%)'; // Yellow/orange for crypto
        let displayText = baseSymbol.charAt(0);

        if (commodityStyle) {
            bgGradient = commodityStyle.bg;
            displayText = commodityStyle.icon;
        } else if (isStock) {
            bgGradient = 'linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%)'; // Blue for stocks
        } else if (isForexCommodity) {
            bgGradient = 'linear-gradient(135deg, #4A5568 0%, #2D3748 100%)'; // Gray for forex/commodities
        }

        return (
            <div
                className={`rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
                style={{
                    width: size,
                    height: size,
                    background: bgGradient,
                    border: commodityStyle ? '2px solid rgba(255,255,255,0.2)' : 'none',
                }}
            >
                <span className="text-white font-bold" style={{ fontSize: commodityStyle ? size / 2 : size / 2.5 }}>
                    {displayText}
                </span>
            </div>
        );
    }

    // Try current URL, on error move to next
    return (
        <div
            className={`rounded-full overflow-hidden flex-shrink-0 ${isStock ? 'bg-white' : 'bg-bg-elevated'} ${className}`}
            style={{ width: size, height: size }}
        >
            <Image
                src={currentUrl}
                alt={baseSymbol}
                width={size}
                height={size}
                className="w-full h-full object-cover rounded-full"
                unoptimized
                onLoad={() => {
                    // Success! Cache this URL for future use
                    if (!useCached) {
                        logoCache.set(baseSymbol, currentUrl);
                    }
                }}
                onError={() => {
                    // If cached URL failed (rare), clear cache and try list
                    if (useCached) {
                        logoCache.delete(baseSymbol);
                        setUseCached(false);
                        setErrorIndex(0);
                    } else {
                        // Try next URL in the list
                        setErrorIndex(prev => prev + 1);
                    }
                }}
            />
        </div>
    );
}

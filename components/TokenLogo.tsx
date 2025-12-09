'use client';

import Image from 'next/image';
import { useState } from 'react';

interface TokenLogoProps {
    symbol: string;
    size?: number;
    className?: string;
}

// Map symbol to CoinGecko ID for jsDelivr CDN fallback
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'BNB': 'binancecoin',
    'AVAX': 'avalanche-2',
    'MATIC': 'matic-network',
    'ATOM': 'cosmos',
    'DOT': 'polkadot',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'DOGE': 'dogecoin',
    'SHIB': 'shiba-inu',
    'APT': 'aptos',
    'ARB': 'arbitrum',
    'OP': 'optimism',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'TRX': 'tron',
    'NEAR': 'near',
    'LTC': 'litecoin',
    'HYPE': 'hyperliquid',
    'SUI': 'sui',
    'INJ': 'injective-protocol',
    'SEI': 'sei-network',
    'FTM': 'fantom',
    'AAVE': 'aave',
    'MKR': 'maker',
    'CRV': 'curve-dao-token',
    'LDO': 'lido-dao',
    'GMX': 'gmx',
    'SNX': 'synthetix-network-token',
    'PEPE': 'pepe',
    'WIF': 'dogwifcoin',
    'BONK': 'bonk',
    'MEME': 'memecoin-2',
    'JTO': 'jito-governance-token',
    'PYTH': 'pyth-network',
    'TIA': 'celestia',
    'FET': 'fetch-ai',
    'RENDER': 'render-token',
    'JUP': 'jupiter-exchange-solana',
    'W': 'wormhole',
    'ENA': 'ethena',
    'PENDLE': 'pendle',
    'STRK': 'starknet',
    'XLM': 'stellar',
    'ALGO': 'algorand',
    'VET': 'vechain',
    'SAND': 'the-sandbox',
    'MANA': 'decentraland',
    'AXS': 'axie-infinity',
    'GALA': 'gala',
    'IMX': 'immutable-x',
    'APE': 'apecoin',
    'CFX': 'conflux-token',
    'RUNE': 'thorchain',
    'ENS': 'ethereum-name-service',
    'BLUR': 'blur',
    'WLD': 'worldcoin-wld',
    'ONDO': 'ondo-finance',
    'ORDI': 'ordinals',
    'STX': 'blockstack',
    'EGLD': 'elrond-erd-2',
    'FIL': 'filecoin',
    'ICP': 'internet-computer',
    'HBAR': 'hedera-hashgraph',
    'KAS': 'kaspa',
    'TON': 'the-open-network',
    'TAO': 'bittensor',
};

// Primary logo sources (CoinGecko CDN) - known working URLs
const TOKEN_LOGOS: Record<string, string> = {
    'BTC': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    'ETH': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    'SOL': 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    'BNB': 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
    'AVAX': 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',
    'MATIC': 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png',
    'ATOM': 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png',
    'DOT': 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
    'LINK': 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
    'UNI': 'https://assets.coingecko.com/coins/images/12504/large/uni.jpg',
    'DOGE': 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    'SHIB': 'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
    'APT': 'https://assets.coingecko.com/coins/images/26455/large/aptos_round.png',
    'ARB': 'https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg',
    'OP': 'https://assets.coingecko.com/coins/images/25244/large/Optimism.png',
};

// Get jsDelivr CDN URL for a symbol
function getJsDelivrUrl(symbol: string): string | null {
    const coingeckoId = SYMBOL_TO_COINGECKO_ID[symbol];
    if (!coingeckoId) return null;
    return `https://cdn.jsdelivr.net/gh/simplr-sh/coin-logos/images/${coingeckoId}/standard.png`;
}

export default function TokenLogo({ symbol, size = 32, className = '' }: TokenLogoProps) {
    const [imgError, setImgError] = useState(false);
    const [fallbackError, setFallbackError] = useState(false);

    // Get the base symbol (remove -USD, -PERP, etc.)
    const baseSymbol = symbol.replace(/-USD$/, '').replace(/-PERP$/, '').toUpperCase();

    // Primary: CoinGecko direct URL
    const primaryUrl = TOKEN_LOGOS[baseSymbol];
    // Fallback: jsDelivr CDN
    const fallbackUrl = getJsDelivrUrl(baseSymbol);

    // Determine which URL to use
    const logoUrl = imgError ? fallbackUrl : primaryUrl;

    // If we have both errors or no URLs available, show letter fallback
    if ((imgError && fallbackError) || (!logoUrl && !fallbackUrl)) {
        return (
            <div
                className={`rounded-full bg-gradient-to-br from-[#FFD60A] to-[#FF9500] flex items-center justify-center flex-shrink-0 ${className}`}
                style={{ width: size, height: size }}
            >
                <span className="text-white font-bold" style={{ fontSize: size / 2.5 }}>
                    {baseSymbol.charAt(0)}
                </span>
            </div>
        );
    }

    // Try logo URL (primary or fallback)
    const urlToUse = logoUrl || fallbackUrl;

    if (urlToUse) {
        return (
            <div
                className={`rounded-full overflow-hidden flex-shrink-0 bg-white/10 ${className}`}
                style={{ width: size, height: size }}
            >
                <Image
                    src={urlToUse}
                    alt={baseSymbol}
                    width={size}
                    height={size}
                    className="w-full h-full object-cover rounded-full"
                    unoptimized
                    onError={() => {
                        if (!imgError) {
                            setImgError(true);
                        } else {
                            setFallbackError(true);
                        }
                    }}
                />
            </div>
        );
    }

    // Final fallback - letter
    return (
        <div
            className={`rounded-full bg-gradient-to-br from-[#FFD60A] to-[#FF9500] flex items-center justify-center flex-shrink-0 ${className}`}
            style={{ width: size, height: size }}
        >
            <span className="text-white font-bold" style={{ fontSize: size / 2.5 }}>
                {baseSymbol.charAt(0)}
            </span>
        </div>
    );
}






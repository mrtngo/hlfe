'use client';

import Image from 'next/image';

interface TokenLogoProps {
    symbol: string;
    size?: number;
    className?: string;
}

// Token logo URLs - using CoinGecko CDN
const TOKEN_LOGOS: Record<string, string> = {
    'BTC': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    'ETH': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    'SOL': 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    'BNB': 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
    'RAYO': 'https://assets.coingecko.com/coins/images/28407/large/rayo.png',
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

export default function TokenLogo({ symbol, size = 32, className = '' }: TokenLogoProps) {
    // Get the base symbol (remove -USD, -PERP, etc.)
    const baseSymbol = symbol.replace(/-USD$/, '').replace(/-PERP$/, '').toUpperCase();
    const logoUrl = TOKEN_LOGOS[baseSymbol];

    if (logoUrl) {
        return (
            <div 
                className={`rounded-full overflow-hidden flex-shrink-0 bg-white/10 p-1 ${className}`}
                style={{ width: size, height: size }}
            >
                <Image
                    src={logoUrl}
                    alt={baseSymbol}
                    width={size}
                    height={size}
                    className="w-full h-full object-cover rounded-full"
                    unoptimized
                />
            </div>
        );
    }

    // Fallback to first letter if no logo
    return (
        <div 
            className={`rounded-full bg-gradient-to-br from-[#FFD60A] to-[#FF9500] flex items-center justify-center flex-shrink-0 ${className}`}
            style={{ width: size, height: size }}
        >
            <span className="text-white font-bold" style={{ fontSize: size / 3 }}>
                {baseSymbol.charAt(0)}
            </span>
        </div>
    );
}






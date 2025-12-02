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
};

export default function TokenLogo({ symbol, size = 32, className = '' }: TokenLogoProps) {
    // Get the base symbol (remove -USD, -PERP, etc.)
    const baseSymbol = symbol.replace(/-USD$/, '').replace(/-PERP$/, '').toUpperCase();
    const logoUrl = TOKEN_LOGOS[baseSymbol];

    if (logoUrl) {
        return (
            <div 
                className={`rounded-lg overflow-hidden flex-shrink-0 ${className}`}
                style={{ width: size, height: size }}
            >
                <Image
                    src={logoUrl}
                    alt={baseSymbol}
                    width={size}
                    height={size}
                    className="w-full h-full object-cover"
                    unoptimized
                />
            </div>
        );
    }

    // Fallback to first letter if no logo
    return (
        <div 
            className={`rounded-lg bg-primary flex items-center justify-center flex-shrink-0 ${className}`}
            style={{ width: size, height: size }}
        >
            <span className="text-white text-xs font-bold">
                {baseSymbol.charAt(0)}
            </span>
        </div>
    );
}




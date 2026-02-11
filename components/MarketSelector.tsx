import { useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import TokenLogo from '@/components/TokenLogo';
import MarketSelectModal from '@/components/MarketSelectModal';

export default function MarketSelector() {
    const { markets, selectedMarket, setSelectedMarket } = useHyperliquid();
    const { t, formatCurrency, formatPercent } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    // Derived state for current market
    const currentMarket = (markets || []).find(m => m.symbol === selectedMarket) || (markets || [])[0];
    const isPositive = (currentMarket?.change24h ?? 0) >= 0;

    const handleSelectMarket = (symbol: string) => {
        setSelectedMarket(symbol);
        setIsOpen(false);
    };

    if (!currentMarket) {
        return null;
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full p-4 mb-3 rounded-xl transition-all flex items-center justify-between gap-4"
                style={{
                    backgroundColor: '#000000',
                    border: 'none',
                    boxShadow: isOpen
                        ? '0 8px 24px rgba(0, 0, 0, 0.65), 0 0 12px rgba(255, 255, 0, 0.18)'
                        : '0 4px 12px rgba(0, 0, 0, 0.45)',
                }}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <TokenLogo symbol={currentMarket.symbol} size={36} />
                    <div className="min-w-0">
                        <div
                            className="text-sm font-semibold truncate"
                            style={{ color: '#FFFFFF', textShadow: '0 0 6px rgba(0,0,0,0.6)' }}
                        >
                            {currentMarket.name}
                        </div>
                        <div
                            className="text-[11px]"
                            style={{ color: 'rgba(255,255,255,0.8)', textShadow: '0 0 4px rgba(0,0,0,0.6)' }}
                        >
                            {t.markets.tapToChange}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                        <div
                            className="font-mono font-bold text-sm"
                            style={{ color: '#FFFFFF', textShadow: '0 0 6px rgba(0,0,0,0.6)' }}
                        >
                            {formatCurrency(currentMarket.price)}
                        </div>
                        <div
                            className="flex items-center justify-end gap-1 text-xs"
                            style={{
                                color: isPositive ? '#00FF00' : '#FF4444',
                                textShadow: '0 0 6px rgba(0,0,0,0.6)'
                            }}
                        >
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span className="font-mono font-semibold">
                                {formatPercent(Math.abs(currentMarket.change24h))}
                            </span>
                        </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            <MarketSelectModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSelect={(market) => handleSelectMarket(market.symbol)}
                markets={markets || []}
                title={t.markets.title}
                searchPlaceholder={t.markets.search}
            />
        </div>
    );
}


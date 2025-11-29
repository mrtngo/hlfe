'use client';

import { useState, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { TrendingUp, TrendingDown, Plus, X, ArrowUpRight, ArrowDownRight, Copy, Check, Wallet, ExternalLink } from 'lucide-react';

const WATCHLIST_STORAGE_KEY = 'hyperliquid_watchlist';

interface HomeScreenProps {
    onTokenClick?: (symbol: string) => void;
}

export default function HomeScreen({ onTokenClick }: HomeScreenProps = {}) {
    const { t } = useLanguage();
    const { account, positions, markets, setSelectedMarket, address } = useHyperliquid();
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);
    const [copied, setCopied] = useState(false);

    // Only access localStorage on client-side
    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
            if (saved) {
                try {
                    setWatchlist(JSON.parse(saved));
                } catch (e) {
                    console.error('Error parsing watchlist:', e);
                }
            }
        }
    }, []);

    // Save watchlist to localStorage
    useEffect(() => {
        if (mounted && typeof window !== 'undefined') {
            localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
        }
    }, [watchlist, mounted]);

    const addToWatchlist = (symbol: string) => {
        if (!watchlist.includes(symbol)) {
            setWatchlist([...watchlist, symbol]);
        }
    };

    const removeFromWatchlist = (symbol: string) => {
        setWatchlist(watchlist.filter(s => s !== symbol));
    };

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
    };

    const watchlistMarkets = markets.filter(m => watchlist.includes(m.name));
    const totalUnrealizedPnl = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
    const portfolioValue = account.equity || account.balance;

    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-muted">Loading...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Wallet Address Section */}
            {address && (
                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Wallet className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-bold">Hyperliquid Wallet Address</h2>
                    </div>
                    <p className="text-sm text-muted mb-4">
                        Send USDC to this address on Arbitrum Sepolia to fund your trading account. This is your Hyperliquid wallet address.
                    </p>
                    <div className="bg-elevated border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted mb-1">Wallet Address</div>
                            <div className="text-sm font-mono break-all text-primary">
                                {address}
                            </div>
                        </div>
                        <button
                            onClick={copyAddress}
                            className="flex-shrink-0 px-4 py-2 bg-elevated hover:bg-card border border-border rounded-full transition-all flex items-center gap-2 min-h-[44px]"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 text-buy" />
                                    <span className="text-sm font-semibold text-buy">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 text-muted" />
                                    <span className="text-sm font-semibold">Copy</span>
                                </>
                            )}
                        </button>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                        <ExternalLink className="w-3 h-3" />
                        <a 
                            href={`https://sepolia.arbiscan.io/address/${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors underline"
                        >
                            View on Arbiscan
                        </a>
                        <span>•</span>
                        <a 
                            href="https://app.hyperliquid-testnet.xyz/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors underline"
                        >
                            Hyperliquid Testnet
                        </a>
                    </div>
                </div>
            )}

            {/* Portfolio Overview */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6">Portfolio</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-elevated border border-border rounded-xl p-5">
                        <div className="text-sm text-muted mb-2">Total Value</div>
                        <div className="text-3xl font-bold">
                            ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="bg-elevated border border-border rounded-xl p-5">
                        <div className="text-sm text-muted mb-2">Unrealized P&L</div>
                        <div className={`text-3xl font-bold flex items-center gap-2 ${
                            totalUnrealizedPnl >= 0 ? 'text-buy' : 'text-sell'
                        }`}>
                            {totalUnrealizedPnl >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                            ${totalUnrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {account.equity > 0 && (
                            <div className="text-xs text-muted mt-1">
                                {((totalUnrealizedPnl / account.equity) * 100).toFixed(2)}%
                            </div>
                        )}
                    </div>
                    <div className="bg-elevated border border-border rounded-xl p-5">
                        <div className="text-sm text-muted mb-2">Available Margin</div>
                        <div className="text-3xl font-bold">
                            ${account.availableMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Positions */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <h2 className="text-2xl font-bold mb-6">Open Positions</h2>
                    {positions.length === 0 ? (
                        <div className="text-center py-8 text-muted">
                            <p>No open positions</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {positions.map((position) => {
                                const isLong = position.side === 'long';
                                const pnlColor = position.unrealizedPnl >= 0 ? 'text-buy' : 'text-sell';
                                
                                return (
                                    <div
                                        key={position.symbol}
                                        className="bg-elevated border border-border rounded-xl p-4 hover:bg-card transition-all cursor-pointer active:scale-[0.98]"
                                        onClick={() => {
                                            setSelectedMarket(position.symbol);
                                            onTokenClick?.(position.symbol);
                                        }}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <div className="font-semibold text-lg">{position.symbol}</div>
                                                <div className="text-sm text-muted">
                                                    {isLong ? 'Long' : 'Short'} • {position.leverage}x
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-1 ${pnlColor}`}>
                                                {position.unrealizedPnl >= 0 ? (
                                                    <ArrowUpRight className="w-4 h-4" />
                                                ) : (
                                                    <ArrowDownRight className="w-4 h-4" />
                                                )}
                                                <span className="font-semibold">
                                                    ${position.unrealizedPnl.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-muted">Size:</span>{' '}
                                                <span className="font-medium">{position.size.toFixed(4)}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted">Entry:</span>{' '}
                                                <span className="font-medium">${position.entryPrice.toFixed(2)}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted">Mark:</span>{' '}
                                                <span className="font-medium">${position.markPrice.toFixed(2)}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted">Liq:</span>{' '}
                                                <span className="font-medium">${position.liquidationPrice.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Watchlist */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Watchlist</h2>
                    </div>
                    
                    {/* Add to watchlist */}
                    <div className="mb-4">
                        <select
                            className="w-full bg-elevated border border-border rounded-xl px-4 py-3 text-sm min-h-[52px]"
                            value=""
                            onChange={(e) => {
                                if (e.target.value) {
                                    addToWatchlist(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                        >
                            <option value="">Add token to watchlist...</option>
                            {markets
                                .filter(m => !watchlist.includes(m.name))
                                .slice(0, 50) // Limit to first 50 to avoid huge dropdown
                                .map(market => (
                                    <option key={market.name} value={market.name}>
                                        {market.name} - ${market.price?.toFixed(2) || '0.00'}
                                    </option>
                                ))}
                        </select>
                    </div>

                    {/* Watchlist items */}
                    {watchlistMarkets.length === 0 ? (
                        <div className="text-center py-8 text-muted">
                            <p>No tokens in watchlist</p>
                            <p className="text-xs mt-2">Add tokens using the dropdown above</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {watchlistMarkets.map((market) => {
                                const priceChangePercent = market.change24h || 0;
                                const isPositive = priceChangePercent >= 0;

                                return (
                                    <div
                                        key={market.name}
                                        className="bg-elevated border border-border rounded-xl p-4 hover:bg-card transition-all cursor-pointer group active:scale-[0.98]"
                                        onClick={() => {
                                            setSelectedMarket(market.symbol);
                                            onTokenClick?.(market.symbol);
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="font-semibold">{market.name}</div>
                                                <div className="text-sm text-muted">
                                                    ${market.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className={`text-sm font-semibold ${isPositive ? 'text-buy' : 'text-sell'}`}>
                                                    {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFromWatchlist(market.name);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-sell-light rounded-full"
                                                >
                                                    <X className="w-4 h-4 text-muted hover:text-sell" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


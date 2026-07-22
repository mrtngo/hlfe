'use client';

import { Newspaper, ExternalLink, Twitter } from 'lucide-react';

// Crypto news accounts to follow
const NEWS_ACCOUNTS = [
    {
        handle: 'TreeNewsHQ',
        name: 'Tree News',
        description: 'Breaking crypto news 24/7',
        category: 'Breaking'
    },
    {
        handle: 'zaborhmnn',
        name: 'Zoomer',
        description: 'Crypto alpha & market insights',
        category: 'Alpha'
    },
    {
        handle: 'DegenBurger',
        name: 'DB',
        description: 'DeFi degen plays',
        category: 'DeFi'
    },
    {
        handle: 'WatcherGuru',
        name: 'Watcher Guru',
        description: 'Crypto news & whale alerts',
        category: 'Whales'
    },
    {
        handle: 'tier10k',
        name: 'Tier10K',
        description: 'First to market headlines',
        category: 'Breaking'
    },
    {
        handle: 'CryptoKaleo',
        name: 'Kaleo',
        description: 'Charts & market analysis',
        category: 'Charts'
    },
];

interface NewsFeedProps {
    height?: number;
    showHeader?: boolean;
}

export function NewsFeed({ height = 600, showHeader = true }: NewsFeedProps) {
    return (
        <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl overflow-hidden">
            {showHeader && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Newspaper className="w-5 h-5 text-brand" />
                        <h2 className="text-white font-bold">Crypto News</h2>
                    </div>
                    <a
                        href="https://twitter.com/search?q=crypto%20OR%20bitcoin%20OR%20ethereum&src=typed_query&f=live"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary rounded-lg text-xs text-coffee-medium hover:text-brand hover:bg-bg-elevated transition-all"
                    >
                        <Twitter className="w-4 h-4" />
                        Live
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            )}

            {/* Info Banner */}
            <div className="px-4 py-3 bg-brand/5 border-b border-[#E3B34C]/20">
                <p className="text-xs text-coffee-medium text-center">
                    📱 Tap any account to view their latest tweets on X
                </p>
            </div>

            {/* Account Cards Grid */}
            <div
                className="p-4 overflow-y-auto grid grid-cols-2 gap-3"
                style={{ maxHeight: height - 140 }}
            >
                {NEWS_ACCOUNTS.map((account) => (
                    <a
                        key={account.handle}
                        href={`https://twitter.com/${account.handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-4 bg-bg-secondary rounded-xl border border-white/10 hover:border-[#E3B34C]/50 hover:bg-bg-elevated transition-all"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="w-10 h-10 bg-brand/20 rounded-full flex items-center justify-center">
                                <Twitter className="w-5 h-5 text-brand" />
                            </div>
                            <span className="text-[10px] px-2 py-0.5 bg-bg-elevated rounded-full text-coffee-medium">
                                {account.category}
                            </span>
                        </div>
                        <h3 className="font-bold text-white text-sm group-hover:text-brand transition-colors">
                            @{account.name}
                        </h3>
                        <p className="text-xs text-coffee-medium mt-1 line-clamp-2">
                            {account.description}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                            Open on X <ExternalLink className="w-3 h-3" />
                        </div>
                    </a>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-t border-white/10 space-y-2">
                <a
                    href="https://twitter.com/i/lists/create"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-brand text-white font-bold rounded-full hover:bg-[#FFD700] transition-all"
                >
                    Create Your News List on X
                    <ExternalLink className="w-4 h-4" />
                </a>
                <p className="text-[10px] text-coffee-medium text-center">
                    Tip: Create a private X list with these accounts for a curated feed
                </p>
            </div>
        </div>
    );
}

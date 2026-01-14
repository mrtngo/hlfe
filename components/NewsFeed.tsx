'use client';

import { useEffect, useRef, useState } from 'react';
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';

// Twitter accounts to follow for crypto news
const TWITTER_ACCOUNTS = [
    { handle: 'zaborhmnn', name: 'Zoomer' },
    { handle: 'DegenBurger', name: 'DB' },
    { handle: 'TreeNewsHQ', name: 'Tree News' },
    { handle: 'WatcherGuru', name: 'Watcher Guru' },
    { handle: 'tier10k', name: 'Tier10K' },
];

// You can create a Twitter List with these accounts and use the list ID
// Go to twitter.com -> Lists -> Create new list -> Add the accounts above
// Then copy the list ID from the URL
const TWITTER_LIST_ID = ''; // Replace with your list ID, e.g., '1234567890'

interface NewsFeedProps {
    height?: number;
    showHeader?: boolean;
}

export function NewsFeed({ height = 500, showHeader = true }: NewsFeedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Load Twitter widget script
        const loadTwitterWidget = () => {
            if ((window as any).twttr) {
                (window as any).twttr.widgets.load(containerRef.current);
                setIsLoading(false);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://platform.twitter.com/widgets.js';
            script.async = true;
            script.onload = () => {
                setIsLoading(false);
                if ((window as any).twttr) {
                    (window as any).twttr.widgets.load(containerRef.current);
                }
            };
            script.onerror = () => {
                setError('Failed to load Twitter feed');
                setIsLoading(false);
            };
            document.body.appendChild(script);
        };

        // Small delay to ensure DOM is ready
        const timer = setTimeout(loadTwitterWidget, 100);
        return () => clearTimeout(timer);
    }, []);

    const reload = () => {
        setIsLoading(true);
        setError(null);
        if ((window as any).twttr) {
            (window as any).twttr.widgets.load(containerRef.current);
        }
        setTimeout(() => setIsLoading(false), 1000);
    };

    return (
        <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl overflow-hidden">
            {showHeader && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Newspaper className="w-5 h-5 text-[#FFFF00]" />
                        <h2 className="text-white font-bold">Crypto News</h2>
                    </div>
                    <button
                        onClick={reload}
                        className="p-2 text-coffee-medium hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            )}

            <div
                ref={containerRef}
                className="relative overflow-y-auto"
                style={{ height, maxHeight: height }}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D]">
                        <RefreshCw className="w-6 h-6 text-[#FFFF00] animate-spin" />
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D0D0D] text-coffee-medium">
                        <p className="mb-2">{error}</p>
                        <button
                            onClick={reload}
                            className="px-4 py-2 bg-[#FFFF00] text-black rounded-lg text-sm font-bold"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Twitter List Embed - Use this if you have a Twitter List ID */}
                {TWITTER_LIST_ID ? (
                    <a
                        className="twitter-timeline"
                        data-theme="dark"
                        data-chrome="noheader nofooter noborders transparent"
                        data-tweet-limit="10"
                        href={`https://twitter.com/i/lists/${TWITTER_LIST_ID}`}
                    >
                        Loading...
                    </a>
                ) : (
                    /* Fallback: Individual account timeline */
                    <a
                        className="twitter-timeline"
                        data-theme="dark"
                        data-chrome="noheader nofooter noborders transparent"
                        data-tweet-limit="10"
                        href="https://twitter.com/TreeNewsHQ"
                    >
                        Loading news...
                    </a>
                )}
            </div>

            {/* Quick links to accounts */}
            <div className="px-4 py-3 border-t border-white/10">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <span className="text-xs text-coffee-medium whitespace-nowrap">Follow:</span>
                    {TWITTER_ACCOUNTS.map((account) => (
                        <a
                            key={account.handle}
                            href={`https://twitter.com/${account.handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg text-xs text-coffee-medium hover:text-[#FFFF00] hover:bg-white/10 transition-all whitespace-nowrap"
                        >
                            @{account.name}
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}

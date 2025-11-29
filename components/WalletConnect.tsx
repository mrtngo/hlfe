'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { usePrivy } from '@privy-io/react-auth';
import { Wallet, LogOut, TrendingUp, Copy, Check, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function WalletConnect() {
    const { t, formatCurrency } = useLanguage();
    const { account, address } = useHyperliquid();
    const { ready, authenticated, login, logout, user } = usePrivy();
    const [copied, setCopied] = useState(false);

    const handleConnect = async () => {
        if (authenticated) {
            logout();
        } else {
            login();
        }
    };

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <div className="flex items-center gap-4">
            {authenticated && address && (
                <>
                    <div className="hidden md:flex items-center gap-6 px-4 py-2 glass-card">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted">{t.wallet.equity}</span>
                                <span className="text-sm font-semibold mono">
                                    {account.equity > 0 ? formatCurrency(account.equity) : '--'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                                <span className="text-xs text-muted">{t.wallet.availableMargin}</span>
                                <span className="text-sm font-semibold mono">
                                    {account.availableMargin > 0 ? formatCurrency(account.availableMargin) : '--'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {account.equity === 0 && (
                        <div className="hidden md:block text-xs text-muted px-2">
                            Check console for details
                        </div>
                    )}

                    <button
                        onClick={copyAddress}
                        className="hidden md:flex items-center gap-2 px-3 py-2 glass-card hover:bg-glass transition-colors"
                        title={t.common.copy || 'Copy address'}
                    >
                        <span className="text-sm mono">{formatAddress(address)}</span>
                        {copied ? (
                            <Check className="w-3 h-3 text-buy" />
                        ) : (
                            <Copy className="w-3 h-3 text-muted" />
                        )}
                    </button>
                </>
            )}

            <button
                onClick={handleConnect}
                disabled={!ready}
                className={`btn ${authenticated ? 'btn-secondary' : 'btn-primary'} flex items-center gap-2`}
            >
                {!ready ? (
                    <>
                        <div className="spinner" />
                        Loading...
                    </>
                ) : authenticated ? (
                    <>
                        <LogOut className="w-4 h-4" />
                        {t.wallet.disconnect}
                    </>
                ) : (
                    <>
                        <Mail className="w-4 h-4" />
                        {t.wallet.connect}
                    </>
                )}
            </button>
        </div>
    );
}

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
                    <div className="hidden md:flex items-center gap-6 px-4 py-3 bg-white rounded-2xl shadow-soft border border-gray-100">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <div className="flex flex-col">
                                <span className="text-xs text-coffee-light">{t.wallet.equity}</span>
                                <span className="text-sm font-semibold mono text-coffee-dark">
                                    {account.equity > 0 ? formatCurrency(account.equity) : '--'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                                <span className="text-xs text-coffee-light">{t.wallet.availableMargin}</span>
                                <span className="text-sm font-semibold mono text-coffee-dark">
                                    {account.availableMargin > 0 ? formatCurrency(account.availableMargin) : '--'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {account.equity === 0 && (
                        <div className="hidden md:block text-xs text-coffee-light px-2">
                            Check console for details
                        </div>
                    )}

                    <button
                        onClick={copyAddress}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-all shadow-soft"
                        title={t.common.copy || 'Copy address'}
                    >
                        <Wallet className="w-4 h-4 text-primary" />
                        <span className="text-sm font-mono font-semibold text-coffee-dark">{formatAddress(address)}</span>
                        {copied ? (
                            <Check className="w-4 h-4 text-bullish" />
                        ) : (
                            <Copy className="w-4 h-4 text-coffee-light" />
                        )}
                    </button>
                </>
            )}

            <button
                onClick={handleConnect}
                disabled={!ready}
                className={`btn ${authenticated ? 'btn-secondary' : 'btn-primary'} flex items-center gap-2 px-4 py-2 min-h-[36px] text-sm font-medium rounded-full transition-all shadow-sm hover:shadow-md`}
            >
                {!ready ? (
                    <>
                        <div className="spinner w-4 h-4 border-2" />
                    </>
                ) : authenticated ? (
                    <>
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.wallet.disconnect}</span>
                    </>
                ) : (
                    <>
                        {t.wallet.connect}
                    </>
                )}
            </button>
        </div>
    );
}

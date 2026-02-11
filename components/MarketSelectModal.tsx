'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import TokenLogo from '@/components/TokenLogo';
import { getTokenFullName } from '@/lib/constants';
import type { Market } from '@/hooks/useHyperliquid';

interface MarketSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (market: Market) => void;
    markets: Market[];
    title: string;
    subtitle?: string;
    searchPlaceholder?: string;
    excludeSymbols?: string[];
}

export default function MarketSelectModal({
    isOpen,
    onClose,
    onSelect,
    markets,
    title,
    subtitle,
    searchPlaceholder,
    excludeSymbols = []
}: MarketSelectModalProps) {
    const { t, formatPercent } = useLanguage();
    const { formatCurrency } = useCurrency();
    const [searchQuery, setSearchQuery] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Reset search when opening
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !isClient) return null;

    const filteredMarkets = markets
        .filter(m => !excludeSymbols.includes(m.name))
        .filter(m => {
            const query = searchQuery.toLowerCase();
            return m.symbol.toLowerCase().includes(query) || m.name.toLowerCase().includes(query);
        });

    const modalContent = (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
            {/* Backdrop */}
            <div
                style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                }}
                onClick={onClose}
            />
            {/* Modal — centered */}
            <div
                style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    pointerEvents: 'none',
                }}
            >
                <div
                    ref={modalRef}
                    style={{
                        pointerEvents: 'auto',
                        width: '100%',
                        maxWidth: '420px',
                        maxHeight: '75vh',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'slideUp 0.25s ease-out',
                        background: 'linear-gradient(to bottom, rgba(30,30,35,0.98), rgba(18,18,22,0.99))',
                        border: '1px solid rgba(255,214,10,0.15)',
                        boxShadow: '0 0 60px rgba(255,214,10,0.08), 0 25px 50px -12px rgba(0,0,0,0.6)',
                    }}
                >
                    {/* Header with gradient accent */}
                    <div style={{ position: 'relative', padding: '20px 20px 16px' }}>
                        {/* Subtle gradient line at top */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--color-brand-primary), transparent)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,214,10,0.12)' }}>
                                    <Search className="w-5 h-5 text-brand" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h3>
                                    {subtitle && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{subtitle}</p>}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer' }}
                            >
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div style={{ padding: '0 20px 16px' }}>
                        <div style={{ position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'rgba(255,255,255,0.3)' }} />
                            <input
                                type="text"
                                placeholder={searchPlaceholder || t.markets.search}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                                style={{
                                    width: '100%',
                                    paddingLeft: '40px',
                                    paddingRight: '40px',
                                    paddingTop: '12px',
                                    paddingBottom: '12px',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    caretColor: 'var(--color-brand-primary)',
                                }}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer' }}
                                >
                                    <X style={{ width: '12px', height: '12px', color: 'rgba(255,255,255,0.6)' }} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ margin: '0 20px', height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                    {/* Markets List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                        {filteredMarkets.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.4)', gap: '8px' }}>
                                <Search style={{ width: '32px', height: '32px', opacity: 0.4 }} />
                                <p style={{ fontSize: '14px', margin: 0 }}>{t.markets.noMarketsFound}</p>
                            </div>
                        ) : (
                            filteredMarkets.map(market => {
                                const marketIsPositive = (market.change24h || 0) >= 0;
                                return (
                                    <button
                                        key={market.name}
                                        type="button"
                                        onClick={() => {
                                            onSelect(market);
                                            onClose();
                                        }}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s',
                                        }}
                                        onTouchStart={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                        onTouchEnd={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                                            {/* Left: Logo + Name */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                                <div style={{ flexShrink: 0, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}>
                                                    <TokenLogo symbol={market.symbol} size={38} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: '8px' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {getTokenFullName(market.name)}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {market.name}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Right: Price + Change */}
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                                                    {market.price ? formatCurrency(market.price) : '0.00'}
                                                </div>
                                                <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: marketIsPositive ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                                                    {marketIsPositive ? '+' : ''}{(market.change24h || 0).toFixed(2)}%
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

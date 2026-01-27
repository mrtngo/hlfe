'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from 'react';

type Currency = 'USD' | 'COP';

interface CurrencyContextType {
    currency: Currency;
    exchangeRate: number; // COP per USD
    toggleCurrency: () => void;
    setCurrency: (currency: Currency) => void;
    formatCurrency: (value: number, maximumFractionDigits?: number) => string;
    isLoadingRay: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const API_URL = 'https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciahasta DESC';
const DEFAULT_RATE = 4200; // Fallback rate

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrencyState] = useState<Currency>('USD');
    const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_RATE);
    const [isLoadingRay, setIsLoadingRay] = useState<boolean>(true);

    useEffect(() => {
        const fetchTRM = async () => {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error('Failed to fetch TRM');
                const data = await response.json();
                if (data && data.length > 0 && data[0].valor) {
                    const rate = parseFloat(data[0].valor);
                    if (!isNaN(rate)) {
                        setExchangeRate(rate);
                    }
                }
            } catch (error) {
                console.error('Error fetching TRM:', error);
            } finally {
                setIsLoadingRay(false);
            }
        };

        fetchTRM();

        // Load saved preference
        const savedCurrency = localStorage.getItem('hlfe_currency');
        if (savedCurrency === 'COP') {
            setCurrencyState('COP');
        }
    }, []);

    const setCurrency = useCallback((c: Currency) => {
        setCurrencyState(c);
        localStorage.setItem('hlfe_currency', c);
    }, []);

    const toggleCurrency = useCallback(() => {
        setCurrencyState(prev => {
            const next = prev === 'USD' ? 'COP' : 'USD';
            localStorage.setItem('hlfe_currency', next);
            return next;
        });
    }, []);

    const formatCurrency = useCallback((value: number, maximumFractionDigits?: number) => {
        // Auto-detect appropriate decimals for small prices if not explicitly specified
        let decimals = maximumFractionDigits;
        if (decimals === undefined) {
            const absValue = Math.abs(value);
            if (absValue > 0 && absValue < 0.0001) {
                decimals = 8; // Very small prices (e.g., $0.00001234)
            } else if (absValue > 0 && absValue < 0.01) {
                decimals = 6; // Small prices (e.g., $0.001234)
            } else if (absValue > 0 && absValue < 1) {
                decimals = 4; // Sub-dollar prices (e.g., $0.1234)
            } else if (absValue >= 1 && absValue < 10) {
                decimals = 3; // 1-digit assets (e.g., EUR $1.082)
            } else {
                decimals = 2; // Normal prices
            }
        }

        if (currency === 'COP') {
            const copValue = value * exchangeRate;
            // Use 'es-CO' for dots/commas but manually add COP prefix to avoid ambiguity
            return `COP ${new Intl.NumberFormat('es-CO', {
                maximumFractionDigits: 0,
                minimumFractionDigits: 0
            }).format(copValue)}`;
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: decimals,
            minimumFractionDigits: Math.min(2, decimals)
        }).format(value);
    }, [currency, exchangeRate]);

    const contextValue = useMemo(() => ({
        currency,
        exchangeRate,
        toggleCurrency,
        setCurrency,
        formatCurrency,
        isLoadingRay
    }), [currency, exchangeRate, toggleCurrency, setCurrency, formatCurrency, isLoadingRay]);

    return (
        <CurrencyContext.Provider value={contextValue}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
}

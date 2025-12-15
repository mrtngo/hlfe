'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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

    const setCurrency = (c: Currency) => {
        setCurrencyState(c);
        localStorage.setItem('hlfe_currency', c);
    };

    const toggleCurrency = () => {
        setCurrency(currency === 'USD' ? 'COP' : 'USD');
    };

    const formatCurrency = (value: number, maximumFractionDigits: number = 2) => {
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
            maximumFractionDigits,
            minimumFractionDigits: 2
        }).format(value);
    };

    return (
        <CurrencyContext.Provider value={{
            currency,
            exchangeRate,
            toggleCurrency,
            setCurrency,
            formatCurrency,
            isLoadingRay
        }}>
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

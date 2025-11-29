'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import es from '@/lib/i18n/es.json';
import en from '@/lib/i18n/en.json';

type Language = 'es' | 'en';

type Translations = typeof es;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  formatNumber: (value: number, decimals?: number) => string;
  formatCurrency: (value: number, decimals?: number) => string;
  formatPercent: (value: number, decimals?: number) => string;
}

const translations: Record<Language, Translations> = {
  es,
  en,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es'); // Default to Spanish for LATAM

  useEffect(() => {
    // Load saved language preference
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'es' || saved === 'en')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const formatNumber = (value: number, decimals: number = 2): string => {
    const t = translations[language];
    const fixed = value.toFixed(decimals);
    const parts = fixed.split('.');

    // Format thousands
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, t.formatters.thousand);

    // Join with decimal separator
    return parts.join(t.formatters.decimal);
  };

  const formatCurrency = (value: number, decimals: number = 2): string => {
    const t = translations[language];
    const formatted = formatNumber(Math.abs(value), decimals);
    const sign = value < 0 ? '-' : '';
    return `${sign}${t.formatters.currency}${formatted}`;
  };

  const formatPercent = (value: number, decimals: number = 2): string => {
    const formatted = formatNumber(value, decimals);
    return `${formatted}%`;
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language],
    formatNumber,
    formatCurrency,
    formatPercent,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

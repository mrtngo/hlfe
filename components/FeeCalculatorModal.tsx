'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, DollarSign, Trophy, Info } from 'lucide-react';

interface FeeCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FeeCalculatorModal({ isOpen, onClose }: FeeCalculatorModalProps) {
    const [amount, setAmount] = useState<number>(5000000); // Default 5M COP
    const [activeTab, setActiveTab] = useState<'standard' | 'dividends' | 'usa'>('standard');

    const formatCOP = (val: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        }).format(val);
    };

    const calculation = useMemo(() => {
        // 1. TRII
        let triiCost = (amount < 5000000) ? 14875 : (amount * 0.002975);
        // Note: Dividends cost for Trii is technically different (spread + fee) but keeping simple for comparison
        if (activeTab === 'dividends') triiCost += 0;

        // 2. BANCOLOMBIA
        let bancolombiaCost = 0;
        if (amount >= 200000 && amount <= 10000000) bancolombiaCost = 23800;
        else if (amount > 10000000) bancolombiaCost = amount * 0.00238;

        // 3. TYBA
        const tybaCost = amount * 0.015; // Spread

        // 4. RAYO - 0.075% Taker Fee
        const rayoCost = amount * 0.00075;

        const competitors = [
            { name: 'Trii', cost: triiCost, color: '#00D1FF', handle: 'somostrii' },
            { name: 'Bancolombia', cost: bancolombiaCost, color: '#FDDA24', handle: 'Bancolombia' },
            { name: 'Tyba', cost: tybaCost, color: '#6A5ACD', handle: 'tyba_latam' }
        ].sort((a, b) => a.cost - b.cost);

        // Calculate savings vs the cheapest competitor
        const cheapestCompetitor = competitors[0];
        const savings = cheapestCompetitor.cost - rayoCost;

        return {
            rayo: rayoCost,
            competitors,
            savings: savings > 0 ? savings : 0,
            bestCompetitor: cheapestCompetitor
        };
    }, [amount, activeTab]);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
        }}>
            {/* Backdrop */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(8px)',
                }}
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-[#0A0A0A] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFFF00]/5 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2" />

                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-2 border-b border-white/5 relative z-10">
                    <h2 className="text-xl font-bold text-white">Comparar Tarifas</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-coffee-medium hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 relative z-10 max-h-[80vh] overflow-y-auto">

                    {/* Hero / Big Input */}
                    <div className="space-y-4 text-center">
                        <h2 className="text-xs font-bold text-coffee-medium tracking-widest uppercase">Monto de Inversión</h2>

                        <div className="relative group">
                            <div className="absolute inset-0 bg-[#FFFF00]/10 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                            <div className="relative flex items-center justify-center gap-2">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    className="w-full bg-transparent text-center text-4xl font-black text-white focus:outline-none placeholder-white/20 font-mono tracking-tight"
                                    placeholder="0"
                                />
                            </div>
                            <div className="text-xs text-coffee-medium mt-1 font-mono">COP</div>
                        </div>

                        {/* Quick Selects */}
                        <div className="flex justify-center gap-2 flex-wrap">
                            {[1000000, 5000000, 10000000].map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setAmount(val)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${amount === val
                                        ? 'bg-[#FFFF00] text-black shadow-[0_0_10px_rgba(255,255,0,0.3)]'
                                        : 'bg-white/5 text-white hover:bg-white/10'
                                        }`}
                                >
                                    {(val / 1000000)}M
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Savings Highlight */}
                    <div className="bg-gradient-to-br from-[#FFFF00]/10 to-[#FFFF00]/5 border border-[#FFFF00]/20 rounded-2xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Trophy className="w-4 h-4 text-[#FFFF00]" />
                            <span className="text-[#FFFF00] font-bold text-xs tracking-wide">AHORRO ESTIMADO</span>
                        </div>
                        <div className="text-3xl font-black text-white mb-1 font-mono">
                            {formatCOP(calculation.savings)}
                        </div>
                        <p className="text-[10px] text-coffee-medium">
                            vs. {calculation.competitors[0].name} (Siguiente mejor opción)
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="bg-white/5 p-1 rounded-xl grid grid-cols-3 gap-1">
                        {[
                            { id: 'standard', label: 'Estándar', icon: TrendingUp },
                            { id: 'dividends', label: 'Dividendos', icon: DollarSign },
                            { id: 'usa', label: 'Global', icon: Trophy },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-2 rounded-lg text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${activeTab === tab.id
                                    ? 'bg-[#1A1A1A] text-[#FFFF00] shadow-lg'
                                    : 'text-coffee-medium hover:text-white'
                                    }`}
                            >
                                <tab.icon className={`w-3 h-3 ${activeTab === tab.id ? 'text-[#FFFF00]' : 'opacity-50'}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Comparison Visualizer */}
                    <div className="space-y-3">
                        {/* Rayo Card */}
                        <div
                            className="bg-[#FFFF00] rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group text-black"
                            style={{ color: '#000000' }}
                        >
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-10 h-10 rounded-lg bg-black text-[#FFFF00] flex items-center justify-center font-black text-lg italic shadow-md">
                                    R
                                </div>
                                <div>
                                    <h3 className="text-black font-black text-base !text-black" style={{ color: '#000000' }}>RAYO</h3>
                                    <p className="text-black/70 text-[10px] font-bold !text-black/70" style={{ color: 'rgba(0,0,0,0.7)' }}>Tarifa Taker 0.075%</p>
                                </div>
                            </div>
                            <div className="text-right relative z-10">
                                <div className="text-xl font-black text-black font-mono !text-black" style={{ color: '#000000' }}>{formatCOP(calculation.rayo)}</div>
                                <div className="text-black/70 text-[9px] font-bold uppercase !text-black/70" style={{ color: 'rgba(0,0,0,0.7)' }}>Costo Total</div>
                            </div>
                        </div>

                        {/* Competitors */}
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-bold text-coffee-medium uppercase pl-1">La Competencia</h3>
                            {calculation.competitors.map((comp) => (
                                <div key={comp.name} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 min-w-[2rem] min-h-[2rem] rounded-full flex-shrink-0 flex items-center justify-center font-bold text-black text-[10px] shadow-inner overflow-hidden bg-white"
                                            style={{ width: '32px', height: '32px' }}
                                        >
                                            <img
                                                src={`https://unavatar.io/twitter/${comp.handle}`}
                                                alt={comp.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement!.style.backgroundColor = comp.color;
                                                    e.currentTarget.parentElement!.innerHTML = comp.name[0];
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-sm">{comp.name}</h3>
                                            <div className="h-1 w-12 bg-white/10 rounded-full overflow-hidden mt-1">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{ width: '100%', backgroundColor: comp.color }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-white font-mono">{formatCOP(comp.cost)}</div>
                                        <div className="text-coffee-medium text-[9px]">+{(comp.cost / (calculation.rayo || 1)).toFixed(1)}x vs Rayo</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info Footnote */}
                    <div className="bg-white/5 p-3 rounded-xl flex gap-2 text-[10px] text-coffee-medium leading-relaxed">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/40" />
                        <p>
                            Tarifas públicas 2025. Rayo Taker: 0.075%. Maker fees pueden ser menores.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

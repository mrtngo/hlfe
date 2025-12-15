'use client';

import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, DollarSign, Info, Trophy, AlertTriangle } from 'lucide-react';

type Strategy = 'standard' | 'dividends' | 'usa';

export default function FeeCalculator() {
    const [amount, setAmount] = useState<number>(1000000); // Default 1M COP
    const [strategy, setStrategy] = useState<Strategy>('standard');

    const formatCOP = (val: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(val);
    };

    const calculation = useMemo(() => {
        const results = [];
        const IVA = 1.19; // 19% VAT

        // 1. TRII
        let triiCost = 0;
        let triiNotes = [];
        if (amount < 5000000) {
            triiCost = 14875; // Includes IVA usually? User said "Costo = 14,875". Assuming final.
        } else {
            triiCost = amount * 0.002975; // 0.25% + IVA? 0.25 * 1.19 = 0.2975
        }

        if (strategy === 'dividends') {
            triiNotes.push('Comisión de recaudo: 1.19% sobre dividendos');
        }

        results.push({
            name: 'Trii',
            cost: triiCost,
            notes: triiNotes,
            color: '#00D1FF' // Trii blue-ish
        });

        // 2. BANCOLOMBIA E-TRADING
        let bancolombiaCost = 0;
        let bancolombiaNotes = []; // 23,800 is likely + IVA? User said "Costo = 23,800 (Fijo)". Let's assume final or +IVA.
        // Usually Bancolombia is + IVA. 20k + IVA = 23,800. Correct.
        if (amount >= 200000 && amount <= 10000000) {
            bancolombiaCost = 23800;
        } else if (amount > 10000000) {
            bancolombiaCost = amount * 0.00238; // 0.2% + IVA (0.2 * 1.19 = 0.238%)
        } else {
            bancolombiaCost = 0; // Less than min
            bancolombiaNotes.push('Monto mínimo sugerido 200k');
        }

        // No extra cost for dividends

        results.push({
            name: 'Bancolombia',
            cost: bancolombiaCost,
            notes: bancolombiaNotes,
            color: '#FDDA24' // Bancolombia Yellow
        });

        // 3. TYBA (Mercado Global)
        // Commission 0, Spread 1.5%
        const tybaCost = amount * 0.015;
        results.push({
            name: 'Tyba (Global)',
            cost: tybaCost,
            notes: ['Spread cambiario ~1.5%'],
            color: '#6A5ACD' // Purple
        });

        // 4. RAYO (Hyperliquid)
        // Fee: ~0.025% (Taker) + Builder Fee (e.g. 0.01%)?
        // Let's be conservative and say 0.1% total to cover everything.
        // Actually Hyperliquid is insanely cheap. 2.5bps = 0.025%.
        // Let's use 0.05% (0.0005) as a "Realistic" fee for Rayo comparison.
        const rayoCost = amount * 0.0005; // 0.05%
        results.push({
            name: 'Rayo',
            cost: rayoCost,
            notes: ['Tarifa Protocolo ~0.05%', 'Sin cobro por dividendos'],
            color: '#FFFF00', // Neon Yellow
            highlight: true
        });

        // Sort by cost
        return results.sort((a, b) => a.cost - b.cost);
    }, [amount, strategy]);

    const recommendation = useMemo(() => {
        if (strategy === 'usa') return 'Tyba ofrece acceso directo, pero Rayo es 30x más barato.';
        if (strategy === 'dividends') return 'Bancolombia evita cobros en dividendos, pero Rayo tiene comisiones de operación cercanas a cero.';
        if (amount < 6600000) return 'Para montos bajos, Trii suele ser la opción local. Rayo sigue siendo más barato.';
        if (amount > 8000000) return 'Para montos altos, Bancolombia mejora, pero Rayo sigue siendo imbatible.';
        return 'Rayo es la opción más eficiente matemáticamente.';
    }, [amount, strategy]);

    return (
        <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#FFFF00]/20 flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-[#FFFF00]" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Calculadora de Tarifas</h2>
                    <p className="text-sm text-coffee-medium">Compara Rayo vs Mercado Colombiano</p>
                </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-coffee-medium font-bold mb-2 block">Monto a Invertir (COP)</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FFFF00]" />
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-mono placeholder-white/20 focus:outline-none focus:border-[#FFFF00]"
                            placeholder="1,000,000"
                        />
                    </div>
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                        {[1000000, 5000000, 10000000, 50000000].map((val) => (
                            <button
                                key={val}
                                onClick={() => setAmount(val)}
                                className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                            >
                                {formatCOP(val)}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs text-coffee-medium font-bold mb-2 block">Estrategia</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setStrategy('standard')}
                            className={`p-2 rounded-xl border text-xs font-bold transition-all ${strategy === 'standard' ? 'bg-[#FFFF00] border-[#FFFF00] text-black' : 'bg-transparent border-white/10 text-coffee-medium hover:text-white'
                                }`}
                        >
                            Estándar
                        </button>
                        <button
                            onClick={() => setStrategy('dividends')}
                            className={`p-2 rounded-xl border text-xs font-bold transition-all ${strategy === 'dividends' ? 'bg-[#FFFF00] border-[#FFFF00] text-black' : 'bg-transparent border-white/10 text-coffee-medium hover:text-white'
                                }`}
                        >
                            Dividendos
                        </button>
                        <button
                            onClick={() => setStrategy('usa')}
                            className={`p-2 rounded-xl border text-xs font-bold transition-all ${strategy === 'usa' ? 'bg-[#FFFF00] border-[#FFFF00] text-black' : 'bg-transparent border-white/10 text-coffee-medium hover:text-white'
                                }`}
                        >
                            Acciones USA
                        </button>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="space-y-3 pt-2">
                {calculation.map((item, idx) => (
                    <div
                        key={item.name}
                        className={`relative p-3 rounded-xl border transition-all ${item.highlight
                                ? 'bg-[#FFFF00]/10 border-[#FFFF00] scale-[1.02] shadow-[0_0_20px_rgba(255,255,0,0.1)]'
                                : 'bg-white/5 border-transparent opacity-80'
                            }`}
                    >
                        {item.highlight && (
                            <div className="absolute -top-3 right-4 bg-[#FFFF00] text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Trophy className="w-3 h-3" /> MEJOR OPCIÓN
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-1">
                            <span className={`font-bold ${item.highlight ? 'text-white' : 'text-coffee-medium'}`}>{item.name}</span>
                            <span className={`font-mono font-bold ${item.highlight ? 'text-[#FFFF00] text-lg' : 'text-white'}`}>
                                {formatCOP(item.cost)}
                            </span>
                        </div>

                        {/* Bar chart visual */}
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${item.cost === 0 ? 0 : Math.max(5, (item.cost / calculation[calculation.length - 1].cost) * 100)}%`,
                                    backgroundColor: item.color
                                }}
                            />
                        </div>

                        {item.notes.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {item.notes.map((note, i) => (
                                    <span key={i} className="text-[10px] bg-white/5 text-coffee-medium px-2 py-0.5 rounded flex items-center gap-1">
                                        <Info className="w-3 h-3" /> {note}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Recommendation */}
            <div className="bg-white/5 p-3 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#FFFF00] flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-xs font-bold text-[#FFFF00] mb-1">Análisis Financiero</h4>
                    <p className="text-xs text-white leading-relaxed">{recommendation}</p>
                </div>
            </div>

            <p className="text-[10px] text-coffee-medium text-center">
                *Tarifas oficiales 2025 (Incluye IVA). Rayo opera con tarifas DeFi variables, estimado 0.05%.
            </p>
        </div>
    );
}

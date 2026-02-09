'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useWallets } from '@privy-io/react-auth';
import { X, AlertCircle, Loader2, ArrowUpRight, Clock, DollarSign } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { API_URL } from '@/lib/hyperliquid/client';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
    const { address, account, withdraw } = useHyperliquid();
    const { wallets } = useWallets();
    const { t } = useLanguage();

    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Withdrawal fee is $1
    const WITHDRAWAL_FEE = 1;
    const MIN_WITHDRAWAL = 2; // Min $2 to cover fee + some amount
    const availableBalance = account.availableMargin || 0;
    const amountNum = parseFloat(amount || '0');
    const netAmount = amountNum - WITHDRAWAL_FEE;
    const isValidAmount = amountNum >= MIN_WITHDRAWAL && amountNum <= availableBalance;

    const handleWithdraw = async () => {
        if (!address || !isValidAmount) return;

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            await withdraw(amount, address);
            setSuccess(true);
            setAmount('');
        } catch (err: any) {
            console.error('Withdrawal error:', err);
            setError(err.message || 'Failed to process withdrawal');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/85 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-[400px] bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">{t.withdraw.title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-bg-secondary transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Info Banner */}
                    <div className="bg-brand/10 border border-[#FFFF00]/20 rounded-xl p-3 flex gap-3">
                        <ArrowUpRight className="w-5 h-5 text-brand shrink-0" />
                        <div className="text-sm">
                            <div className="font-semibold text-brand mb-1">{t.withdraw.toArbitrum}</div>
                            <div className="text-white/60">
                                {t.withdraw.desc}
                                <br />
                                <span className="text-brand">{t.withdraw.fee}: ${WITHDRAWAL_FEE} USDC</span>
                            </div>
                        </div>
                    </div>

                    {/* Balance */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-white/50">{t.withdraw.available}:</span>
                        <button
                            onClick={() => setAmount(availableBalance.toFixed(2))}
                            className="text-white hover:text-brand transition-colors font-mono"
                        >
                            ${availableBalance.toFixed(2)}
                        </button>
                    </div>

                    {/* Amount Input */}
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                setError('');
                                setSuccess(false);
                            }}
                            placeholder="0.00"
                            className="w-full py-4 px-4 pr-20 bg-[#1A1A1A] border border-white/10 rounded-xl text-white text-lg font-mono focus:border-[#FFFF00]/50 focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white font-semibold">
                            USDC
                        </span>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="flex gap-2">
                        {[25, 50, 75, 100].map((pct) => (
                            <button
                                key={pct}
                                onClick={() => setAmount((availableBalance * pct / 100).toFixed(2))}
                                className="flex-1 py-2 text-sm font-semibold text-white/60 hover:text-brand bg-bg-secondary hover:bg-brand/10 rounded-lg transition-all"
                            >
                                {pct}%
                            </button>
                        ))}
                    </div>

                    {/* Summary */}
                    {amountNum > 0 && (
                        <div className="bg-[#1A1A1A] rounded-xl p-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-white/50">{t.withdraw.amount}</span>
                                <span className="text-white font-mono">${amountNum.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">{t.withdraw.fee}</span>
                                <span className="text-white/70 font-mono">-${WITHDRAWAL_FEE.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-white/10 pt-2 flex justify-between">
                                <span className="text-white/50">{t.withdraw.receive}</span>
                                <span className={`font-mono font-bold ${netAmount > 0 ? 'text-brand' : 'text-red-400'}`}>
                                    ${Math.max(0, netAmount).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Validation Messages */}
                    {amountNum > 0 && amountNum < MIN_WITHDRAWAL && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {t.withdraw.minAmount.replace('{{amount}}', MIN_WITHDRAWAL.toString())}
                        </div>
                    )}

                    {amountNum > availableBalance && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {t.withdraw.insufficient}
                        </div>
                    )}

                    {/* Withdraw Button */}
                    <button
                        onClick={handleWithdraw}
                        disabled={loading || !isValidAmount || !address}
                        className="w-full py-4 bg-brand text-black font-bold rounded-full hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {t.withdraw.processing}
                            </>
                        ) : (
                            <>
                                <ArrowUpRight className="w-5 h-5" />
                                {t.withdraw.withdraw}
                            </>
                        )}
                    </button>

                    {/* Feedback */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {t.withdraw.success}
                        </div>
                    )}

                    {/* Time Estimate */}
                    <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
                        <Clock className="w-3 h-3" />
                        {t.withdraw.estTime}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

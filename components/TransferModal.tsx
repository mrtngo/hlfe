'use client';

import { useState, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function TransferModal({ isOpen, onClose }: TransferModalProps) {
    const { account, transferBetweenSpotAndPerp, connected } = useHyperliquid();

    const [amount, setAmount] = useState('');
    const [toPerp, setToPerp] = useState(true); // true = Spot → Perp, false = Perp → Spot
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setError(null);
            setSuccess(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleTransfer = async () => {
        if (!connected) {
            setError('Please connect your wallet first');
            return;
        }

        const transferAmount = parseFloat(amount);
        if (isNaN(transferAmount) || transferAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        // Check if user has enough balance
        const sourceBalance = toPerp ? (account.spotBalance || 0) : account.availableMargin;
        if (transferAmount > sourceBalance) {
            setError(`Insufficient balance. You have ${sourceBalance.toFixed(2)} USDC available`);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const result = await transferBetweenSpotAndPerp(transferAmount, toPerp);

            if (result.success) {
                setSuccess(result.message);
                setAmount('');
                // Auto-close after 2 seconds
                setTimeout(() => onClose(), 2000);
            } else {
                setError(result.message);
            }
        } catch (err: any) {
            setError(err.message || 'Transfer failed');
        } finally {
            setLoading(false);
        }
    };

    const spotBalance = account?.spotBalance || 0;
    const perpBalance = account?.availableMargin || 0;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0A0A0A] border border-[#FFFF00]/30 rounded-xl max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-brand-primary)' }}>
                        Transfer USDC
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Balances Display */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-black border border-white/10 rounded-lg p-4">
                        <div className="text-xs text-white/50 mb-1">Spot Balance</div>
                        <div className="text-lg font-mono font-bold" style={{ color: 'var(--color-brand-primary)' }}>
                            {spotBalance.toFixed(2)} <span className="text-sm">USDC</span>
                        </div>
                    </div>
                    <div className="bg-black border border-white/10 rounded-lg p-4">
                        <div className="text-xs text-white/50 mb-1">Perp Balance</div>
                        <div className="text-lg font-mono font-bold" style={{ color: 'var(--color-brand-primary)' }}>
                            {perpBalance.toFixed(2)} <span className="text-sm">USDC</span>
                        </div>
                    </div>
                </div>

                {/* Direction Toggle */}
                <div className="mb-6">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setToPerp(false)}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                                !toPerp
                                    ? 'bg-[#FFFF00] text-black border-2 border-[#FFFF00]'
                                    : 'bg-transparent text-white/60 border-2 border-white/20 hover:border-white/40'
                            }`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Perp → Spot
                        </button>
                        <button
                            onClick={() => setToPerp(true)}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                                toPerp
                                    ? 'bg-[#FFFF00] text-black border-2 border-[#FFFF00]'
                                    : 'bg-transparent text-white/60 border-2 border-white/20 hover:border-white/40'
                            }`}
                        >
                            Spot → Perp
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Amount Input */}
                <div className="mb-6">
                    <label className="block text-xs text-white/50 mb-2">
                        Amount to Transfer
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                setError(null);
                                setSuccess(null);
                            }}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            className="w-full px-4 py-3 bg-black border border-[#FFFF00]/30 rounded-lg text-white text-lg font-mono focus:outline-none focus:border-[#FFFF00]"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 text-sm">
                            USDC
                        </span>
                    </div>
                    {/* Max Button */}
                    <button
                        onClick={() => {
                            const maxBalance = toPerp ? spotBalance : perpBalance;
                            setAmount(maxBalance.toFixed(2));
                        }}
                        className="mt-2 text-xs text-[#FFFF00] hover:underline"
                    >
                        Use Max ({toPerp ? spotBalance.toFixed(2) : perpBalance.toFixed(2)} USDC)
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg">
                        <p className="text-sm text-[#FF3B30]">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="mb-4 p-3 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg">
                        <p className="text-sm text-[#22C55E]">{success}</p>
                    </div>
                )}

                {/* Transfer Button */}
                <button
                    onClick={handleTransfer}
                    disabled={loading || !amount || parseFloat(amount) <= 0}
                    className="w-full py-4 bg-[#FFFF00] text-black font-bold rounded-lg transition-all hover:bg-[#FDE047] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#FFFF00]"
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Transferring...
                        </div>
                    ) : (
                        `Transfer ${amount || '0.00'} USDC`
                    )}
                </button>
            </div>
        </div>
    );
}

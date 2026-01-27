'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useWallets } from '@privy-io/react-auth';
import { X, AlertCircle, Loader2, ArrowUpRight, Clock, DollarSign } from 'lucide-react';
import { API_URL } from '@/lib/hyperliquid/client';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Hyperliquid EIP-712 domain
const WITHDRAW_DOMAIN = {
    name: 'HyperliquidSignTransaction',
    version: '1',
    chainId: 42161, // Arbitrum
    verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
};

// EIP-712 types for withdraw3
const WITHDRAW_TYPES = {
    'HyperliquidTransaction:Withdraw': [
        { name: 'hyperliquidChain', type: 'string' },
        { name: 'destination', type: 'string' },
        { name: 'amount', type: 'string' },
        { name: 'time', type: 'uint64' },
    ],
} as const;

export default function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
    const { address, account } = useHyperliquid();
    const { wallets } = useWallets();
    const activeWallet = wallets?.[0];

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
        if (!activeWallet || !address || !isValidAmount) return;

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const provider = await activeWallet.getEthereumProvider();
            const nonce = Date.now();

            // Prepare the withdraw action
            const withdrawAction = {
                type: 'withdraw3',
                hyperliquidChain: 'Mainnet',
                signatureChainId: '0xa4b1', // Arbitrum in hex
                destination: address,
                amount: amount,
                time: nonce,
            };

            // EIP-712 message to sign
            const message = {
                hyperliquidChain: 'Mainnet',
                destination: address,
                amount: amount,
                time: BigInt(nonce),
            };

            // Sign with EIP-712
            const signature = await provider.request({
                method: 'eth_signTypedData_v4',
                params: [
                    address,
                    JSON.stringify({
                        domain: WITHDRAW_DOMAIN,
                        types: {
                            EIP712Domain: [
                                { name: 'name', type: 'string' },
                                { name: 'version', type: 'string' },
                                { name: 'chainId', type: 'uint256' },
                                { name: 'verifyingContract', type: 'address' },
                            ],
                            ...WITHDRAW_TYPES,
                        },
                        primaryType: 'HyperliquidTransaction:Withdraw',
                        message: {
                            hyperliquidChain: 'Mainnet',
                            destination: address,
                            amount: amount,
                            time: nonce,
                        },
                    }),
                ],
            });

            // Parse signature into r, s, v
            const sig = signature.slice(2);
            const r = '0x' + sig.slice(0, 64);
            const s = '0x' + sig.slice(64, 128);
            const v = parseInt(sig.slice(128, 130), 16);

            // Send to Hyperliquid
            const response = await fetch(`${API_URL}/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: withdrawAction,
                    nonce,
                    signature: { r, s, v },
                }),
            });

            const result = await response.json();

            if (result.status === 'ok' || result.response?.type === 'default') {
                setSuccess(true);
                setAmount('');
            } else {
                throw new Error(result.response?.data || result.error || 'Withdrawal failed');
            }
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
                    <h2 className="text-xl font-bold text-white">Retirar USDC</h2>
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
                            <div className="font-semibold text-brand mb-1">Retiro a Arbitrum</div>
                            <div className="text-white/60">
                                Los fondos llegarán a tu wallet en ~5 minutos.
                                <br />
                                <span className="text-brand">Fee: ${WITHDRAWAL_FEE} USDC</span>
                            </div>
                        </div>
                    </div>

                    {/* Balance */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-white/50">Disponible:</span>
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
                                <span className="text-white/50">Monto</span>
                                <span className="text-white font-mono">${amountNum.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Fee</span>
                                <span className="text-white/70 font-mono">-${WITHDRAWAL_FEE.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-white/10 pt-2 flex justify-between">
                                <span className="text-white/50">Recibirás</span>
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
                            Mínimo ${MIN_WITHDRAWAL} USDC
                        </div>
                    )}

                    {amountNum > availableBalance && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            Saldo insuficiente
                        </div>
                    )}

                    {/* Withdraw Button */}
                    <button
                        onClick={handleWithdraw}
                        disabled={loading || !isValidAmount || !address}
                        className="w-full py-4 bg-brand text-white font-bold rounded-full hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <ArrowUpRight className="w-5 h-5" />
                                Retirar
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
                            ¡Retiro iniciado! Llegará en ~5 minutos.
                        </div>
                    )}

                    {/* Time Estimate */}
                    <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
                        <Clock className="w-3 h-3" />
                        Tiempo estimado: ~5 minutos
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useWallets } from '@privy-io/react-auth';
import { createWalletClient, createPublicClient, custom, parseUnits, formatUnits } from 'viem';
import { arbitrum } from 'viem/chains';
import { X, Copy, Check, ExternalLink, ArrowRight, AlertCircle, Loader2, ArrowLeftRight } from 'lucide-react';
import {
    ARBITRUM_CHAIN_ID,
    HYPERLIQUID_BRIDGE_ADDRESS,
    ARBITRUM_USDC_ADDRESS,
    MIN_BRIDGE_DEPOSIT,
    USDC_ABI,
    getTokenFullName
} from '@/lib/constants';
import { generateDepositAddress } from '@/lib/hyperunit';
import TokenLogo from '@/components/TokenLogo';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- Assets Deposit Tab (Supports USDC direct & BTC/ETH/SOL via Hyperunit) ---
const SUPPORTED_ASSETS = [
    { symbol: 'USDC', name: 'USDC', chain: 'Hyperliquid' },
    { symbol: 'BTC', name: 'Bitcoin', chain: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum', chain: 'Ethereum' },
    { symbol: 'SOL', name: 'Solana', chain: 'Solana' },
];

function AssetsDeposit({ address, t, copied, onCopy }: {
    address: string | null;
    t: any;
    copied: boolean;
    onCopy: () => void;
}) {
    const [selectedAsset, setSelectedAsset] = useState(SUPPORTED_ASSETS[0]);
    const [depositAddress, setDepositAddress] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!address) return;

        if (selectedAsset.symbol === 'USDC') {
            setDepositAddress(address);
            setLoading(false);
            setError('');
        } else {
            const fetchUnitAddress = async () => {
                setLoading(true);
                setError('');
                try {
                    const addr = await generateDepositAddress(selectedAsset.symbol, address);
                    setDepositAddress(addr);
                } catch (err: any) {
                    setError(err.message || 'Failed to generate deposit address');
                    setDepositAddress(null);
                } finally {
                    setLoading(false);
                }
            };
            fetchUnitAddress();
        }
    }, [selectedAsset, address]);

    const handleCopy = async () => {
        if (depositAddress) {
            await navigator.clipboard.writeText(depositAddress);
            onCopy();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Asset Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {SUPPORTED_ASSETS.map((asset) => (
                    <button
                        key={asset.symbol}
                        onClick={() => setSelectedAsset(asset)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 8px',
                            backgroundColor: selectedAsset.symbol === asset.symbol ? 'rgba(255, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${selectedAsset.symbol === asset.symbol ? '#FFFF00' : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <TokenLogo symbol={asset.symbol} size={24} />
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: selectedAsset.symbol === asset.symbol ? '#FFFF00' : 'white' }}>
                            {asset.symbol}
                        </span>
                    </button>
                ))}
            </div>

            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px', textAlign: 'center', margin: 0 }}>
                {selectedAsset.symbol === 'USDC'
                    ? t.depositModal.instruction
                    : `Send ${selectedAsset.name} from the ${selectedAsset.chain} network to this address. Credits to Hyperliquid in ~20 min.`}
            </p>

            {/* Deposit Address Box */}
            <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {selectedAsset.symbol} {t.depositModal.walletAddressLabel} ({selectedAsset.chain})
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.4)' }}>
                                <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                                <span style={{ fontSize: '13px' }}>Generando dirección...</span>
                            </div>
                        ) : error ? (
                            <span style={{ fontSize: '12px', color: '#FF6B6B' }}>{error}</span>
                        ) : (
                            <code style={{ fontSize: '13px', color: '#FFFF00', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {depositAddress || t.depositModal.connectWallet}
                            </code>
                        )}
                    </div>
                    <button
                        onClick={handleCopy}
                        disabled={!depositAddress || loading}
                        style={{
                            flexShrink: 0,
                            padding: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: depositAddress ? 'pointer' : 'not-allowed',
                            opacity: depositAddress ? 1 : 0.5,
                        }}
                    >
                        {copied ? (
                            <Check style={{ width: '16px', height: '16px', color: '#4ade80' }} />
                        ) : (
                            <Copy style={{ width: '16px', height: '16px', color: 'white' }} />
                        )}
                    </button>
                </div>
            </div>

            {/* Important Warning */}
            <div style={{
                backgroundColor: 'rgba(255, 255, 0, 0.05)',
                border: '1px solid rgba(255, 255, 0, 0.2)',
                borderRadius: '12px',
                padding: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <AlertCircle style={{ width: '18px', height: '18px', color: '#FFFF00', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                        <div style={{ fontWeight: 'bold', color: '#FFFF00', marginBottom: '2px' }}>
                            {selectedAsset.symbol === 'USDC' ? t.depositModal.warningTitle : `Importante: Solo ${selectedAsset.symbol}`}
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            {selectedAsset.symbol === 'USDC'
                                ? t.depositModal.warningText
                                : `Deposita únicamente ${selectedAsset.name} desde la red ${selectedAsset.chain}. El envío de otros activos o redes resultará en la pérdida permanente de los fondos.`}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Bridge Deposit Tab (New) ---
function BridgeDeposit() {
    const { wallets } = useWallets();
    const activeWallet = wallets?.[0];

    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successTx, setSuccessTx] = useState('');
    const [usdcBalance, setUsdcBalance] = useState('0');
    const [allowance, setAllowance] = useState('0');
    const [chainId, setChainId] = useState<number>(0);

    const isArbitrum = chainId === ARBITRUM_CHAIN_ID;

    // Poll balance and allowance
    useEffect(() => {
        if (!activeWallet) return;
        let interval: NodeJS.Timeout;

        const checkData = async () => {
            try {
                const provider = await activeWallet.getEthereumProvider();
                if (!provider) return;

                const client = createPublicClient({
                    chain: arbitrum,
                    transport: custom(provider)
                });

                const currentChainId = await client.getChainId();
                setChainId(currentChainId);

                if (currentChainId === ARBITRUM_CHAIN_ID) {
                    const [bal, allow] = await Promise.all([
                        client.readContract({
                            address: ARBITRUM_USDC_ADDRESS as `0x${string}`,
                            abi: USDC_ABI,
                            functionName: 'balanceOf',
                            args: [activeWallet.address as `0x${string}`]
                        }),
                        client.readContract({
                            address: ARBITRUM_USDC_ADDRESS as `0x${string}`,
                            abi: USDC_ABI,
                            functionName: 'allowance',
                            args: [activeWallet.address as `0x${string}`, HYPERLIQUID_BRIDGE_ADDRESS as `0x${string}`]
                        })
                    ]);
                    setUsdcBalance(formatUnits(bal as bigint, 6));
                    setAllowance(formatUnits(allow as bigint, 6));
                }
            } catch (err) {
                console.error('Bridge data fetch error:', err);
            }
        };

        checkData();
        interval = setInterval(checkData, 5000);
        return () => clearInterval(interval);
    }, [activeWallet]);

    const handleSwitchNetwork = async () => {
        if (!activeWallet) return;
        setLoading(true);
        setError('');
        try {
            await activeWallet.switchChain(ARBITRUM_CHAIN_ID);
        } catch (err: any) {
            setError(err.message || 'Failed to switch network');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!activeWallet) return;
        setLoading(true);
        setError('');
        try {
            const provider = await activeWallet.getEthereumProvider();
            const client = createWalletClient({ chain: arbitrum, transport: custom(provider) });
            const [account] = await client.getAddresses();
            const amountBig = parseUnits(amount, 6);

            await client.writeContract({
                address: ARBITRUM_USDC_ADDRESS as `0x${string}`,
                abi: USDC_ABI,
                functionName: 'approve',
                args: [HYPERLIQUID_BRIDGE_ADDRESS as `0x${string}`, amountBig],
                account
            });
            setAllowance(amount);
        } catch (err: any) {
            setError(err.message || 'Approval failed');
        } finally {
            setLoading(false);
        }
    };

    const handleBridge = async () => {
        if (!activeWallet) return;
        setLoading(true);
        setError('');
        try {
            const val = parseFloat(amount);
            if (isNaN(val) || val < MIN_BRIDGE_DEPOSIT) {
                throw new Error(`Minimum deposit is ${MIN_BRIDGE_DEPOSIT} USDC`);
            }

            const provider = await activeWallet.getEthereumProvider();
            const client = createWalletClient({ chain: arbitrum, transport: custom(provider) });
            const [account] = await client.getAddresses();
            const amountBig = parseUnits(amount, 6);

            const hash = await client.writeContract({
                address: ARBITRUM_USDC_ADDRESS as `0x${string}`,
                abi: USDC_ABI,
                functionName: 'transfer',
                args: [HYPERLIQUID_BRIDGE_ADDRESS as `0x${string}`, amountBig],
                account
            });
            setSuccessTx(hash);
            setAmount('');
        } catch (err: any) {
            setError(err.message || 'Bridge failed');
        } finally {
            setLoading(false);
        }
    };

    const needsApproval = parseFloat(allowance) < parseFloat(amount || '0');
    const amountNum = parseFloat(amount || '0');
    const balanceNum = parseFloat(usdcBalance);
    const isValidAmount = amountNum >= MIN_BRIDGE_DEPOSIT && amountNum <= balanceNum;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Info */}
            <div style={{
                backgroundColor: 'rgba(255, 255, 0, 0.1)',
                border: '1px solid rgba(255, 255, 0, 0.2)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                gap: '12px'
            }}>
                <ArrowRight style={{ width: '20px', height: '20px', color: '#FFFF00', flexShrink: 0 }} />
                <div style={{ fontSize: '13px' }}>
                    <div style={{ fontWeight: 600, color: '#FFFF00', marginBottom: '4px' }}>Bridge from Arbitrum</div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Send USDC from Arbitrum to Hyperliquid. Funds arrive in ~1 minute.
                        <br /><span style={{ color: '#FFFF00' }}>Min: {MIN_BRIDGE_DEPOSIT} USDC</span>
                    </div>
                </div>
            </div>

            {!activeWallet ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Connect your wallet to bridge funds.
                </div>
            ) : !isArbitrum ? (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                    <AlertCircle style={{ width: '40px', height: '40px', color: '#FFFF00', margin: '0 auto 12px' }} />
                    <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '8px' }}>Switch to Arbitrum</div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', marginBottom: '16px' }}>
                        Please switch to Arbitrum One to continue.
                    </div>
                    <button
                        onClick={handleSwitchNetwork}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            backgroundColor: '#FFFF00',
                            color: 'black',
                            fontWeight: 'bold',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? 'Switching...' : 'Switch to Arbitrum'}
                    </button>
                </div>
            ) : (
                <>
                    {/* Balance */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Balance:</span>
                        <span
                            style={{ color: 'white', cursor: 'pointer' }}
                            onClick={() => setAmount(usdcBalance)}
                        >
                            {parseFloat(usdcBalance).toFixed(2)} USDC
                        </span>
                    </div>

                    {/* Amount Input */}
                    <div style={{ position: 'relative' }}>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                setError('');
                                setSuccessTx('');
                            }}
                            placeholder="0.00"
                            style={{
                                width: '100%',
                                padding: '16px',
                                paddingRight: '80px',
                                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '18px',
                                fontFamily: 'monospace',
                                outline: 'none',
                            }}
                        />
                        <span style={{
                            position: 'absolute',
                            right: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px'
                        }}>
                            USDC
                        </span>
                    </div>

                    {amountNum > 0 && amountNum < MIN_BRIDGE_DEPOSIT && (
                        <div style={{ color: '#FF6B6B', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle style={{ width: '12px', height: '12px' }} />
                            Minimum {MIN_BRIDGE_DEPOSIT} USDC required
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={needsApproval ? handleApprove : handleBridge}
                        disabled={loading || !isValidAmount}
                        style={{
                            width: '100%',
                            padding: '16px',
                            backgroundColor: needsApproval ? '#3b82f6' : '#FFFF00',
                            color: needsApproval ? 'white' : 'black',
                            fontWeight: 'bold',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: (loading || !isValidAmount) ? 'not-allowed' : 'pointer',
                            opacity: (loading || !isValidAmount) ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                                Processing...
                            </>
                        ) : needsApproval ? (
                            'Approve USDC'
                        ) : (
                            'Bridge to Hyperliquid'
                        )}
                    </button>

                    {/* Feedback */}
                    {error && (
                        <div style={{
                            backgroundColor: 'rgba(255, 107, 107, 0.1)',
                            border: '1px solid rgba(255, 107, 107, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            color: '#FF6B6B',
                            fontSize: '13px'
                        }}>
                            {error}
                        </div>
                    )}
                    {successTx && (
                        <div style={{
                            backgroundColor: 'rgba(74, 222, 128, 0.1)',
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            color: '#4ade80',
                            fontSize: '13px'
                        }}>
                            🎉 Transaction sent! Funds will arrive in ~1 minute.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// --- Spot <-> Perp Transfer Tab ---
import { API_URL } from '@/lib/hyperliquid/client';

function SpotPerpTransfer() {
    const { wallets } = useWallets();
    const { address, account } = useHyperliquid();
    const activeWallet = wallets?.[0];

    const [amount, setAmount] = useState('');
    const [toPerp, setToPerp] = useState(true); // true = Spot -> Perp, false = Perp -> Spot
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const availableBalance = account.availableMargin || 0;
    const amountNum = parseFloat(amount || '0');
    const isValidAmount = amountNum > 0 && amountNum <= availableBalance;

    const handleTransfer = async () => {
        if (!activeWallet || !address || !isValidAmount) return;

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const provider = await activeWallet.getEthereumProvider();
            const nonce = Date.now();

            // Prepare the transfer action
            const transferAction = {
                type: 'usdClassTransfer',
                hyperliquidChain: 'Mainnet',
                signatureChainId: '0xa4b1',
                amount: amount,
                toPerp: toPerp,
                nonce: nonce,
            };

            // EIP-712 domain
            const domain = {
                name: 'HyperliquidSignTransaction',
                version: '1',
                chainId: 42161,
                verifyingContract: '0x0000000000000000000000000000000000000000',
            };

            // Sign with EIP-712
            const signature = await provider.request({
                method: 'eth_signTypedData_v4',
                params: [
                    address,
                    JSON.stringify({
                        domain,
                        types: {
                            EIP712Domain: [
                                { name: 'name', type: 'string' },
                                { name: 'version', type: 'string' },
                                { name: 'chainId', type: 'uint256' },
                                { name: 'verifyingContract', type: 'address' },
                            ],
                            'HyperliquidTransaction:UsdClassTransfer': [
                                { name: 'hyperliquidChain', type: 'string' },
                                { name: 'amount', type: 'string' },
                                { name: 'toPerp', type: 'bool' },
                                { name: 'nonce', type: 'uint64' },
                            ],
                        },
                        primaryType: 'HyperliquidTransaction:UsdClassTransfer',
                        message: {
                            hyperliquidChain: 'Mainnet',
                            amount: amount,
                            toPerp: toPerp,
                            nonce: nonce,
                        },
                    }),
                ],
            });

            // Parse signature
            const sig = signature.slice(2);
            const r = '0x' + sig.slice(0, 64);
            const s = '0x' + sig.slice(64, 128);
            const v = parseInt(sig.slice(128, 130), 16);

            // Send to Hyperliquid
            const response = await fetch(`${API_URL}/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: transferAction,
                    nonce,
                    signature: { r, s, v },
                }),
            });

            const result = await response.json();

            if (result.status === 'ok' || result.response?.type === 'default') {
                setSuccess(true);
                setAmount('');
            } else {
                throw new Error(result.response?.data || result.error || 'Transfer failed');
            }
        } catch (err: any) {
            console.error('Transfer error:', err);
            setError(err.message || 'Failed to process transfer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Info */}
            <div style={{
                backgroundColor: 'rgba(255, 255, 0, 0.1)',
                border: '1px solid rgba(255, 255, 0, 0.2)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                gap: '12px'
            }}>
                <ArrowLeftRight style={{ width: '20px', height: '20px', color: '#FFFF00', flexShrink: 0 }} />
                <div style={{ fontSize: '13px' }}>
                    <div style={{ fontWeight: 600, color: '#FFFF00', marginBottom: '4px' }}>Transferir USDC</div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Mueve fondos entre tu cuenta Spot y Perp. Instantáneo y sin fees.
                    </div>
                </div>
            </div>

            {/* Direction Toggle */}
            <div style={{
                display: 'flex',
                gap: '8px',
                padding: '4px',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '12px',
            }}>
                <button
                    onClick={() => setToPerp(true)}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer',
                        backgroundColor: toPerp ? '#FFFF00' : 'transparent',
                        color: toPerp ? 'black' : 'rgba(255, 255, 255, 0.5)',
                        transition: 'all 0.2s',
                    }}
                >
                    Spot → Perp
                </button>
                <button
                    onClick={() => setToPerp(false)}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer',
                        backgroundColor: !toPerp ? '#FFFF00' : 'transparent',
                        color: !toPerp ? 'black' : 'rgba(255, 255, 255, 0.5)',
                        transition: 'all 0.2s',
                    }}
                >
                    Perp → Spot
                </button>
            </div>

            {/* Balance */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Disponible (Perp):</span>
                <span
                    style={{ color: 'white', cursor: 'pointer' }}
                    onClick={() => setAmount(availableBalance.toFixed(2))}
                >
                    ${availableBalance.toFixed(2)}
                </span>
            </div>

            {/* Amount Input */}
            <div style={{ position: 'relative' }}>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                        setAmount(e.target.value);
                        setError('');
                        setSuccess(false);
                    }}
                    placeholder="0.00"
                    style={{
                        width: '100%',
                        padding: '16px',
                        paddingRight: '80px',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '18px',
                        fontFamily: 'monospace',
                        outline: 'none',
                    }}
                />
                <span style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '14px'
                }}>
                    USDC
                </span>
            </div>

            {/* Action Button */}
            <button
                onClick={handleTransfer}
                disabled={loading || !isValidAmount || !address}
                style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: '#FFFF00',
                    color: 'black',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: (loading || !isValidAmount) ? 'not-allowed' : 'pointer',
                    opacity: (loading || !isValidAmount) ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                }}
            >
                {loading ? (
                    <>
                        <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                        Procesando...
                    </>
                ) : (
                    <>
                        <ArrowLeftRight style={{ width: '16px', height: '16px' }} />
                        Transferir
                    </>
                )}
            </button>

            {/* Feedback */}
            {error && (
                <div style={{
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    border: '1px solid rgba(255, 107, 107, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#FF6B6B',
                    fontSize: '13px'
                }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{
                    backgroundColor: 'rgba(74, 222, 128, 0.1)',
                    border: '1px solid rgba(74, 222, 128, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#4ade80',
                    fontSize: '13px'
                }}>
                    ✅ Transferencia completada!
                </div>
            )}
        </div>
    );
}

// --- Main Modal ---
export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
    const { address } = useHyperliquid();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'assets' | 'bridge' | 'transfer'>('assets');
    const [copied, setCopied] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const copyAddress = async () => {
        if (address) {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div
            style={{
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
            }}
        >
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

            {/* Modal */}
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '400px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                }}
            >
                {/* Header with Tabs */}
                <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 16px 0 16px',
                    }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                            {t.depositModal.title}
                        </h2>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px',
                                borderRadius: '50%',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            <X style={{ width: '20px', height: '20px', color: 'white' }} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '24px', padding: '0 16px' }}>
                        <button
                            onClick={() => setActiveTab('assets')}
                            style={{
                                paddingBottom: '12px',
                                marginTop: '12px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: activeTab === 'assets' ? '#FFFF00' : 'rgba(255, 255, 255, 0.4)',
                                borderBottom: `2px solid ${activeTab === 'assets' ? '#FFFF00' : 'transparent'}`,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {t.depositModal.tabStandard}
                        </button>
                        <button
                            onClick={() => setActiveTab('bridge')}
                            style={{
                                paddingBottom: '12px',
                                marginTop: '12px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: activeTab === 'bridge' ? '#FFFF00' : 'rgba(255, 255, 255, 0.4)',
                                borderBottom: `2px solid ${activeTab === 'bridge' ? '#FFFF00' : 'transparent'}`,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {t.depositModal.tabBridge}
                        </button>
                        <button
                            onClick={() => setActiveTab('transfer')}
                            style={{
                                paddingBottom: '12px',
                                marginTop: '12px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: activeTab === 'transfer' ? '#FFFF00' : 'rgba(255, 255, 255, 0.4)',
                                borderBottom: `2px solid ${activeTab === 'transfer' ? '#FFFF00' : 'transparent'}`,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {t.depositModal.tabTransfer}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                    {activeTab === 'assets' && (
                        <AssetsDeposit
                            address={address}
                            t={t}
                            copied={copied}
                            onCopy={copyAddress}
                        />
                    )}
                    {activeTab === 'bridge' && <BridgeDeposit />}
                    {activeTab === 'transfer' && <SpotPerpTransfer />}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

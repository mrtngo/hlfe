'use client';

// HyperCore borrow/lend for USDC — read side + the account-mode switch.
//
//   • allBorrowLendReserveStates / borrowLendReserveState  → live supply APY
//   • borrowLendUserState                                  → what the user supplied
//   • userAbstraction                                      → account mode
//
// Supplying is documented as a Portfolio Margin feature (account value
// > $10k or > $5M weighted volume). Portfolio Margin also merges spot + perps
// and auto-borrows against collateral, so switching is an explicit, warned
// step in the UI. The switch is a *user-signed* EIP-712 action
// (HyperliquidTransaction:UserSetAbstraction) — same signing path as
// usdClassTransfer in TransferModal. Supply / withdraw are L1 actions signed
// by the agent: see `borrowLend` in HyperliquidProvider.

import { useCallback, useEffect, useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { API_URL, IS_TESTNET } from '@/lib/hyperliquid/client';
import { useHyperliquid } from '@/hooks/useHyperliquid';

export type AccountMode = 'default' | 'disabled' | 'unifiedAccount' | 'portfolioMargin' | string;

/** Portfolio Margin eligibility per the HL docs (the volume route is HL's to check). */
export const PM_MIN_ACCOUNT_VALUE = 10_000;

const USDC_TOKEN = 0;

async function info<T>(body: object): Promise<T> {
    const res = await fetch(`${API_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`info ${res.status}`);
    return res.json();
}

export function useLending() {
    const { address, borrowLend, refreshAccountData } = useHyperliquid();
    const { wallets } = useWallets();

    const [supplyApy, setSupplyApy] = useState<number | null>(null);
    const [utilization, setUtilization] = useState<number | null>(null);
    const [mode, setMode] = useState<AccountMode | null>(null);
    const [supplied, setSupplied] = useState(0);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const reserve = await info<{ supplyYearlyRate: string; utilization: string }>({
                type: 'borrowLendReserveState',
                token: USDC_TOKEN,
            });
            setSupplyApy(parseFloat(reserve.supplyYearlyRate));
            setUtilization(parseFloat(reserve.utilization));
            if (address) {
                const [m, st] = await Promise.all([
                    info<AccountMode>({ type: 'userAbstraction', user: address }),
                    info<{ tokenToState: [number, { supply: { value: string } }][] }>({
                        type: 'borrowLendUserState',
                        user: address,
                    }),
                ]);
                setMode(m);
                const usdc = (st.tokenToState || []).find(([tok]) => tok === USDC_TOKEN);
                setSupplied(usdc ? parseFloat(usdc[1].supply.value) : 0);
            }
        } catch {
            /* keep last good values */
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 30_000);
        return () => clearInterval(id);
    }, [refresh]);

    const supply = useCallback(
        async (amount: string | null) => {
            const r = await borrowLend('supply', amount);
            setTimeout(refresh, 1200);
            return r;
        },
        [borrowLend, refresh],
    );

    const withdraw = useCallback(
        async (amount: string | null) => {
            const r = await borrowLend('withdraw', amount);
            setTimeout(refresh, 1200);
            return r;
        },
        [borrowLend, refresh],
    );

    /** Switch the account to Portfolio Margin. User-signed (embedded wallet). */
    const activatePortfolioMargin = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
        const wallet = wallets.find((w) => w.walletClientType === 'privy') ?? wallets[0];
        if (!wallet || !address) return { ok: false, error: 'No wallet' };
        try {
            const provider = await wallet.getEthereumProvider();
            const nonce = Date.now();
            const hyperliquidChain = IS_TESTNET ? 'Testnet' : 'Mainnet';
            const user = address.toLowerCase();
            const signature: string = await provider.request({
                method: 'eth_signTypedData_v4',
                params: [
                    address,
                    JSON.stringify({
                        domain: {
                            name: 'HyperliquidSignTransaction',
                            version: '1',
                            chainId: 42161,
                            verifyingContract: '0x0000000000000000000000000000000000000000',
                        },
                        types: {
                            EIP712Domain: [
                                { name: 'name', type: 'string' },
                                { name: 'version', type: 'string' },
                                { name: 'chainId', type: 'uint256' },
                                { name: 'verifyingContract', type: 'address' },
                            ],
                            'HyperliquidTransaction:UserSetAbstraction': [
                                { name: 'hyperliquidChain', type: 'string' },
                                { name: 'user', type: 'address' },
                                { name: 'abstraction', type: 'string' },
                                { name: 'nonce', type: 'uint64' },
                            ],
                        },
                        primaryType: 'HyperliquidTransaction:UserSetAbstraction',
                        message: { hyperliquidChain, user, abstraction: 'portfolioMargin', nonce },
                    }),
                ],
            });
            const sig = signature.slice(2);
            const action = {
                type: 'userSetAbstraction',
                hyperliquidChain,
                signatureChainId: '0xa4b1',
                user,
                abstraction: 'portfolioMargin',
                nonce,
            };
            const res = await fetch(`${API_URL}/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    nonce,
                    signature: { r: '0x' + sig.slice(0, 64), s: '0x' + sig.slice(64, 128), v: parseInt(sig.slice(128, 130), 16) },
                }),
            });
            const result = await res.json().catch(() => null);
            await refresh();
            refreshAccountData();
            if (result?.status === 'ok') return { ok: true };
            return { ok: false, error: typeof result?.response === 'string' ? result.response : 'No se pudo activar' };
        } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : String(e) };
        }
    }, [wallets, address, refresh, refreshAccountData]);

    return {
        loading,
        supplyApy,
        utilization,
        mode,
        isPortfolioMargin: mode === 'portfolioMargin',
        supplied,
        refresh,
        supply,
        withdraw,
        activatePortfolioMargin,
    };
}

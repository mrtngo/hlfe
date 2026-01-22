/**
 * Rhino.fi Client-Side Bridge Integration
 * Handles transaction signing with Privy embedded wallets
 */

import { createWalletClient, custom, type Address } from 'viem';
import { arbitrum, mainnet, polygon, base, optimism } from 'viem/chains';

// Supported chains for bridging
export const SUPPORTED_CHAINS = {
  ethereum: mainnet,
  polygon: polygon,
  base: base,
  optimism: optimism,
  arbitrum: arbitrum,
};

export type SupportedChainKey = keyof typeof SUPPORTED_CHAINS;

// Chain name mapping for Rhino API
const CHAIN_NAME_MAP: Record<SupportedChainKey, string> = {
  ethereum: 'ETHEREUM',
  polygon: 'MATIC_POS',
  base: 'BASE',
  optimism: 'OPTIMISM',
  arbitrum: 'ARBITRUM',
};

/**
 * Get bridge quote from API
 */
export async function getBridgeQuote(params: {
  fromChainKey: SupportedChainKey;
  toChainKey: SupportedChainKey;
  token: string;
  amount: string;
  walletAddress: Address;
}) {
  const response = await fetch('/api/bridge/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromChain: CHAIN_NAME_MAP[params.fromChainKey],
      toChain: CHAIN_NAME_MAP[params.toChainKey],
      token: params.token,
      amount: params.amount,
      depositor: params.walletAddress,
      recipient: params.walletAddress, // Same address for both
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get quote');
  }

  const data = await response.json();
  return data.quote;
}

/**
 * Execute bridge transaction using Privy embedded wallet
 */
/**
 * Get bridge transaction data (for use with Privy's gas sponsorship)
 * Returns the raw tx params without executing - caller handles sending
 */
export async function getBridgeTransaction(params: {
  fromChainKey: SupportedChainKey;
  toChainKey: SupportedChainKey;
  token: string;
  amount: string;
  walletAddress: Address;
}): Promise<{ to: string; data: string; value: string }> {
  const { fromChainKey, toChainKey, token, amount, walletAddress } = params;

  // Step 1: Get quote
  const quote = await getBridgeQuote({
    fromChainKey,
    toChainKey,
    token,
    amount,
    walletAddress,
  });

  // Step 2: Commit the quote to get transaction data
  const response = await fetch('/api/bridge/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteId: quote.quoteId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to build bridge transaction');
  }

  const { commitment } = await response.json();

  // Return raw tx data for Privy to send with sponsorship
  return {
    to: commitment.to,
    data: commitment.data,
    value: commitment.value || '0',
  };
}

/**
 * Execute bridge transaction using viem (without gas sponsorship)
 * @deprecated Use getBridgeTransaction + Privy's sendTransaction for gas sponsorship
 */
export async function executeBridge(params: {
  fromChainKey: SupportedChainKey;
  toChainKey: SupportedChainKey;
  token: string;
  amount: string;
  walletAddress: Address;
  ethereumProvider: any;
}) {
  const { fromChainKey, toChainKey, token, amount, walletAddress, ethereumProvider } = params;

  const txData = await getBridgeTransaction({
    fromChainKey,
    toChainKey,
    token,
    amount,
    walletAddress,
  });

  const chain = SUPPORTED_CHAINS[fromChainKey];
  const walletClient = createWalletClient({
    account: walletAddress,
    chain,
    transport: custom(ethereumProvider),
  });

  const hash = await walletClient.sendTransaction({
    to: txData.to as Address,
    data: txData.data as `0x${string}`,
    value: BigInt(txData.value || '0'),
  });

  return {
    hash,
    fromChain: CHAIN_NAME_MAP[fromChainKey],
    toChain: CHAIN_NAME_MAP[toChainKey],
  };
}

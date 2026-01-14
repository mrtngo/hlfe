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
export async function executeBridge(params: {
  fromChainKey: SupportedChainKey;
  toChainKey: SupportedChainKey;
  token: string;
  amount: string;
  walletAddress: Address;
  ethereumProvider: any; // Privy's Ethereum provider
}) {
  const { fromChainKey, toChainKey, token, amount, walletAddress, ethereumProvider } = params;

  // Step 1: Get quote with depositor and recipient addresses
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

  // Step 3: Execute the transaction using Privy wallet
  const chain = SUPPORTED_CHAINS[fromChainKey];
  const walletClient = createWalletClient({
    account: walletAddress,
    chain,
    transport: custom(ethereumProvider),
  });

  // Send the transaction to the bridge contract
  const hash = await walletClient.sendTransaction({
    to: commitment.to as Address,
    data: commitment.data as `0x${string}`,
    value: BigInt(commitment.value || '0'),
  });

  return {
    hash,
    quote,
    fromChain: CHAIN_NAME_MAP[fromChainKey],
    toChain: CHAIN_NAME_MAP[toChainKey],
  };
}

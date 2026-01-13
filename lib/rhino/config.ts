/**
 * Rhino.fi Widget Configuration
 * Configuration for the rhino.fi iframe widget
 */

// Base widget URL
export const RHINO_WIDGET_BASE_URL = 'https://widget.rhino.fi';

// Get API key from environment
export const RHINO_API_KEY = process.env.NEXT_PUBLIC_RHINO_API_KEY || '';

// Widget theme matching the app's dark theme
export const RHINO_WIDGET_THEME = {
    colors: {
        primary: '#8b5cf6',           // Purple accent
        primaryLight: '#a78bfa',       // Lighter purple
        secondary: '#1f1f23',          // Dark secondary
        widgetBackground: '#0a0a0a',   // Dark background
        select: '#1a1a1f',             // Input background
        textPrimary: '#ffffff',        // White text
        textSecondary: '#a1a1aa',      // Muted text
        textPrimaryCta: '#ffffff',     // Button text
        textSecondaryCta: '#ffffff',   // Secondary button text
        stroke: 'rgba(255,255,255,0.1)', // Border color
    },
    radius: {
        widget: '16px',
        actionElements: '12px',
        tokenSelect: '12px',
    },
    tokenInputStroke: true,
};

/**
 * Build the rhino.fi widget URL with all parameters
 */
export function buildRhinoWidgetUrl(options: {
    apiKey?: string;
    chainOut?: string;
    token?: string;
    recipient?: string;
    mode?: 'dark' | 'light';
    theme?: typeof RHINO_WIDGET_THEME;
}): string {
    const params = new URLSearchParams();

    // API Key (required)
    const apiKey = options.apiKey || RHINO_API_KEY;
    if (apiKey) {
        params.set('apiKey', apiKey);
    }

    // Dark/Light mode
    params.set('mode', options.mode || 'dark');

    // Destination chain - Arbitrum for Hyperliquid deposit flow
    if (options.chainOut) {
        params.set('chainOut', options.chainOut);
    }

    // Token - USDC only
    if (options.token) {
        params.set('token', options.token);
    }

    // Recipient address
    if (options.recipient) {
        params.set('recipient', options.recipient);
    }

    // Custom theme
    if (options.theme) {
        params.set('theme', JSON.stringify(options.theme));
    }

    return `${RHINO_WIDGET_BASE_URL}?${params.toString()}`;
}

// Supported chains - for reference
export const RHINO_SUPPORTED_CHAINS = [
    'ETHEREUM',
    'POLYGON',
    'BASE',
    'OPTIMISM',
    'AVALANCHE',
    'BSC',
    'LINEA',
    'SCROLL',
    'ARBITRUM_ONE',
    'SOLANA',
    'STARKNET',
    'TON',
    'TRON',
];

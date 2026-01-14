/**
 * Rhino.fi Bridge Module
 * Re-export bridge utilities and SDK integration
 */

// Widget configuration (legacy)
export {
    RHINO_WIDGET_BASE_URL,
    RHINO_API_KEY,
    RHINO_WIDGET_THEME,
    RHINO_SUPPORTED_CHAINS,
    buildRhinoWidgetUrl,
} from './config';

// SDK integration (recommended for Privy wallets)
export {
    getBridgeQuote,
    executeBridge,
    SUPPORTED_CHAINS,
    type SupportedChainKey,
} from './sdk';

/** @type {import('next').NextConfig} */

// Use static export only when building for Capacitor
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig = {
  // Static export only for Capacitor iOS builds
  ...(isCapacitorBuild && {
    output: 'export',
    // Disable API routes for static export - they'll be called from production web URL
    // The iOS app will call your deployed API endpoints directly
    experimental: {
      // Exclude API routes from static export
    },
  }),
  images: {
    // Unoptimized required for static export
    unoptimized: isCapacitorBuild,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn-icons-png.flaticon.com',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 's3-symbol-logo.tradingview.com',
      },
      {
        protocol: 'https',
        hostname: 'wise.com',
      },
      {
        protocol: 'https',
        hostname: 'app.trade.xyz',
      },
      {
        protocol: 'https',
        hostname: 'app.hyperliquid.xyz',
      },
    ],
  },

  async headers() {
    // Content Security Policy for production
    // Note: 'unsafe-inline' and 'unsafe-eval' needed for Next.js and wallet connectors
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://*.privy.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://api.hyperliquid.xyz wss://api.hyperliquid.xyz https://api.hyperliquid-testnet.xyz wss://api.hyperliquid-testnet.xyz https://app.hyperliquid.xyz https://app.trade.xyz https://api.rhino.fi https://*.supabase.co https://auth.privy.io https://*.privy.io https://*.privy.systems wss://*.privy.systems https://www.datos.gov.co https://unavatar.io https://wise.com https://raw.githubusercontent.com https://explorer-api.walletconnect.com wss://www.walletlink.org wss://relay.walletconnect.com wss://relay.walletconnect.org https://*.walletconnect.com https://mainnet.base.org https://arb1.arbitrum.io https://mainnet.optimism.io https://polygon-rpc.com https://eth.llamarpc.com https://cloudflare-eth.com https://rpc.ankr.com",
      "frame-src 'self' https://auth.privy.io https://*.privy.io",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ];

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: cspDirectives.join('; '),
          },
        ],
      },
    ];
  },

  webpack: (config) => {
    config.module.rules.push({
      test: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
      use: 'ignore-loader',
    });
    return config;
  },

  // Use webpack explicitly
  turbopack: {},
};

module.exports = nextConfig;

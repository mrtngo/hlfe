/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use webpack instead of Turbopack to avoid module type issues
  // This will be used when building with --webpack flag
  webpack: (config, { isServer }) => {
    // Ignore test files and other non-code files in node_modules
    config.module.rules.push({
      test: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
      include: /node_modules/,
      use: "ignore-loader",
    });

    // Ignore markdown, zip, and shell files in node_modules
    config.module.rules.push({
      test: /\.(md|zip|sh)$/,
      include: /node_modules/,
      use: "ignore-loader",
    });

    // Resolve fallbacks for Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      // Fix MetaMask SDK trying to import React Native modules
      // This is a known issue with @metamask/sdk in web environments
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-native-async-storage/async-storage': false,
      };
    }

    return config;
  },

  // Empty turbopack config to allow webpack config
  turbopack: {},

  // Ensure we don't try to transpile missing packages
  transpilePackages: [],

  // Allow remote images from Clearbit for stock logos
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
    ],
  },

  // Add headers for cross-origin isolation (needed for some wallet features)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

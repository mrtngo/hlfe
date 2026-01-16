/** @type {import('next').NextConfig} */
const nextConfig = {
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

  // Webpack config - NUCLEAR OPTION: Don't use --webpack flag, just use default
  webpack: (config, { isServer }) => {
    // Just return config as-is, don't mess with externals at all
    // Let Next.js handle Rhino SDK however it wants

    // Only set resolve fallbacks for client-side
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      config.resolve.alias = config.resolve.alias || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-native-async-storage/async-storage': false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;

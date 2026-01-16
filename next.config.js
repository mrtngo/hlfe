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

  // Minimal webpack config - ONLY client-side polyfills, DO NOT TOUCH EXTERNALS
  webpack: (config) => {
    // CRITICAL: Return config immediately, don't modify it
    return config;
  },
};

module.exports = nextConfig;

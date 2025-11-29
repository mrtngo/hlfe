/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hyperliquid Dark Theme Palette
        primary: "#00D9FF", // Teal - Primary action/brand (Hyperliquid teal)
        "primary-light": "#33E1FF",
        "primary-dark": "#00B8D9",

        secondary: "#FFD166", // Solar Yellow - Secondary accent
        "secondary-light": "#FFDC7A",
        "secondary-dark": "#E6BC5C",

        // Trading Colors
        bullish: "#00D9FF", // Teal for bullish (matches Hyperliquid)
        "bullish-light": "#33E1FF",
        "bullish-dark": "#00B8D9",

        bearish: "#FF4444", // Red - Bearish/Down
        "bearish-light": "#FF6666",
        "bearish-dark": "#CC0000",

        // Dark Theme Text Colors
        "coffee-dark": "#FFFFFF", // White - Main text on dark
        "coffee-medium": "#B0B0B0", // Light gray
        "coffee-light": "#808080", // Medium gray

        // Dark Theme Background Colors
        "bg-primary": "#0A0E1A", // Very dark blue-black (main background)
        "bg-secondary": "#131722", // Dark gray-blue (cards)
        "bg-tertiary": "#1A1F2E", // Slightly lighter for elevated surfaces
        "bg-hover": "#1E2332", // Hover states

        // Legacy support (mapping old colors to new)
        buy: "#00D9FF",
        "buy-hover": "#33E1FF",
        "buy-light": "rgba(0, 217, 255, 0.1)",
        sell: "#FF4444",
        "sell-hover": "#FF6666",
        "sell-light": "rgba(255, 68, 68, 0.1)",

        // Text mappings (dark theme)
        "text-primary": "#FFFFFF",
        "text-secondary": "#B0B0B0",
        "text-muted": "#808080",
        "text-disabled": "#555555",

        // Border (dark theme)
        border: "rgba(255, 255, 255, 0.1)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["Roboto Mono", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        "soft-lg":
          "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)",
        "soft-xl":
          "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};

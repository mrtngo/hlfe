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
        // Colombian Nature Inspired Palette
        primary: "#006D77", // Jungle Teal - Primary action/brand
        "primary-light": "#02818C",
        "primary-dark": "#005A63",

        secondary: "#FFD166", // Solar Yellow - Secondary accent
        "secondary-light": "#FFDC7A",
        "secondary-dark": "#E6BC5C",

        // Trading Colors
        bullish: "#06D6A0", // Emerald Green - Bullish/Up
        "bullish-light": "#4DE4B8",
        "bullish-dark": "#05B888",

        bearish: "#EF476F", // Clay Red - Bearish/Down (warm pinkish-red)
        "bearish-light": "#F26B8A",
        "bearish-dark": "#D63D5F",

        // Text Colors
        "coffee-dark": "#264653", // Coffee Dark - Main text
        "coffee-medium": "#4A6B7A",
        "coffee-light": "#6B8A99",

        // Background Colors
        "bg-primary": "#F8FAFC", // Very light grey/white (slate-50)
        "bg-secondary": "#FFFFFF", // Pure white for cards
        "bg-tertiary": "#F1F5F9", // Slightly darker for elevated surfaces

        // Legacy support (mapping old colors to new)
        buy: "#06D6A0",
        "buy-hover": "#4DE4B8",
        "buy-light": "rgba(6, 214, 160, 0.1)",
        sell: "#EF476F",
        "sell-hover": "#F26B8A",
        "sell-light": "rgba(239, 71, 111, 0.1)",

        // Text mappings
        "text-primary": "#264653",
        "text-secondary": "#4A6B7A",
        "text-muted": "#6B8A99",
        "text-disabled": "#94A3B8",

        // Border
        border: "rgba(38, 70, 83, 0.1)",
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

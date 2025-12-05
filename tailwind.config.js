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
      fontFamily: {
        // Rayo Typography - Bold Sans-Serif
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      colors: {
        // Rayo Brand Colors
        rayo: {
          yellow: "#FFFF00", // Neon Yellow
          gold: "#FFD700",   // Gold
          black: "#000000",  // Pure Black
          grey: "#1A1A1A",   // Dark Grey
        },
        // shadcn/ui semantic colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Rayo colors - direct usage
        "primary-light": "#FFFF33",
        "primary-dark": "#E6E600",
        // Trading colors
        bullish: "#FFFF00", // Neon Yellow for Buy
        "bullish-light": "#FFFF33",
        "bullish-dark": "#E6E600",
        bearish: "#FF4444", // Red for Sell
        "bearish-light": "#FF6666",
        "bearish-dark": "#CC0000",
        // Text colors
        "coffee-dark": "#FFFFFF",
        "coffee-medium": "#888888",
        "coffee-light": "#555555",
        // Background colors - Pure blacks
        "bg-primary": "#000000",
        "bg-secondary": "#1A1A1A",
        "bg-tertiary": "#252525",
        "bg-hover": "#303030",
        // Text
        "text-primary": "#FFFFFF",
        "text-secondary": "#888888",
        "text-muted": "#555555",
        "text-disabled": "#444444",
      },
      boxShadow: {
        soft: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
        "soft-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)",
        "soft-xl": "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)",
        "neon": "0 0 20px rgba(255, 255, 0, 0.3), 0 0 40px rgba(255, 255, 0, 0.1)",
        "neon-lg": "0 0 30px rgba(255, 255, 0, 0.4), 0 0 60px rgba(255, 255, 0, 0.2)",
      },
    },
  },
  plugins: [],
};

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
        // Rayo Brand Colors - Using Design System
        rayo: {
          yellow: "#FACC15",  // Design System Brand Yellow
          black: "#000000",   // Pure Black
          grey: "#1A1A1A",    // Dark Grey
        },
        // Design System Colors (can be used as bg-brand, text-brand, etc.)
        brand: {
          DEFAULT: "#FACC15",
          hover: "#FDE047",
          muted: "rgba(250, 204, 21, 0.2)",
          border: "rgba(250, 204, 21, 0.4)",
        },
        positive: {
          DEFAULT: "#22C55E",
          muted: "rgba(34, 197, 94, 0.2)",
        },
        negative: {
          DEFAULT: "#EF4444",
          muted: "rgba(239, 68, 68, 0.2)",
        },
        warning: "#F59E0B",
        info: "#3B82F6",
        // shadcn/ui semantic colors (Tailwind HSL format)
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
      },
      boxShadow: {
        soft: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
        "soft-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)",
        "soft-xl": "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)",
        // Design System Glows
        "glow-brand": "0 0 20px rgba(250, 204, 21, 0.2)",
        "glow-positive": "0 0 20px rgba(34, 197, 94, 0.2)",
        "glow-negative": "0 0 20px rgba(239, 68, 68, 0.2)",
      },
    },
  },
  plugins: [],
};

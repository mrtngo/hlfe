/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#FF6B35',
                'primary-light': '#FF8C5F',
                'primary-dark': '#E04E1E',
                secondary: '#1E3A8A',
                'secondary-light': '#3B5AAF',
                'secondary-dark': '#0F1F5C',
                accent: '#F59E0B',
                'accent-light': '#FBBF24',
                'accent-dark': '#D97706',
                buy: '#10B981',
                'buy-hover': '#059669',
                sell: '#EF4444',
                'sell-hover': '#DC2626',
                'bg-primary': '#0A0E1A',
                'bg-secondary': '#131829',
                'bg-tertiary': '#1A2035',
                'text-primary': '#F9FAFB',
                'text-secondary': '#D1D5DB',
                'text-muted': '#9CA3AF',
                border: 'rgba(255, 255, 255, 0.1)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['Roboto Mono', 'monospace'],
            },
        },
    },
    plugins: [],
};

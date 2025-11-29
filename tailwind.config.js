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
                primary: '#00C805',
                'primary-light': '#00E806',
                'primary-dark': '#00A804',
                buy: '#00C805',
                'buy-hover': '#00E806',
                'buy-light': 'rgba(0, 200, 5, 0.1)',
                sell: '#FF5000',
                'sell-hover': '#FF6B35',
                'sell-light': 'rgba(255, 80, 0, 0.1)',
                'bg-primary': '#000000',
                'bg-secondary': '#0A0A0A',
                'bg-tertiary': '#141414',
                'bg-card': '#1A1A1A',
                'bg-elevated': '#1F1F1F',
                'text-primary': '#FFFFFF',
                'text-secondary': '#E5E5E5',
                'text-muted': '#999999',
                'text-disabled': '#666666',
                border: 'rgba(255, 255, 255, 0.08)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['Roboto Mono', 'monospace'],
            },
        },
    },
    plugins: [],
};

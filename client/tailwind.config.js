/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Lämmin harmaanvihreä neutraalisarja käyttöliittymän pinnoille.
        bark: {
          50: '#f7f9f8',
          100: '#ecefed',
          200: '#dadfdc',
          300: '#c1c8c4',
          400: '#98a39d',
          500: '#6d7973',
          600: '#525e58',
          700: '#3d4843',
          800: '#28322e',
          900: '#18211d',
          950: '#0b1220',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Inter', 'sans-serif'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'pop': { '0%': { transform: 'scale(.96)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in .2s ease-out',
        pop: 'pop .15s ease-out',
      },
    },
  },
  plugins: [],
};

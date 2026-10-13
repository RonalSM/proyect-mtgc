/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mtg: {
          bg: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
          gold: '#eab308',
          // Mana colors
          white: '#f8fafc',
          blue: '#0284c7',
          black: '#475569',
          red: '#dc2626',
          green: '#16a34a',
        },
      },
    },
  },
  plugins: [],
};

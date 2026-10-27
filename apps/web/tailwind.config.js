/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        obsidian: {
          950: '#040d0f',
          900: '#092328', // Color 1: Dark teal surface / base
          850: '#0c2d32',
          800: '#12544F', // Color 2: Deep pine border & elevated surface
          750: '#18645e',
          700: '#1f7971',
          600: '#2A835F', // Color 3: Forest green action & active state
          500: '#349e73',
          400: '#8BBB92', // Color 4: Sage accent & text highlight
          300: '#a7d5ae',
        },
        hunt: {
          abyss: '#040d0f',
          dark: '#092328',
          pine: '#12544F',
          forest: '#2A835F',
          sage: '#8BBB92',
          forestHover: '#349e73',
          pineHover: '#18645e',
        },
        mana: {
          w: '#fdfbf7',
          u: '#0ea5e9',
          b: '#1c1917',
          r: '#ef4444',
          g: '#10b981',
          gold: '#e2b34a',
        },
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(circle at 50% 0%, rgba(42, 131, 95, 0.12), transparent 70%)',
        'subtle-grid': 'linear-gradient(to right, rgba(139, 187, 146, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(139, 187, 146, 0.04) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};

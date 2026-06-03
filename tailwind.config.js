/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cyberpunk accent palette (used via the .cyberpunk theme class)
        neon: {
          pink: '#ff2bd6',
          cyan: '#00f0ff',
          purple: '#b026ff',
          yellow: '#fcee0a',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 8px rgba(0,240,255,0.6), 0 0 16px rgba(176,38,255,0.4)',
      },
    },
  },
  plugins: [],
};

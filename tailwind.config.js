/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        body: ['Manrope', 'Inter', 'sans-serif'],
      },
      colors: {
        ink: '#05070b',
        panel: '#0d111a',
        panelSoft: '#141a25',
        line: '#232b3a',
        ember: '#ff8a3d',
        mint: '#4ce0b3',
        skyglass: '#8fd3ff',
      },
      boxShadow: {
        glow: '0 0 80px rgba(76, 224, 179, 0.12)',
      },
    },
  },
  plugins: [],
};
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tg: {
          accent: 'var(--tg-accent)',
          'accent-hover': 'var(--tg-accent-hover)',
          bg: 'var(--tg-bg)',
          sidebar: 'var(--tg-sidebar)',
          panel: 'var(--tg-panel)',
          border: 'var(--tg-border)',
          text: 'var(--tg-text)',
          muted: 'var(--tg-muted)',
          bubble: {
            in: 'var(--tg-bubble-in)',
            out: 'var(--tg-bubble-out)',
          },
        },
      },
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        bubble: '0 1px 2px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};

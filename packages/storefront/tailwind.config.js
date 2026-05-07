/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50, #fff7ed)',
          100: 'var(--color-primary-100, #ffedd5)',
          200: 'var(--color-primary-200, #fed7aa)',
          300: 'var(--color-primary-300, #fdba74)',
          400: 'var(--color-primary-400, #fb923c)',
          500: 'var(--color-primary-500, #f97316)',
          600: 'var(--color-primary-600, #ea580c)',
          700: 'var(--color-primary-700, #c2410c)',
          800: 'var(--color-primary-800, #9a3412)',
          900: 'var(--color-primary-900, #7c2d12)',
          950: 'var(--color-primary-950, #431407)',
          contrast: 'var(--primary-contrast)',
        },
        secondary: {
          50: 'var(--color-secondary-50, #f8faf2)',
          500: 'var(--color-secondary-500, #cfd69a)',
          950: 'var(--color-secondary-950, #1a1c0e)',
          contrast: 'var(--secondary-contrast)',
        },
        // Environment Tokens Mapping
        surface: 'var(--env-bg-surface)',
        base: 'var(--env-bg-base)',
        main: 'var(--env-text-main)',
        sub: 'var(--env-text-sub)',
        hint: 'var(--env-text-hint)',
      },
    },
  },
  plugins: [],
};

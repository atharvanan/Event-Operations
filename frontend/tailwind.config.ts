import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f2fc',
          100: '#ebe7f9',
          200: '#d8d0f2',
          300: '#bbb0e8',
          400: '#9383d6',
          500: '#6752b8',
          600: '#43328E',
          700: '#352675',
          800: '#2A1D5D',
          900: '#221849',
          950: '#160F30',
        },
        canvas: {
          light: '#F5F4FA',
          card: '#FFFFFF',
          tint: '#EFEBF9',
        },
        ops: {
          todo: '#475569',
          ack: '#43328E',
          progress: '#1D4ED8',
          blocked: '#B91C1C',
          review: '#B45309',
          rework: '#C2410C',
          completed: '#15803D',
        },
      },
      boxShadow: {
        soft: '0 2px 12px -2px rgba(34, 24, 73, 0.06), 0 1px 4px -1px rgba(34, 24, 73, 0.04)',
        card: '0 8px 24px -6px rgba(34, 24, 73, 0.08), 0 2px 6px -2px rgba(34, 24, 73, 0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

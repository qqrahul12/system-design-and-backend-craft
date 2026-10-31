import type { Config } from 'tailwindcss'

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
        dark: {
          DEFAULT: '#0a0a0a',
          50:  '#1a1a1a',
          100: '#111111',
          200: '#2a2a2a',
          300: '#3a3a3a',
          400: '#4a4a4a',
        },
        accent: {
          purple: '#7c3aed',
          'purple-light': '#a855f7',
          'purple-dark': '#5b21b6',
          'purple-muted': '#7c3aed1a',
        },
        muted: '#888888',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-purple': 'linear-gradient(135deg, #7c3aed22 0%, #7c3aed08 100%)',
        'gradient-card':   'linear-gradient(145deg, #1a1a1a 0%, #161616 100%)',
      },
      animation: {
        'pulse-dot':  'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'blink':      'blink 1s step-end infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config

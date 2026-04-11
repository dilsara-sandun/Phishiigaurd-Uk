/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#040d21',
          900: '#0a1628',
          850: '#0f1f38',
          800: '#132240',
          700: '#1a2f55',
          600: '#1e3a6e',
          500: '#2252a4',
        },
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        danger: {
          50:  '#fef2f2',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
        warn: {
          50:  '#fffbeb',
          400: '#fbbf24',
          500: '#f59e0b',
        },
        safe: {
          50:  '#f0fdf4',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.08)',
        'card-lg': '0 4px 24px rgba(0,0,0,.15)',
        'glow':    '0 0 24px rgba(59,130,246,.25)',
        'glow-red':'0 0 20px rgba(239,68,68,.2)',
        'inner':   'inset 0 1px 4px rgba(0,0,0,.06)',
      },
      backgroundImage: {
        'gradient-navy':   'linear-gradient(135deg,#0a1628 0%,#132240 100%)',
        'gradient-brand':  'linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)',
        'gradient-danger': 'linear-gradient(135deg,#dc2626 0%,#9f1239 100%)',
        'gradient-safe':   'linear-gradient(135deg,#16a34a 0%,#0f766e 100%)',
        'gradient-warn':   'linear-gradient(135deg,#d97706 0%,#b45309 100%)',
      },
      animation: {
        'fade-in':    'fadeIn .25s ease',
        'slide-in':   'slideIn .3s ease',
        'pulse-slow': 'pulse 3s infinite',
        'shimmer':    'shimmer 1.6s infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn: { from: { transform: 'translateY(8px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        shimmer: { '0%,100%': { opacity: 1 }, '50%': { opacity: .5 } },
      },
    },
  },
  plugins: [],
}

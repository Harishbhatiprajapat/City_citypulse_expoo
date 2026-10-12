/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        citynavy: {
          DEFAULT: '#0B1220',
          secondary: '#111827',
          card: '#172033',
          cardHover: '#1c273e',
          border: '#23304a',
          accent: '#3B82F6',
          success: '#22C55E',
          warning: '#F59E0B',
          critical: '#EF4444',
          text: '#F8FAFC',
          muted: '#94A3B8',
        },
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pin-pulse': 'pinPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pinPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};

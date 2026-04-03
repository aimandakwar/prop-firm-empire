/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'blue-glow': '#00d4ff',
        'cyan-glow': '#06b6d4',
        'bg-primary': '#0a0a0f',
        'bg-card': 'rgba(0,212,255,0.05)',
        'green-profit': '#00ff88',
        'red-loss': '#ef4444',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0,212,255,0.15)',
        'glow-lg': '0 0 40px rgba(0,212,255,0.2)',
        'glow-sm': '0 0 10px rgba(0,212,255,0.1)',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 8s linear infinite',
        'counter': 'counter 0.5s ease-out',
      }
    },
  },
  plugins: [],
}

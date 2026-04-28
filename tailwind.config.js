/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan every HTML page and all JS/component files for class names.
  content: [
    './*.html',
    './assets/components/**/*.html',
    './assets/fragments/**/*.html',
    './assets/js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        // ── Primary bw palette (index, divisions, funkcodes, leitstelle, mad, studio, maintenance, friedenszeit) ──
        bw: {
          dark:      '#0f1115',
          darker:    '#0a0c0f',
          gold:      '#E2B007',
          goldHover: '#cca006',
          glass:     'rgba(20, 25, 30, 0.7)',
          border:    'rgba(255, 255, 255, 0.1)',
        },
        // ── Flat bw aliases (datenschutz, entbannung, impressum, regelwerk) ──
        'bw-dark': '#0a0a0a',
        'bw-gold': '#E2B007',
        'bw-gray': '#1f2937',
        // ── Tactical palette (dbpanel, team) ──
        'tac-dark':   '#08080a',
        'tac-panel':  '#111114',
        'tac-card':   '#16161a',
        'tac-border': '#252529',
        'tac-amber':  '#e2a800',
        'tac-green':  '#10b981',
        'tac-red':    '#ef4444',
        'tac-blue':   '#3b82f6',
        'tac-purple': '#a855f7',
        'tac-muted':  '#71717a',
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['Oswald', 'sans-serif'],
        // Both JetBrains Mono and Roboto Mono are used across pages.
        mono:    ['"JetBrains Mono"', '"Roboto Mono"', 'monospace'],
      },
      backgroundImage: {
        // Used in team.html as bg-grid-pattern
        'grid-pattern': "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAyNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')",
      },
      keyframes: {
        scanline: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glowGreen: {
          from: { textShadow: '0 0 10px rgba(34, 197, 94, 0.2)' },
          to:   { textShadow: '0 0 20px rgba(34, 197, 94, 0.6)' },
        },
        glowRed: {
          from: { textShadow: '0 0 10px rgba(239, 68, 68, 0.2)' },
          to:   { textShadow: '0 0 20px rgba(239, 68, 68, 0.6)' },
        },
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInR: {
          '0%':   { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideOutR: {
          '0%':   { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(100%)' },
        },
        glitch: {
          '0%,100%': { transform: 'translate(0)' },
          '20%':     { transform: 'translate(-2px, 2px)' },
          '40%':     { transform: 'translate(2px, -2px)' },
          '60%':     { transform: 'translate(-1px, 1px)' },
          '80%':     { transform: 'translate(1px, -1px)' },
        },
      },
      animation: {
        'pulse-slow':  'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline':    'scanline 8s linear infinite',
        'glow-green':  'glowGreen 2s ease-in-out infinite alternate',
        'glow-red':    'glowRed 2s ease-in-out infinite alternate',
        'fade-in':     'fadeIn 0.3s ease-out',
        'slide-up':    'slideUp 0.4s ease-out',
        'slide-in-r':  'slideInR 0.3s ease-out',
        'slide-out-r': 'slideOutR 0.3s ease-in forwards',
        'glitch':      'glitch 1s linear infinite',
      },
    },
  },
  plugins: [],
};

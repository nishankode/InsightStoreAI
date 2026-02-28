/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ─── COLOR PALETTE ───────────────────────────────────────────
      colors: {
        // Background surfaces
        bg: {
          base: "#0A0A0F",
          surface: "#111118",
          elevated: "#1A1A24",
          border: "#2A2A38",
        },
        // Brand — violet-indigo
        brand: {
          primary: "#7C5CFC",
          hover: "#9B82FD",
          muted: "#7C5CFC1A",
          glow: "#7C5CFC33",
        },
        // Severity / semantic
        severity: {
          high: "#F75555",
          med: "#F5A623",
          low: "#4ADE80",
          info: "#38BDF8",
        },
        // Text
        text: {
          primary: "#F0F0FF",
          secondary: "#A0A0C0",
          muted: "#60607A",
        },
      },

      // ─── TYPOGRAPHY ──────────────────────────────────────────────
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Inter"', 'sans-serif'], // default sans override
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.4' }],   // 12px — badges, labels
        sm: ['0.875rem', { lineHeight: '1.6' }],   // 14px — body, captions
        base: ['1rem', { lineHeight: '1.6' }],   // 16px — default body
        lg: ['1.125rem', { lineHeight: '1.5' }],   // 18px — card titles
        xl: ['1.25rem', { lineHeight: '1.4' }],   // 20px — sub-headings
        '2xl': ['1.5rem', { lineHeight: '1.2' }],   // 24px — section titles
        '3xl': ['1.875rem', { lineHeight: '1.2' }],   // 30px — report/hero heading
        '4xl': ['2.25rem', { lineHeight: '1.1' }],   // 36px — marketing hero
      },
      letterSpacing: {
        heading: '-0.02em',
        caps: '+0.05em',
        normal: '0',
      },

      // ─── SPACING SCALE (4px base unit) ───────────────────────────
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
      },

      // ─── BORDER RADIUS ───────────────────────────────────────────
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        full: '9999px',
        DEFAULT: '10px',
      },

      // ─── BOX SHADOWS ─────────────────────────────────────────────
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.4)',
        md: '0 4px 16px rgba(0,0,0,0.5)',
        glow: '0 0 20px rgba(124,92,252,0.15)',
        'glow-lg': '0 0 40px rgba(124,92,252,0.25)',
        DEFAULT: '0 4px 16px rgba(0,0,0,0.5)',
      },

      // ─── MAX WIDTHS ──────────────────────────────────────────────
      maxWidth: {
        page: '1280px',
        content: '960px',
      },

      // ─── TRANSITIONS ─────────────────────────────────────────────
      transitionDuration: {
        fast: '150ms',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      // ─── ANIMATIONS ──────────────────────────────────────────────
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        pulse: 'pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

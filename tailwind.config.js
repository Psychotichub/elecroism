/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        es: {
          app: 'var(--es-surface-app)',
          canvas: 'var(--es-surface-canvas)',
          chrome1: 'var(--es-surface-chrome-1)',
          chrome2: 'var(--es-surface-chrome-2)',
          raised: 'var(--es-surface-raised)',
          borderSubtle: 'var(--es-border-subtle)',
          borderStrong: 'var(--es-border-strong)',
          primary: 'var(--es-text-primary)',
          secondary: 'var(--es-text-secondary)',
          bright: 'var(--es-text-bright)',
          label: 'var(--es-text-label)',
          hover: 'var(--es-hover-overlay)',
          accent: 'var(--es-accent)',
          accentMuted: 'var(--es-accent-muted)',
          accentFg: 'var(--es-accent-foreground)',
          success: 'var(--es-semantic-success)',
          warning: 'var(--es-semantic-warning)',
          error: 'var(--es-semantic-error)',
          learning: 'var(--es-semantic-learning)',
          inputBg: 'var(--es-input-bg)',
          inputBorder: 'var(--es-input-border)',
          btnSecondary: 'var(--es-btn-secondary-bg)',
          btnSecondaryHover: 'var(--es-btn-secondary-hover)',
          divider: 'var(--es-divider)',
        },
      },
      borderRadius: {
        'es-sm': 'var(--es-radius-sm)',
        'es-md': 'var(--es-radius-md)',
        'es-lg': 'var(--es-radius-lg)',
      },
      fontSize: {
        'es-caption': ['10px', { lineHeight: '14px', fontWeight: '500' }],
        'es-body-sm': ['11px', { lineHeight: '16px' }],
        'es-body': ['12px', { lineHeight: '18px' }],
        'es-title-sm': ['13px', { lineHeight: '18px', fontWeight: '600' }],
      },
      ringOffsetColor: {
        es: {
          chrome1: 'var(--es-surface-chrome-1)',
        },
      },
    },
  },
  plugins: [],
};

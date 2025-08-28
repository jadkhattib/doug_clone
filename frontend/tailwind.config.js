/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography'

export default {
  theme: {
    extend: {
      colors: {
        background: '#F5F4F0',
        foreground: '#2D2D2D',
        card: '#FFFFFF',
        'card-foreground': '#2D2D2D',
        popover: '#FFFFFF',
        'popover-foreground': '#2D2D2D',
        primary: '#000000',
        'primary-foreground': '#FFFFFF',
        secondary: '#F8F9FA',
        'secondary-foreground': '#2D2D2D',
        muted: '#666666',
        'muted-foreground': '#2D2D2D',
        accent: '#007BFF',
        'accent-foreground': '#FFFFFF',
        destructive: '#ef4444',
        'destructive-foreground': '#fafafa',
        border: '#E5E5E5',
        input: '#E5E5E5',
        ring: '#007BFF',
        'yellow-accent': '#FFD700',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'brand-name': ['1.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        'profile-name': ['2rem', { lineHeight: '1.2', fontWeight: '700' }],
        'profile-description': ['1rem', { lineHeight: '1.4', fontWeight: '400' }],
        'section-header': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }],
        'button': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      borderRadius: {
        lg: '0.5rem',
        md: 'calc(0.5rem - 2px)',
        sm: 'calc(0.5rem - 4px)',
      },
      container: {
        center: true,
        padding: '1.5rem',
        screens: {
          '2xl': '1200px',
        },
      },
    },
  },
  plugins: [
    typography,
  ],
}

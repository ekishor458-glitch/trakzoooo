/* Tailwind CDN configuration — mirrors the PHP app's inline config. */
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        navy: { 900: '#0B1F3A', 800: '#0F2B4C', 700: '#1A3A60', 600: '#1E4A78', 500: '#2563A8' },
        brand: { DEFAULT: '#1D4ED8', light: '#EFF6FF', hover: '#1E40AF' },
      },
    },
  },
};

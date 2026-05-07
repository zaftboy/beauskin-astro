/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDF8F3',
          100: '#F8F0EB',
          200: '#F0E0D4',
          300: '#E5C9B5',
          400: '#D4A882',
          500: '#C9956B',
          600: '#B07D54',
          700: '#8B6F5E',
          800: '#6B5445',
          900: '#4A3A30',
        },
        sage: {
          50: '#F0F5F0',
          100: '#E0ECE0',
          200: '#C1D9C1',
          500: '#5A8A5E',
          600: '#4A7A4E',
          700: '#3A6A3E',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', 'serif'],
        sans: ['"Noto Sans TC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

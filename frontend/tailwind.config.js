/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdebd5',
          500: '#f97316',
          600: '#ea6d14',
          700: '#c2510e',
        },
      },
    },
  },
  plugins: [],
};

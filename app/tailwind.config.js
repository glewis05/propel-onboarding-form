/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'propel-navy': '#003366',
        'propel-teal': '#007377',
        'propel-light': '#E6F5F5',
        'propel-coral': '#E8927C',
        'propel-gold': '#B8860B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

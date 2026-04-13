/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E76F51', // Terracotta
          hover: '#D65D41',
        },
        secondary: {
          DEFAULT: '#F4A261', // Sandy Orange
          hover: '#E7914F',
        },
        accent: '#2A9D8F',     // Persian Green
        mainBg: '#FAF9F6',     // Elegant Off-white
        surface: '#FFFFFF',
        mainText: '#3D3433',   // Warm Dark Grey
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

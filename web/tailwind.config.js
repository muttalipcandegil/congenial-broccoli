/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        gatespy: {
          50: "#F5F7FF",
          100: "#EAF0FF",
          200: "#C9DAFF",
          300: "#A7C5FF",
          400: "#6F9EFF",
          500: "#3777FF",
          600: "#155BE6",
          700: "#0E44B3",
          800: "#0A3180",
          900: "#051E4D"
        }
      }
    }
  },
  plugins: []
}
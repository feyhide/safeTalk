/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['DM Sans', 'sans-serif'], 
        slim: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
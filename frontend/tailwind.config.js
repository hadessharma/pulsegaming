/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        correct: '#6aaa64',
        present: '#c9b458',
        absent: '#787c7e',
        border: '#3a3a3c',
        dark: '#121213',
      },
    },
  },
  plugins: [],
}

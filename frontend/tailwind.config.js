/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        correct: '#10b981', // Emerald 500
        present: '#f59e0b', // Amber 500
        absent: '#3f3f46',  // Zinc 700
        border: '#27272a',  // Zinc 800
        dark: '#09090b',    // Zinc 950
        accent: '#8b5cf6',  // Violet 500
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(139, 92, 246, 0.3)',
      }
    },
  },
  plugins: [],
}

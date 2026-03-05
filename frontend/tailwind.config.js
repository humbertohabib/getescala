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
          DEFAULT: '#1E40AF', // blue-800
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#10B981', // emerald-500
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#EF4444', // red-500
          foreground: '#FFFFFF',
        },
      }
    },
  },
  plugins: [],
}

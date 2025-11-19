/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fokusBg: "#050816",
        fokusAccent: "#f97316",
        fokusAccentSoft: "#fed7aa",
      },
    },
  },
  plugins: [],
};

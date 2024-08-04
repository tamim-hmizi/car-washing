/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.twig", // Fixed the glob pattern for Twig files
    "./public/**/*.html", // Include static HTML files if needed
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // Търси във всички HTML файлове в основната директория и поддиректориите
    "./**/*.html",
    // Ако имате и други JS файлове (напр. React компоненти), добавете и тях
    "./public/scripts/**/*.js", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
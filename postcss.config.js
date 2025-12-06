// postcss.config.js
export default {
  plugins: {
    // 1. Tailwind CSS плъгинът трябва да бъде първи.
    'tailwindcss': {},
    // 2. Autoprefixer добавя вендорни префикси за по-добра поддръжка от браузърите.
    'autoprefixer': {},
  },
}
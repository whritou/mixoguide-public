/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ['var(--font-noto-serif)', 'serif'],
        body: ['var(--font-manrope)', 'sans-serif'],
        label: ['var(--font-manrope)', 'sans-serif'],
      },
    },
  },
}

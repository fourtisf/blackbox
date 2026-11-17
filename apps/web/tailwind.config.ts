import type { Config } from 'tailwindcss';

// Tokens from docs/07-DESIGN.md, exposed as Tailwind colors. The prototype ships its own reset,
// so Tailwind's preflight stays off to keep the approved look pixel for pixel.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        bg2: 'var(--bg2)',
        bg3: 'var(--bg3)',
        bd: 'var(--bd)',
        bd2: 'var(--bd2)',
        bd3: 'var(--bd3)',
        tx: 'var(--tx)',
        tx2: 'var(--tx2)',
        tx3: 'var(--tx3)',
        em: 'var(--em)',
        em2: 'var(--em2)',
        ice: 'var(--ice)',
        vi: 'var(--vi)',
        up: 'var(--up)',
        down: 'var(--down)',
      },
      fontFamily: { sans: 'var(--font)', mono: 'var(--mono)' },
      transitionTimingFunction: { brand: 'var(--ease)' },
    },
  },
};

export default config;

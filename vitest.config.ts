import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      obsidian: new URL('./test/obsidian.ts', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['./packages/**/*.test.{ts,tsx}', './src/**/*.test.{ts,tsx}', './web/src/**/*.test.{ts,tsx}'],
  },
})

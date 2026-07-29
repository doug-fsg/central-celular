import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: false,
    include: ['server/**/*.test.ts', 'src/**/*.test.ts'],
    setupFiles: ['server/tests/setup.ts'],
    testTimeout: 30000,
    environment: 'node',
    environmentMatchGlobs: [['src/**/*.test.ts', 'jsdom']],
  },
})

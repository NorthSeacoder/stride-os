import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web/src'),
    },
  },
  test: {
    globals: true,
    include: ['apps/**/__tests__/**/*.test.ts', 'packages/**/__tests__/**/*.test.ts'],
  },
});

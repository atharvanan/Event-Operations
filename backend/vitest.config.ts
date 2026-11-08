import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 300000,
    hookTimeout: 300000,
    fileParallelism: false,
    setupFiles: ['./tests/setup.ts'],
  },
});

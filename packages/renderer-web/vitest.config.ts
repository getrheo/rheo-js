import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Rendering every stress-harness screen exceeds Vitest's 5s default on GitHub runners.
    testTimeout: 20_000,
  },
});

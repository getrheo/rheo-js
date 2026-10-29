import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Layer-stress validation is ~6s on 2-vCPU GitHub runners (Vitest default is 5s).
    testTimeout: 20_000,
  },
});

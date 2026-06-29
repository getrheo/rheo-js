import { baseConfig } from '@rheo/config/eslint.js';

/** Mirrors `scripts/check-import-boundaries.mjs` (Runtime must stay platform/server free). */
export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'flow-runtime must stay UI-free (import-boundaries).' },
            { name: 'react-dom', message: 'flow-runtime must stay UI-free (import-boundaries).' },
            {
              name: 'react-native',
              message: 'flow-runtime must stay UI-free (import-boundaries).',
            },
            { name: 'fastify', message: 'flow-runtime must not depend on Fastify (import-boundaries).' },
            {
              name: '@prisma/client',
              message: 'flow-runtime must not depend on Prisma (import-boundaries).',
            },
            {
              name: '@clickhouse/client',
              message: 'flow-runtime must not depend on ClickHouse (import-boundaries).',
            },
          ],
        },
      ],
    },
  },
];

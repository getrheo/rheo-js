import { baseConfig } from '@rheo/config/eslint.js';

/** Mirrors `scripts/check-import-boundaries.mjs` (Renderer core must stay platform free). */
export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'renderer-core must stay React-free (import-boundaries).' },
            {
              name: 'react-dom',
              message: 'renderer-core must stay React-DOM-free (import-boundaries).',
            },
            {
              name: 'react-native',
              message: 'renderer-core must stay RN-free (import-boundaries).',
            },
          ],
        },
      ],
    },
  },
];

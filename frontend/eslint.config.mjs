import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/**
 * Правило слоёв (раздел 6 ТЗ): слой берёт код только из слоёв ниже —
 * app → widgets → features → entities → shared.
 */
const layer = (name, forbidden) => ({
  files: [`src/${name}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: forbidden.map((f) => ({
          group: [`@/${f}/*`, `@/${f}`],
          message: `Слой ${name} не может импортировать из ${f} (порядок: app → widgets → features → entities → shared)`,
        })),
      },
    ],
  },
});

export default [
  { ignores: ['.next/**', 'node_modules/**', 'src/shared/api/schema.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  layer('shared', ['entities', 'features', 'widgets', 'app']),
  layer('entities', ['features', 'widgets', 'app']),
  layer('features', ['widgets', 'app']),
  layer('widgets', ['app']),
];

import { defineConfig } from 'oxlint';

export default defineConfig({
  ignorePatterns: [
    'scripts/**',
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    '**/*.mjs',
  ],

  plugins: ['eslint', 'typescript', 'unicorn'],

  categories: {
    correctness: 'error',
    suspicious: 'warn',
    perf: 'warn',
  },

  options: {
    typeAware: true,
    typeCheck: true,
    maxWarnings: 0,
  },

  rules: {
    // Complexity / maintainability
    'eslint/complexity': ['error', { max: 10 }],
    'eslint/max-params': ['error', { max: 4 }],
    'eslint/max-depth': ['error', { max: 2 }],

    // TypeScript rules
    'typescript/no-unused-vars': [
      'error',
      {
        args: 'after-used',
        argsIgnorePattern: '^_$|^_',
        varsIgnorePattern: '^_$|^_',
        ignoreRestSiblings: true,
      },
    ],
    'typescript/no-inferrable-types': 'warn',
    'typescript/ban-ts-comment': 'warn',
    'typescript/no-floating-promises': 'error',
    'typescript/no-misused-promises': 'error',
    'typescript/await-thenable': 'error',
    'typescript/restrict-template-expressions': [
      'error',
      { allowNumber: true },
    ],
    'typescript/no-unnecessary-condition': 'warn',
    'typescript/no-unused-expressions': 'off',
    'typescript/no-empty-function': 'warn',
    'typescript/no-unsafe-type-assertion': 'off',
    'typescript/consistent-return': 'off',
    'typescript/no-unsafe-enum-comparison': 'off',
    'unicorn/consistent-function-scoping': 'off',
    'unicorn/no-array-reverse': 'off',
    'typescript/no-unnecessary-type-parameters': 'off',
    'unicorn/no-array-sort': 'off',
    'no-shadow': 'off',
    'no-unneeded-ternary': 'off',
    'typescript/no-extraneous-class': 'off',

  },
});

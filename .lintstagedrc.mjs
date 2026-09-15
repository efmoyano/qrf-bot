/** @type {import('lint-staged').Configuration} */
export default {
  ' src/**/*.{js,ts}': [
    'oxfmt --no-error-on-unmatched-pattern',
    'oxlint --fix',
  ],
  '*.ts': () => 'pnpm typecheck',
  'src/**/*.ts': () => 'pnpm typecheck',
};

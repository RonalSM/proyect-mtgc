import js from '@eslint/js';

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/build/**', 'dist/**'],
  },
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-useless-escape': 'off',
    },
  },
];

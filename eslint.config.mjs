import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/build/**'],
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
];

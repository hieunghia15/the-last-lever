import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const NO_PHASER = {
  regex: '^phaser($|/)',
  message: 'core/ và ai/ không được phụ thuộc Phaser.',
};
const NO_PRESENTATION = {
  regex: '(^|/)(scenes|ui|i18n)(/|$)',
  message: 'core/ và ai/ không được import lớp hiển thị hay i18n.',
};
const NO_UI = {
  regex: '(^|/)(scenes|ui)(/|$)',
  message: 'session/ không được import scene hay component Phaser.',
};
const NO_TESTS = {
  regex: '(^|/)tests(/|$)',
  message: 'Code game không được import từ tests/.',
};

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', '.gitnexus', '.claude'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  // ESLint replaces (not merges) a rule's options per block, so each block lists every pattern it needs.
  {
    files: ['src/**/*.ts'],
    ignores: ['src/core/**', 'src/ai/**', 'src/session/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [NO_TESTS] }] },
  },
  {
    // Rules core and bot AI must stay pure TypeScript so they can move to a server later.
    files: ['src/core/**/*.ts', 'src/ai/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [NO_PHASER, NO_PRESENTATION, NO_TESTS] }],
    },
  },
  {
    // Match driving logic stays Phaser-free so it can be tested on Node.
    files: ['src/session/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { ...NO_PHASER, message: 'session/ không được phụ thuộc Phaser.' },
            NO_UI,
            NO_TESTS,
          ],
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);

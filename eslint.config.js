import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

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
  {
    // Rules core and bot AI must stay pure TypeScript so they can move to a server later.
    files: ['src/core/**/*.ts', 'src/ai/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^phaser($|/)',
              message: 'core/ và ai/ không được phụ thuộc Phaser.',
            },
            {
              regex: '(^|/)(scenes|ui|i18n)(/|$)',
              message: 'core/ và ai/ không được import lớp hiển thị hay i18n.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);

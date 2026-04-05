import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import pluginImport from 'eslint-plugin-import';
import pluginNode from 'eslint-plugin-n';
import pluginUnusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

const jsRules = defineConfig({
  files: ['**/*.{js,jsx,mjs,ts,tsx,mts}'],
  plugins: {
    'unused-imports': pluginUnusedImports,
    'n': pluginNode,
    '@stylistic': stylistic,
  },
  extends: [pluginImport.flatConfigs.recommended, pluginImport.flatConfigs.typescript],
  rules: {
    'class-methods-use-this': 'off',
    'dot-notation': 'off',
    'import/exports-last': 'error',
    'import/extensions': 'off',
    'import/no-named-as-default': 'error',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'max-classes-per-file': 'off',
    'n/no-extraneous-import': 'off',
    'n/no-missing-import': 'off',
    'n/no-unsupported-features/es-syntax': 'error',
    'newline-before-return': 'error',
    'no-await-in-loop': 'off',
    'no-console': 'error',
    'no-redeclare': 'error',
    'no-restricted-syntax': 'error',
    'no-return-await': 'off',
    'no-shadow': 'off',
    'no-unused-expressions': 'error',
    'no-unused-vars': 'off',
    'no-use-before-define': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-rest-params': 'error',
    'sort-imports': 'off',
    'unused-imports/no-unused-imports': 'error',
    'curly': ['error', 'all'],
    'prefer-template': 'error',

    '@stylistic/padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: 'import', next: 'function' },
      { blankLine: 'always', prev: 'function', next: 'function' },
      { blankLine: 'always', prev: 'import', next: 'class' },
      { blankLine: 'always', prev: 'import', next: 'let' },
      { blankLine: 'always', prev: 'import', next: 'const' },
    ],

    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '/*.js',
          '/*.mjs',
          '/*.ts',
          '/*.mts',
          '/.*.js',
          '/.*.mjs',
          '/.*.ts',
          '/.*.mts',
          '**/*.test.js',
          '**/*.test.jsx',
          '**/*.test.mjs',
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/*.test.mts',
        ],
      },
    ],

    'no-void': [
      'error',
      {
        allowAsStatement: true,
      },
    ],

    'n/no-unpublished-import': [
      'error',
      {
        ignoreTypeImport: true,
      },
    ],

    'prefer-destructuring': [
      'error',
      {
        array: false,
        object: true,
      },
    ],

    'import/order': [
      'error',
      {
        'groups': [
          'builtin',
          'external',
          'internal',
          'index',
          'parent',
          'sibling',
          'object',
          'type',
        ],

        'pathGroups': [
          {
            pattern: './**/*.scss',
            group: 'type',
            position: 'after',
          },
          {
            pattern: '**/*.scss',
            group: 'type',
            position: 'after',
          },
        ],

        'alphabetize': {
          order: 'asc',
        },

        'newlines-between': 'always',
        'distinctGroup': true,
      },
    ],
  },
});

const tsRules = defineConfig({
  extends: [tseslint.configs.strictTypeChecked],
  files: ['**/*.{ts,tsx,mts}'],
  plugins: {
    '@typescript-eslint': tseslint.plugin,
  },
  rules: {
    '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/default-param-last': 'error',
    '@typescript-eslint/dot-notation': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-redeclare': 'error',
    '@typescript-eslint/no-shadow': 'error',
    '@typescript-eslint/no-unsafe-enum-comparison': 'off',
    '@typescript-eslint/no-unused-expressions': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'off',

    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],

    '@typescript-eslint/no-use-before-define': 'error',
    '@typescript-eslint/no-useless-constructor': 'error',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/return-await': 'error',

    // Rules that are covered be typescript-eslint and do not need
    // double checking/erroring:
    'import/no-unresolved': 'off',
    'n/no-unsupported-features/es-syntax': 'off',
    'no-redeclare': 'off',
    'no-restricted-syntax': 'off',
    'no-use-before-define': 'off',
  },
});

export default defineConfig([
  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Base ES Lint and TS ES Lint rules
  eslint.configs.recommended,

  // IAM Typescript rules for both FE and BE
  jsRules,
  tsRules,

  {
    files: ['**/*.template.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'prefer-template': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^context$',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'import', next: 'function' },
        { blankLine: 'always', prev: 'function', next: 'function' },
        { blankLine: 'always', prev: 'import', next: 'class' },
        { blankLine: 'always', prev: 'import', next: 'let' },
        { blankLine: 'always', prev: 'import', next: 'const' },
        { blankLine: 'always', prev: '*', next: 'const' },
      ],
    },
  },

  {
    files: ['**/*.context.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
]);

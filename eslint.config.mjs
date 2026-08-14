import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Flat config, replacing .eslintrc.cjs + .eslintignore. eslint 9 reads neither.
export default tseslint.config(
  // Global ignores. These were .eslintignore, which eslint 9 no longer reads,
  // plus the old ignorePatterns. The example apps and smoke workspace stay out:
  // the `lint` script never covered them, but the pre-commit hook matches *.js
  // anywhere, and linting them against a config written for library source
  // fails on things like a `require` in next.config.js or an import it cannot
  // resolve from an example's own node_modules. They are still
  // prettier-checked, typechecked by their own builds, and built in CI.
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.nyc_output/**',
      '**/*.d.ts',
      '**/*.log',
      'example/**',
      'smoke/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,

  // eslint-config-prettier only turns off rules that fight the formatter.
  // Formatting itself is not linted: `npm run format-check` is its own CI gate
  // and lint-staged runs `prettier --write` before eslint, so running prettier
  // through eslint as well would be a slower second copy of a check that
  // already exists.
  prettierConfig,

  {
    files: ['**/*.{js,cjs,mjs,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.es2021 },
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    settings: {
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
      },
      'import/ignore': ['node_modules', '\\.d\\.ts$'],
    },
    rules: {
      curly: 'error',
      eqeqeq: 'error',
      semi: ['error', 'always'],
      'no-console': 'off',
      '@typescript-eslint/no-use-before-define': ['error'],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'max-len': ['error', { code: 120 }],
      'prefer-const': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-unresolved': [
        'error',
        { ignore: ['^@angular', '^vue', '^@dynamic-field-kit'] },
      ],
    },
  },

  // CommonJS build scripts and config files.
  {
    files: ['scripts/**/*.js', '**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  }
);

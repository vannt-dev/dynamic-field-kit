import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
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
  importX.flatConfigs.recommended,

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
      // import-x 4 replaced the string-keyed resolver map with a resolver
      // object. createNodeResolver is the plugin's own, so this needs no
      // separate eslint-import-resolver-* package, and it understands node
      // builtins and package `exports` maps, which the old node resolver did
      // not.
      'import-x/resolver-next': [
        importX.createNodeResolver({
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
        }),
      ],
      'import-x/ignore': ['node_modules', '\\.d\\.ts$'],
    },
    rules: {
      // TypeScript already resolves and checks these, and it sees things
      // import-x cannot: `@dynamic-field-kit/core` resolves to its built
      // dist/index.mjs, where a type-only export has no runtime binding, so
      // import-x/named reports every `import type { FieldDescription }` as
      // missing. eslint-plugin-import's typescript preset turned these four
      // off for the same reason; import-x's equivalent preset wants a
      // separate resolver package, so they are turned off here instead,
      // where the reason is written down.
      'import-x/named': 'off',
      'import-x/namespace': 'off',
      'import-x/default': 'off',
      'import-x/no-named-as-default-member': 'off',

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
      'import-x/order': [
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
      'import-x/no-unresolved': [
        'error',
        { ignore: ['^@angular', '^vue', '^vitest', '^@dynamic-field-kit'] },
      ],
    },
  },

  // CommonJS build scripts and config files.
  {
    files: ['scripts/**/*.js', '**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);

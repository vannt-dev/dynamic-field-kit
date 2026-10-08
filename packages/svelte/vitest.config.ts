/// <reference types="vitest/globals" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    svelte({
      // The test fixtures read a prop once on purpose (a form is created from
      // the values it starts with). Everything else still warns.
      onwarn(warning, handler) {
        if (
          warning.code === 'state_referenced_locally' &&
          warning.filename?.includes('fixtures')
        ) {
          return;
        }
        handler?.(warning);
      },
    }),
  ],
  // Svelte ships a server build and a browser build under export conditions.
  // jsdom is a browser as far as the components are concerned, and `mount`
  // only exists in the browser build.
  resolve: { conditions: ['browser'] },
  test: {
    include: ['test/**/*.{test,spec}.ts'],
    globals: true,
    environment: 'jsdom',
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,svelte}'],
      exclude: ['**/*.d.ts', '**/dist/**'],
      // Coverage floor - the same numbers as the Vue adapter.
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 85,
        lines: 85,
      },
    },
  },
});

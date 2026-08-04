/// <reference types="vitest" />
import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vite';

export default defineConfig({
  // disableTypeChecking:false turns Angular semantic diagnostics (NG2007 etc.)
  // back on for specs — otherwise only the ng-packagr build typechecks src, and
  // spec files get no type checking at all.
  plugins: [angular({ disableTypeChecking: false })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    include: ['test/**/*.spec.ts'],
    pool: 'forks',
    coverage: {
      provider: 'istanbul',
      reportsDirectory: 'coverage',
      reporter: ['lcov', 'text-summary'],
      include: ['src/**/*.ts'],
      // Coverage floor — fails the run when coverage drops below these numbers.
      thresholds: {
        statements: 85,
        branches: 70,
        functions: 85,
        lines: 85,
      },
    },
  },
});

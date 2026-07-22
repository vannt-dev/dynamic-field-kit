module.exports = {
  test: {
    include: ['test/**/*.{test,spec}.js', 'test/**/*.{test,spec}.ts'],
    coverage: {
      // istanbul, not v8: the hoisted @vitest/coverage-v8 is built for
      // vitest 1.x and is incompatible with core's pinned vitest 0.34.6.
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx,js}'],
      exclude: ['**/*.d.ts', '**/dist/**', '**/node_modules/**'],
      // Coverage floor (vitest 0.34 flat threshold keys). Fails the run when
      // coverage drops below these numbers.
      lines: 85,
      statements: 85,
      functions: 85,
      branches: 75,
    },
  },
};

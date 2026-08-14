module.exports = {
  test: {
    include: ['test/**/*.{test,spec}.js', 'test/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx,js}'],
      exclude: ['**/*.d.ts', '**/dist/**', '**/node_modules/**'],
      // Coverage floor - fails the run when coverage drops below these
      // numbers. Same shape as react/vue/angular now that core is on the
      // same vitest major; 0.34 wanted these keys flat, without the wrapper.
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 85,
        lines: 85,
      },
    },
  },
};

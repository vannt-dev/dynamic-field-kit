module.exports = {
  test: {
    include: [
      'packages/**/test/**/*.{test,spec}.ts',
      'packages/**/test/**/*.{test,spec}.js',
    ],
  },
  // Use Istanbul-like coverage reporting via 'istanbul'
  coverage: {
    provider: 'istanbul',
    reporter: ['text', 'lcov', 'json', 'html'],
    all: true,
    include: [
      'packages/**/src/**/*.{ts,tsx,js}',
      'packages/**/test/**/*.{ts,tsx,js}',
    ],
    exclude: ['**/dist/**', '**/node_modules/**'],
    checkCoverage: true,
    lines: 75,
    statements: 75,
    branches: 60,
    functions: 75,
    coverageDirectory: 'coverage',
  },
};

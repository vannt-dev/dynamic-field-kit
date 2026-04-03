module.exports = {
  test: {
    include: ['test/**/*.{test,spec}.js', 'test/**/*.{test,spec}.ts'],
  },
  coverage: {
    provider: 'istanbul',
    reporter: ['text', 'lcov', 'json', 'html'],
    all: true,
    include: ['src/**/*.{ts,tsx,js}', 'test/**/*.{ts,tsx,js}'],
    exclude: ['**/dist/**', '**/node_modules/**'],
    checkCoverage: true,
    lines: 75,
    statements: 75,
    branches: 60,
    functions: 75,
    coverageDirectory: 'coverage',
  },
};

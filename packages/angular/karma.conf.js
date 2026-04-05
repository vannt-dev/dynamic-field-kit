module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', 'karma-typescript'],
    plugins: [
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-typescript',
      'karma-coverage',
    ],
    files: [{ pattern: 'test/**/*.spec.ts', included: true }],
    preprocessors: {
      'test/**/*.spec.ts': ['karma-typescript'],
    },
    client: {
      jasmine: {},
    },
    karmaTypescriptConfig: {
      tsconfig: './tsconfig.spec.json',
    },
    reporters: ['progress', 'coverage'],
    browsers: ['ChromeHeadless'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu'],
      },
    },
    singleRun: true,
    coverageReporter: {
      reporters: [
        { type: 'lcov', dir: 'coverage', subdir: '.' },
        { type: 'text-summary' },
      ],
    },
  });
};

import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { collectBundleSizes } from './show-sizes.js';

const tempRoots = [];

/**
 * Builds a throwaway workspace root containing one package, so the collector
 * runs against a real filesystem instead of a mocked one.
 */
function makeWorkspace(pkg, packageJson, distFiles) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'show-sizes-'));
  tempRoots.push(root);

  const pkgDir = path.join(root, 'packages', pkg);
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(
    path.join(pkgDir, 'package.json'),
    JSON.stringify(packageJson)
  );

  for (const [relative, contents] of Object.entries(distFiles)) {
    const file = path.join(pkgDir, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }

  return root;
}

afterEach(() => {
  while (tempRoots.length) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('collectBundleSizes', () => {
  it('labels a "type: module" package by its exports map, not by file extension', () => {
    // The vue package's shape: `.js` is the ESM build and `.cjs` is CommonJS,
    // the opposite of the `.js`/`.mjs` convention core and react use.
    const root = makeWorkspace(
      'vue',
      {
        name: '@dynamic-field-kit/vue',
        type: 'module',
        main: './dist/index.cjs',
        module: './dist/index.js',
        exports: {
          '.': {
            types: './dist/index.d.ts',
            import: './dist/index.js',
            require: './dist/index.cjs',
          },
        },
      },
      {
        'dist/index.js': 'e'.repeat(2048),
        'dist/index.cjs': 'c'.repeat(1024),
      }
    );

    expect(collectBundleSizes(root, ['vue'])).toEqual([
      { pkg: 'vue', format: 'ESM', bytes: 2048 },
      { pkg: 'vue', format: 'CJS', bytes: 1024 },
    ]);
  });

  it('labels a `.js`/`.mjs` package correctly too', () => {
    const root = makeWorkspace(
      'core',
      {
        name: '@dynamic-field-kit/core',
        main: 'dist/index.js',
        module: 'dist/index.mjs',
        exports: {
          '.': {
            import: './dist/index.mjs',
            require: './dist/index.js',
          },
        },
      },
      {
        'dist/index.mjs': 'e'.repeat(512),
        'dist/index.js': 'c'.repeat(256),
      }
    );

    expect(collectBundleSizes(root, ['core'])).toEqual([
      { pkg: 'core', format: 'ESM', bytes: 512 },
      { pkg: 'core', format: 'CJS', bytes: 256 },
    ]);
  });

  it('reports an ESM-only package once when main and module are the same file', () => {
    // The angular package's shape: ng-packagr ships fesm2022 only, and points
    // both `main` and `module` at it. Reporting that file as CJS would be a lie.
    const root = makeWorkspace(
      'angular',
      {
        name: '@dynamic-field-kit/angular',
        type: 'module',
        main: 'dist/fesm2022/dynamic-field-kit-angular.mjs',
        module: 'dist/fesm2022/dynamic-field-kit-angular.mjs',
      },
      { 'dist/fesm2022/dynamic-field-kit-angular.mjs': 'a'.repeat(4096) }
    );

    expect(collectBundleSizes(root, ['angular'])).toEqual([
      { pkg: 'angular', format: 'ESM', bytes: 4096 },
    ]);
  });

  it('marks a package as unbuilt when its entry file is missing', () => {
    const root = makeWorkspace(
      'core',
      {
        name: '@dynamic-field-kit/core',
        main: 'dist/index.js',
        module: 'dist/index.mjs',
      },
      {}
    );

    expect(collectBundleSizes(root, ['core'])).toEqual([
      { pkg: 'core', format: null, bytes: null, missing: true },
    ]);
  });

  it('covers every published package by default', () => {
    const root = path.resolve(__dirname, '..');
    const reported = new Set(
      collectBundleSizes(root).map((entry) => entry.pkg)
    );

    expect([...reported].sort()).toEqual(['angular', 'core', 'react', 'vue']);
  });

  it('resolves the real vue package entries to the right formats', () => {
    const root = path.resolve(__dirname, '..');
    const vue = collectBundleSizes(root, ['vue']);

    // Regression guard: `dist/index.js` in the vue package is ESM. An
    // extension-based guess reports it as CJS and never reports `dist/index.cjs`.
    expect(vue.map((entry) => entry.format)).toEqual(['ESM', 'CJS']);
  });
});

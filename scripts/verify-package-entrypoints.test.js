import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { findEntryPointProblems } from './verify-package-entrypoints.js';

const tempRoots = [];

function makePackage(manifest, distFiles = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'entrypoints-'));
  tempRoots.push(root);

  const pkgDir = path.join(root, 'packages', 'demo');
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(
    path.join(pkgDir, 'package.json'),
    JSON.stringify({ name: '@dynamic-field-kit/demo', ...manifest }),
  );

  for (const file of distFiles) {
    const full = path.join(pkgDir, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, '');
  }

  return root;
}

afterEach(() => {
  while (tempRoots.length) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('findEntryPointProblems', () => {
  it('accepts a package whose declared entry points all exist', () => {
    const root = makePackage(
      {
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        exports: {
          '.': { types: './dist/index.d.ts', default: './dist/index.js' },
        },
      },
      ['dist/index.js', 'dist/index.d.ts'],
    );

    expect(findEntryPointProblems(root, ['demo'])).toEqual([]);
  });

  it('flags a types path the build no longer emits', () => {
    // Exactly the ng-packagr 21 breakage: the d.ts moved to types/<name>.d.ts
    // and the manifest kept pointing at the old dist/index.d.ts.
    const root = makePackage(
      { main: 'dist/index.js', types: 'dist/index.d.ts' },
      ['dist/index.js', 'dist/types/demo.d.ts'],
    );

    expect(findEntryPointProblems(root, ['demo'])).toEqual([
      'demo: "types" points at dist/index.d.ts, which the build does not emit',
    ]);
  });

  it('flags a missing target inside an exports condition', () => {
    const root = makePackage(
      {
        main: 'dist/index.js',
        exports: {
          '.': { types: './dist/index.d.ts', default: './dist/index.js' },
        },
      },
      ['dist/index.js'],
    );

    expect(findEntryPointProblems(root, ['demo'])).toEqual([
      'demo: "exports["."].types" points at dist/index.d.ts, which the build does not emit',
    ]);
  });

  it('ignores bare specifiers and non-path values', () => {
    const root = makePackage(
      { main: 'dist/index.js', type: 'module', sideEffects: false },
      ['dist/index.js'],
    );

    expect(findEntryPointProblems(root, ['demo'])).toEqual([]);
  });

  it('skips a package that has not been built yet', () => {
    const root = makePackage({
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
    });

    expect(findEntryPointProblems(root, ['demo'])).toEqual([]);
  });

  it('holds for the real packages in this repo', () => {
    expect(findEntryPointProblems(path.resolve(__dirname, '..'))).toEqual([]);
  });
});

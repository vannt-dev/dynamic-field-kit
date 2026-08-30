import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { addExtensions } from './add-dts-extensions.js';

const tempRoots = [];

/** Writes a throwaway dist directory so the rewrite runs on a real tree. */
function makeDist(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dts-ext-'));
  tempRoots.push(root);
  for (const [relative, contents] of Object.entries(files)) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }
  return root;
}

const read = (dist, file) => fs.readFileSync(path.join(dist, file), 'utf8');

afterEach(() => {
  while (tempRoots.length) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('addExtensions', () => {
  // The exact shape ng-packagr generates, and the one that broke node16.
  it('adds .js to a sibling file specifier', () => {
    const dist = makeDist({
      'index.d.ts': "export * from './public-api';\n",
      'public-api.d.ts': 'export declare const a: number;\n',
    });

    expect(addExtensions(dist)).toEqual({ rewritten: 1, unresolved: [] });
    expect(read(dist, 'index.d.ts')).toBe("export * from './public-api.js';\n");
  });

  // './layout' is a directory, so './layout.js' would resolve to nothing.
  it('expands a directory specifier to its index', () => {
    const dist = makeDist({
      'public-api.d.ts': "export * from './layout';\n",
      'layout/index.d.ts': 'export declare const b: number;\n',
    });

    addExtensions(dist);
    expect(read(dist, 'public-api.d.ts')).toBe(
      "export * from './layout/index.js';\n",
    );
  });

  it('rewrites parent-relative, dynamic and side-effect imports', () => {
    const dist = makeDist({
      'lib/store.d.ts':
        "import type { L } from '../types/layout';\n" +
        "type D = import('../fieldRegistryToken');\n" +
        "import '../side-effect';\n" +
        'export declare const c: L | D;\n',
      'types/layout.d.ts': 'export declare type L = string;\n',
      'fieldRegistryToken.d.ts': 'export declare const t: number;\n',
      'side-effect.d.ts': 'export {};\n',
    });

    expect(addExtensions(dist).rewritten).toBe(3);
    const out = read(dist, 'lib/store.d.ts');
    expect(out).toContain("from '../types/layout.js'");
    expect(out).toContain("import('../fieldRegistryToken.js')");
    expect(out).toContain("import '../side-effect.js'");
  });

  it('leaves bare package specifiers alone', () => {
    const body =
      "import { Component } from '@angular/core';\n" +
      "export * from '@dynamic-field-kit/core';\n";
    const dist = makeDist({ 'index.d.ts': body });

    expect(addExtensions(dist)).toEqual({ rewritten: 0, unresolved: [] });
    expect(read(dist, 'index.d.ts')).toBe(body);
  });

  it('is idempotent - a specifier that already has an extension is skipped', () => {
    const dist = makeDist({
      'index.d.ts': "export * from './public-api.js';\n",
      'public-api.d.ts': 'export declare const a: number;\n',
    });

    expect(addExtensions(dist)).toEqual({ rewritten: 0, unresolved: [] });
    expect(read(dist, 'index.d.ts')).toBe("export * from './public-api.js';\n");
  });

  // Rewriting to a path that does not exist would swap TS2834 for a resolution
  // error that says less about what went wrong.
  it('reports an unresolvable specifier instead of guessing', () => {
    const dist = makeDist({ 'index.d.ts': "export * from './missing';\n" });

    const result = addExtensions(dist);
    expect(result.rewritten).toBe(0);
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0].specifier).toBe('./missing');
    expect(read(dist, 'index.d.ts')).toBe("export * from './missing';\n");
  });

  it('ignores files that are not declarations', () => {
    const body = "export * from './public-api';\n";
    const dist = makeDist({
      'fesm2022/bundle.mjs': body,
      'public-api.d.ts': 'export declare const a: number;\n',
    });

    expect(addExtensions(dist).rewritten).toBe(0);
    expect(read(dist, 'fesm2022/bundle.mjs')).toBe(body);
  });

  it('fails loudly when the directory does not exist', () => {
    expect(() =>
      addExtensions(path.join(os.tmpdir(), 'definitely-not-here-4471')),
    ).toThrow(/does not exist/);
  });
});

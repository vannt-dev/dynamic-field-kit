import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { findCrossFrameworkImports } from './check-cross-framework-imports.js';

const tempRoots = [];

/** Writes `files` (relative path -> contents) under packages/<pkg>/src. */
function makeWorkspace(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-imports-'));
  tempRoots.push(root);

  for (const pkg of ['react', 'vue', 'angular']) {
    fs.mkdirSync(path.join(root, 'packages', pkg, 'src'), { recursive: true });
  }

  for (const [relative, contents] of Object.entries(files)) {
    const file = path.join(root, relative);
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

describe('findCrossFrameworkImports', () => {
  it('detects an import of a sibling framework package', () => {
    const root = makeWorkspace({
      'packages/vue/src/index.ts':
        "import { DynamicInput } from '@dynamic-field-kit/react';\n",
    });

    expect(findCrossFrameworkImports(root)).toEqual([
      {
        file: path.join(root, 'packages', 'vue', 'src', 'index.ts'),
        line: 1,
        framework: 'react',
      },
    ]);
  });

  it('detects a require() of a sibling framework package', () => {
    const root = makeWorkspace({
      'packages/react/src/legacy.js':
        "const vue = require('@dynamic-field-kit/vue');\n",
    });

    expect(findCrossFrameworkImports(root)).toMatchObject([
      { line: 1, framework: 'vue' },
    ]);
  });

  it('reports the line number of a violation further down a file', () => {
    const root = makeWorkspace({
      'packages/angular/src/index.ts': [
        "import { defineField } from '@dynamic-field-kit/core';",
        '',
        "import { x } from '@dynamic-field-kit/vue';",
      ].join('\n'),
    });

    expect(findCrossFrameworkImports(root)).toMatchObject([
      { line: 3, framework: 'vue' },
    ]);
  });

  it('scans nested directories', () => {
    const root = makeWorkspace({
      'packages/vue/src/layout/deep/nested.tsx':
        "import x from '@dynamic-field-kit/angular';\n",
    });

    expect(findCrossFrameworkImports(root)).toHaveLength(1);
  });

  it('allows importing core', () => {
    const root = makeWorkspace({
      'packages/vue/src/index.ts':
        "import { defineField } from '@dynamic-field-kit/core';\n",
    });

    expect(findCrossFrameworkImports(root)).toEqual([]);
  });

  it('ignores files that are not source files', () => {
    const root = makeWorkspace({
      'packages/vue/src/README.md':
        "import { x } from '@dynamic-field-kit/react';\n",
      'packages/vue/src/data.json': '{}',
    });

    expect(findCrossFrameworkImports(root)).toEqual([]);
  });

  it('finds nothing in this repo', () => {
    expect(findCrossFrameworkImports(path.resolve(__dirname, '..'))).toEqual(
      []
    );
  });
});

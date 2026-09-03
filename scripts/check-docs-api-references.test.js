import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  collectDocImports,
  findDocApiProblems,
} from './check-docs-api-references.js';

const tempRoots = [];

function makeDoc(markdown) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-api-'));
  tempRoots.push(root);
  const file = path.join(root, 'README.md');
  fs.writeFileSync(file, markdown);
  return file;
}

afterEach(() => {
  while (tempRoots.length) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('collectDocImports', () => {
  it('reads named imports out of a fenced code block', () => {
    const file = makeDoc(
      [
        '```ts',
        "import { validateFields } from '@dynamic-field-kit/core';",
        '```',
      ].join('\n'),
    );

    expect(collectDocImports(file)).toEqual([
      { pkg: 'core', name: 'validateFields', line: 2 },
    ]);
  });

  it('handles multi-line imports, aliases and type imports', () => {
    const file = makeDoc(
      [
        '```tsx',
        'import {',
        '  fieldRegistry as registry,',
        '  type ValidationResult,',
        "} from '@dynamic-field-kit/react';",
        '```',
      ].join('\n'),
    );

    expect(collectDocImports(file).map((i) => i.name)).toEqual([
      'fieldRegistry',
      'ValidationResult',
    ]);
  });

  it('does not read a preceding import as part of this one', () => {
    const file = makeDoc(
      [
        '```ts',
        "import { defineComponent, h } from 'vue';",
        "import { MultiFieldInput } from '@dynamic-field-kit/vue';",
        '```',
      ].join('\n'),
    );

    expect(collectDocImports(file).map((i) => i.name)).toEqual([
      'MultiFieldInput',
    ]);
  });

  it('ignores imports from other packages', () => {
    const file = makeDoc(
      ['```ts', "import { ref } from 'vue';", '```'].join('\n'),
    );

    expect(collectDocImports(file)).toEqual([]);
  });

  it('ignores prose that merely mentions an import', () => {
    const file = makeDoc(
      "Call `import { nope } from '@dynamic-field-kit/core'` to do the thing.",
    );

    expect(collectDocImports(file)).toEqual([]);
  });
});

describe('findDocApiProblems', () => {
  const exportsByPackage = {
    core: new Set(['validateFields', 'FieldDescription']),
  };

  it('accepts a doc that only imports things the package exports', () => {
    const file = makeDoc(
      [
        '```ts',
        "import { validateFields, FieldDescription } from '@dynamic-field-kit/core';",
        '```',
      ].join('\n'),
    );

    expect(findDocApiProblems([file], exportsByPackage)).toEqual([]);
  });

  it('flags a name the package does not export', () => {
    const file = makeDoc(
      [
        '```ts',
        "import { validateAll } from '@dynamic-field-kit/core';",
        '```',
      ].join('\n'),
    );

    const [problem] = findDocApiProblems([file], exportsByPackage);
    expect(problem).toContain('validateAll');
    expect(problem).toContain('@dynamic-field-kit/core');
    expect(problem).toContain('README.md:2');
  });

  it('says nothing about a package whose exports were not collected', () => {
    const file = makeDoc(
      [
        '```ts',
        "import { whatever } from '@dynamic-field-kit/vue';",
        '```',
      ].join('\n'),
    );

    expect(findDocApiProblems([file], exportsByPackage)).toEqual([]);
  });
});

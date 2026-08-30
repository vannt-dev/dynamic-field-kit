import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { strip } from './strip-sourcemaps.js';

const tempRoots = [];

/** Writes a throwaway dist directory so the stripper runs on a real tree. */
function makeDist(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'strip-maps-'));
  tempRoots.push(root);
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

describe('strip', () => {
  it('deletes .map files and the comment that referenced them', () => {
    const dist = makeDist({
      'fesm2022/lib.mjs':
        'export const a = 1;\n//# sourceMappingURL=lib.mjs.map\n',
      'fesm2022/lib.mjs.map': '{"version":3}',
    });

    const result = strip(dist);

    expect(result).toEqual({ maps: 1, commentsRemoved: 1 });
    expect(fs.existsSync(path.join(dist, 'fesm2022/lib.mjs.map'))).toBe(false);
    expect(fs.readFileSync(path.join(dist, 'fesm2022/lib.mjs'), 'utf8')).toBe(
      'export const a = 1;',
    );
  });

  it('walks nested directories', () => {
    const dist = makeDist({
      'a/b/c/deep.js': 'x\n//# sourceMappingURL=deep.js.map',
      'a/b/c/deep.js.map': '{}',
    });

    expect(strip(dist)).toEqual({ maps: 1, commentsRemoved: 1 });
  });

  it('strips the /* */ comment form too, and handles css', () => {
    const dist = makeDist({
      'styles.css': '.a{color:red}\n/*# sourceMappingURL=styles.css.map */',
      'styles.css.map': '{}',
    });

    strip(dist);
    expect(fs.readFileSync(path.join(dist, 'styles.css'), 'utf8')).toBe(
      '.a{color:red}',
    );
  });

  // The comment is only stripped at the end of a file, so a URL that appears in
  // the code itself - a string a bundler happened to inline, say - survives.
  it('leaves a sourceMappingURL that is not the trailing comment alone', () => {
    const body =
      'const s = "//# sourceMappingURL=nope.map";\nexport default s;\n';
    const dist = makeDist({ 'keep.js': body });

    expect(strip(dist)).toEqual({ maps: 0, commentsRemoved: 0 });
    expect(fs.readFileSync(path.join(dist, 'keep.js'), 'utf8')).toBe(body);
  });

  it('is a no-op on a dist that has no maps', () => {
    const dist = makeDist({ 'clean.mjs': 'export const a = 1;\n' });

    expect(strip(dist)).toEqual({ maps: 0, commentsRemoved: 0 });
    expect(fs.readFileSync(path.join(dist, 'clean.mjs'), 'utf8')).toBe(
      'export const a = 1;\n',
    );
  });

  it('fails loudly when the directory does not exist', () => {
    expect(() =>
      strip(path.join(os.tmpdir(), 'definitely-not-here-9182')),
    ).toThrow(/does not exist/);
  });
});

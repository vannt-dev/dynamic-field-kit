import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { findFrameworkDepProblems } from './verify-framework-deps.js';

const tempRoots = [];

const FRAMEWORKS = ['react', 'vue', 'angular'];

/** A manifest that satisfies every rule, so each test can break one thing. */
function healthyManifest(pkg, overrides = {}) {
  return {
    name: `@dynamic-field-kit/${pkg}`,
    peerDependencies: { '@dynamic-field-kit/core': '^1.3.0' },
    devDependencies: { '@dynamic-field-kit/core': '^1.3.0' },
    ...overrides,
  };
}

function makeWorkspace(manifests) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-deps-'));
  tempRoots.push(root);

  for (const pkg of FRAMEWORKS) {
    const pkgDir = path.join(root, 'packages', pkg);
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify(manifests[pkg] || healthyManifest(pkg))
    );
  }

  return root;
}

afterEach(() => {
  while (tempRoots.length) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('findFrameworkDepProblems', () => {
  it('accepts packages that declare every peer in devDependencies', () => {
    const root = makeWorkspace({});

    expect(findFrameworkDepProblems(root)).toEqual([]);
  });

  it('flags a package that does not dev-install a framework it peer-depends on', () => {
    // A package that peer-depends on vue but never dev-installs it can only be
    // built and tested by borrowing vue from the workspace root.
    const root = makeWorkspace({
      vue: healthyManifest('vue', {
        peerDependencies: {
          '@dynamic-field-kit/core': '^1.3.0',
          vue: '^3.0.0',
        },
        devDependencies: { '@dynamic-field-kit/core': '^1.3.0' },
      }),
    });

    expect(findFrameworkDepProblems(root)).toEqual([
      'vue: peer-depends on vue but does not declare it in ' +
        'devDependencies, so it builds and tests against whatever the ' +
        'workspace root happens to hoist',
    ]);
  });

  it('still flags a dependency on a sibling framework package', () => {
    const root = makeWorkspace({
      react: healthyManifest('react', {
        dependencies: { '@dynamic-field-kit/vue': '^1.4.0' },
      }),
    });

    expect(findFrameworkDepProblems(root)).toEqual([
      'react: depends on @dynamic-field-kit/vue (should depend only on core) (in dependencies/peer/dev)',
    ]);
  });

  it('reports both kinds of problem at once', () => {
    const root = makeWorkspace({
      react: healthyManifest('react', {
        peerDependencies: {
          '@dynamic-field-kit/core': '^1.3.0',
          '@dynamic-field-kit/angular': '^1.4.0',
          react: '^19.0.0',
        },
        devDependencies: { '@dynamic-field-kit/core': '^1.3.0' },
      }),
    });

    // One cross-framework dependency, plus two peers left out of
    // devDependencies (@dynamic-field-kit/angular and react). The sibling
    // package is genuinely both problems at once, so it is reported twice.
    expect(findFrameworkDepProblems(root)).toHaveLength(3);
  });

  it('applies the devDependencies rule to the core peer too', () => {
    const root = makeWorkspace({
      angular: healthyManifest('angular', { devDependencies: {} }),
    });

    expect(findFrameworkDepProblems(root)).toEqual([
      'angular: peer-depends on @dynamic-field-kit/core but does not ' +
        'declare it in devDependencies, so it builds and tests against ' +
        'whatever the workspace root happens to hoist',
    ]);
  });

  it('holds for the real packages in this repo', () => {
    expect(findFrameworkDepProblems(path.resolve(__dirname, '..'))).toEqual([]);
  });
});

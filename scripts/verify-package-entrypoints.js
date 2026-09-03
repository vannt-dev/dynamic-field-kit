#!/usr/bin/env node
// Verify that every entry point a package advertises actually exists in its
// build output. A build tool that renames its output (ng-packagr 21 moved the
// Angular d.ts from dist/index.d.ts to dist/types/<name>.d.ts) leaves the
// manifest pointing at a file nobody emits any more - the package still packs
// and installs, and only breaks once a consumer imports it.

const fs = require('fs');
const path = require('path');

const PACKAGES = ['core', 'react', 'vue', 'angular'];

// Fields whose value is a single path into the build output.
const PATH_FIELDS = ['main', 'module', 'types', 'typings', 'browser'];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Entry points always name a file, so the extension is what separates a path
// from a plain setting such as "type": "module".
function isFilePath(value) {
  return typeof value === 'string' && /\.[a-z]+$/i.test(value);
}

/** Walk the `exports` tree, yielding [label, target] for every string leaf. */
function exportTargets(node, label) {
  if (typeof node === 'string') {
    return [[label, node]];
  }
  if (!node || typeof node !== 'object') {
    return [];
  }
  return Object.entries(node).flatMap(([key, child]) =>
    exportTargets(
      child,
      key.startsWith('.')
        ? `${label}[${JSON.stringify(key)}]`
        : `${label}.${key}`,
    ),
  );
}

function normalize(target) {
  return target.replace(/^\.\//, '');
}

function problemsForPackage(pkgDir, pkgName) {
  const pjson = readJson(path.join(pkgDir, 'package.json'));

  const declared = [
    ...PATH_FIELDS.filter((field) => isFilePath(pjson[field])).map((field) => [
      `"${field}"`,
      pjson[field],
    ]),
    ...exportTargets(pjson.exports, 'exports')
      .filter(([, target]) => isFilePath(target))
      .map(([label, target]) => [`"${label}"`, target]),
  ];

  return declared
    .filter(
      ([, target]) => !fs.existsSync(path.join(pkgDir, normalize(target))),
    )
    .map(
      ([label, target]) =>
        `${pkgName}: ${label} points at ${normalize(target)}, which the build does not emit`,
    );
}

/**
 * Returns one message per entry point that does not resolve. Packages whose
 * `dist` is missing are skipped, so this is safe to run before a build (and on
 * a partial build) the way the other integration checks are.
 */
function findEntryPointProblems(root, packages = PACKAGES) {
  return packages.flatMap((pkgName) => {
    const pkgDir = path.join(root, 'packages', pkgName);
    if (!fs.existsSync(path.join(pkgDir, 'package.json'))) {
      return [];
    }
    if (!fs.existsSync(path.join(pkgDir, 'dist'))) {
      return [];
    }
    return problemsForPackage(pkgDir, pkgName);
  });
}

module.exports = { findEntryPointProblems };

if (require.main === module) {
  const problems = findEntryPointProblems(process.cwd());
  if (problems.length > 0) {
    console.error('Package entry point problems found:');
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    process.exit(1);
  }
  console.log('Package entry points verified: every declared path is emitted.');
}

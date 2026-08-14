#!/usr/bin/env node
// Verify that each framework package (react, vue, angular) depends only on core,
// and that it dev-installs every framework it peer-depends on.

const fs = require('fs');
const path = require('path');

const FRAMEWORK_PACKAGES = ['react', 'vue', 'angular'];

function readJson(p) {
  const data = fs.readFileSync(p, 'utf8');
  return JSON.parse(data);
}

function crossFrameworkProblems(pkgName, pjson) {
  const deps = Object.assign(
    {},
    pjson.dependencies || {},
    pjson.peerDependencies || {},
    pjson.devDependencies || {}
  );

  return FRAMEWORK_PACKAGES.filter((other) => other !== pkgName)
    .map((other) => `@dynamic-field-kit/${other}`)
    .filter((alias) => Object.prototype.hasOwnProperty.call(deps, alias))
    .map(
      (alias) =>
        `${pkgName}: depends on ${alias} (should depend only on core) (in dependencies/peer/dev)`
    );
}

// A peer that is never dev-installed still resolves during a local build or
// test run, but only by borrowing whatever the workspace root happens to hoist.
// That makes the package's own manifest a lie about what it was verified
// against, and it breaks the moment the root stops declaring it.
function undeclaredPeerProblems(pkgName, pjson) {
  const devDeps = pjson.devDependencies || {};

  return Object.keys(pjson.peerDependencies || {})
    .filter((peer) => !Object.prototype.hasOwnProperty.call(devDeps, peer))
    .map(
      (peer) =>
        `${pkgName}: peer-depends on ${peer} but does not declare it in devDependencies, ` +
        `so it builds and tests against whatever the workspace root happens to hoist`
    );
}

function findFrameworkDepProblems(root = path.resolve(__dirname, '..')) {
  const problems = [];

  for (const pkgName of FRAMEWORK_PACKAGES) {
    const pjson = readJson(
      path.join(root, 'packages', pkgName, 'package.json')
    );

    problems.push(...crossFrameworkProblems(pkgName, pjson));
    problems.push(...undeclaredPeerProblems(pkgName, pjson));
  }

  return problems;
}

if (require.main === module) {
  const problems = findFrameworkDepProblems();

  if (problems.length) {
    console.error('Framework dependency issues found:');
    problems.forEach((m) => console.error(' -', m));
    process.exit(1);
  }

  console.log(
    'OK: react/vue/angular depend only on core and dev-install their own peers.'
  );
}

module.exports = { findFrameworkDepProblems, FRAMEWORK_PACKAGES };

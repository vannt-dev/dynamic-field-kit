#!/usr/bin/env node
// Verify that each framework package (react, vue, angular) depends only on core
// and does not depend on the other framework packages.

const path = require('path');
const fs = require('fs');

function readJson(p) {
  const data = fs.readFileSync(p, 'utf8');
  return JSON.parse(data);
}

const base = path.resolve(__dirname, '..');
const pkgs = {
  react: path.join(base, 'packages', 'react', 'package.json'),
  vue: path.join(base, 'packages', 'vue', 'package.json'),
  angular: path.join(base, 'packages', 'angular', 'package.json'),
};

let problems = [];

function check(pkgName, pjson) {
  const other = Object.keys(pkgs).filter((n) => n !== pkgName);
  const deps = Object.assign(
    {},
    pjson.dependencies || {},
    pjson.peerDependencies || {},
    pjson.devDependencies || {}
  );
  other.forEach((o) => {
    const alias = `@dynamic-field-kit/${o}`;
    if (deps && Object.prototype.hasOwnProperty.call(deps, alias)) {
      problems.push(
        `${pkgName}: depends on ${alias} (should depend only on core) (in dependencies/peer/dev)`
      );
    }
  });
}

for (const [name, p] of Object.entries(pkgs)) {
  const pjson = readJson(p);
  check(name, pjson);
}

if (problems.length) {
  console.error('Framework dependency issues found:');
  problems.forEach((m) => console.error(' -', m));
  process.exit(1);
} else {
  console.log(
    'OK: No cross-framework dependencies detected in react/vue/angular packages.'
  );
}

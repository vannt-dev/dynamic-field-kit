#!/usr/bin/env node
// Lint check: ensure each framework package (react, vue, angular) does not import
// from other framework packages. Only core should be the cross-package dependency.

const fs = require('fs');
const path = require('path');

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, cb);
    } else {
      cb(full);
    }
  }
}

function isSourceFile(p) {
  return /\\.(ts|tsx|js|jsx)$/.test(p);
}

const repoRoot = path.resolve(__dirname, '..');
const roots = [
  path.resolve(repoRoot, 'packages', 'react', 'src'),
  path.resolve(repoRoot, 'packages', 'vue', 'src'),
  path.resolve(repoRoot, 'packages', 'angular', 'src'),
];

let violations = [];

for (const root of roots) {
  walk(root, (file) => {
    if (!isSourceFile(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(
        /from\s+['"]@dynamic-field-kit\/(vue|angular|react)['"]/
      );
      if (m) {
        violations.push({ file, line: i + 1, framework: m[1] });
      }
      const m2 = line.match(
        /require\(['"]@dynamic-field-kit\/(vue|angular|react)['"]\)/
      );
      if (m2) {
        violations.push({ file, line: i + 1, framework: m2[1] });
      }
    }
  });
}

if (violations.length) {
  console.error('Cross-framework imports detected:');
  violations.forEach((v) => {
    console.error(
      ` - ${v.file}:${v.line} (importing @dynamic-field-kit/${v.framework})`
    );
  });
  process.exit(1);
} else {
  console.log(
    'OK: No cross-framework imports found in src of react/vue/angular packages.'
  );
  process.exit(0);
}

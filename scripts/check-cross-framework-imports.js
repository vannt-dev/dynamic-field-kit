#!/usr/bin/env node
// Lint check: ensure each framework package (react, vue, angular) does not import
// from other framework packages. Only core should be the cross-package dependency.

const fs = require('fs');
const path = require('path');

const FRAMEWORK_PACKAGES = ['react', 'vue', 'angular'];

const IMPORT_PATTERN = /from\s+['"]@dynamic-field-kit\/(vue|angular|react)['"]/;
const REQUIRE_PATTERN =
  /require\(['"]@dynamic-field-kit\/(vue|angular|react)['"]\)/;

function walk(dir, cb) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, cb);
    } else {
      cb(full);
    }
  }
}

function isSourceFile(p) {
  return /\.(ts|tsx|js|jsx)$/.test(p);
}

function findCrossFrameworkImports(root = path.resolve(__dirname, '..')) {
  const violations = [];

  for (const pkg of FRAMEWORK_PACKAGES) {
    walk(path.join(root, 'packages', pkg, 'src'), (file) => {
      if (!isSourceFile(file)) {
        return;
      }

      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

      lines.forEach((line, i) => {
        const m = line.match(IMPORT_PATTERN) || line.match(REQUIRE_PATTERN);
        if (m) {
          violations.push({ file, line: i + 1, framework: m[1] });
        }
      });
    });
  }

  return violations;
}

if (require.main === module) {
  const violations = findCrossFrameworkImports();

  if (violations.length) {
    console.error('Cross-framework imports detected:');
    violations.forEach((v) => {
      console.error(
        ` - ${v.file}:${v.line} (importing @dynamic-field-kit/${v.framework})`
      );
    });
    process.exit(1);
  }

  console.log(
    'OK: No cross-framework imports found in src of react/vue/angular packages.'
  );
}

module.exports = { findCrossFrameworkImports, FRAMEWORK_PACKAGES };

#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packagesDir = path.join(root, 'packages');
const dirs = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(packagesDir, d.name));

let hasError = false;
for (const d of dirs) {
  const tsconfig = path.join(d, 'tsconfig.json');
  if (fs.existsSync(tsconfig)) {
    console.log(`Type-checking: ${path.basename(d)}`);
    const res = spawnSync('tsc', ['-p', tsconfig], { stdio: 'inherit' });
    if (res.status !== 0) {
      hasError = true;
      // do not break to show all errors; but keep exit code at end
    }
  }
}
process.exit(hasError ? 1 : 0);

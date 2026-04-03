const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packages = ['core', 'react', 'vue'];

console.log('=== Bundle Sizes ===\n');

for (const pkg of packages) {
  const distPath = path.join(root, 'packages', pkg, 'dist');

  if (!fs.existsSync(distPath)) {
    console.log(`${pkg}: dist not found`);
    continue;
  }

  const mainFile = path.join(distPath, 'index.js');
  const esmFile = path.join(distPath, 'index.mjs');

  if (fs.existsSync(mainFile)) {
    const size = fs.statSync(mainFile).size;
    console.log(`${pkg} (CJS): ${(size / 1024).toFixed(2)} KB`);
  }

  if (fs.existsSync(esmFile)) {
    const size = fs.statSync(esmFile).size;
    console.log(`${pkg} (ESM): ${(size / 1024).toFixed(2)} KB`);
  }
}

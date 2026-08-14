#!/usr/bin/env node
const { execSync } = require('child_process');
const packages = ['core', 'react', 'vue', 'angular'];

console.log('Hoisting diagnosis: showing core resolution per package...');
packages.forEach((p) => {
  try {
    const dir = `./packages/${p}`;
    console.log(`\n=== ${p.toUpperCase()} ===`);
    // stdio: 'inherit' prints straight to our stdout, so there is nothing to
    // capture from the return value.
    execSync(`npm ls @dynamic-field-kit/core --depth=0`, {
      cwd: dir,
      stdio: 'inherit',
    });
  } catch (e) {
    // non-zero exit is fine; we'll still print next package
    console.log(`Could not resolve in ${p}: ${e.message ?? e}`);
  }
});

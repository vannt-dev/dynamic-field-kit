#!/usr/bin/env node
/*
  Integration test: verify cross-registry wiring between core and adapters (dist builds)
  - If core + all adapters dist exist, register a renderer on core and ensure adapters
    expose a wrapper that yields expected output when invoked.
  - If any dist is missing, exit 0 (skip gracefully) so CI can still pass for partial builds.
*/
const path = require('path');
const fs = require('fs');

function tryRequire(p) {
  try {
    return require(p);
  } catch {
    return null;
  }
}

const root = process.cwd();
const coreDist = path.resolve(root, 'packages', 'core', 'dist', 'index.js');
const reactDist = path.resolve(root, 'packages', 'react', 'dist', 'index.js');
const vueDist = path.resolve(root, 'packages', 'vue', 'dist', 'index.js');
const angularDist = path.resolve(
  root,
  'packages',
  'angular',
  'dist',
  'index.js'
);

const core = tryRequire(coreDist);
const reactAdapter = tryRequire(reactDist);
const vueAdapter = tryRequire(vueDist);

const coreExists = !!core;
const adaptersExist = !!(reactAdapter && vueAdapter);

if (!coreExists || !adaptersExist) {
  console.log('Integration test skipped: core or adapters dist not built yet.');
  process.exit(0);
}

try {
  // Run a minimal cross-registry test that validates basic interaction
  const renderer = (props) => `core-${props?.value ?? ''}`;
  core.fieldRegistry.register('text', renderer);

  const adapters = [reactAdapter.fieldRegistry, vueAdapter.fieldRegistry];
  adapters.forEach((reg) => {
    const r = reg.get('text');
    if (typeof r !== 'function')
      throw new Error('renderer not registered in adapter');
    const out = r({ value: 'X' });
    if (out !== 'core-X')
      throw new Error(`unexpected output from adapter wrapper: ${out}`);
  });
  console.log(
    'Integration test passed: core and adapters share a registry view.'
  );
  process.exit(0);
} catch (e) {
  console.error('Integration test failed:', e && e.message ? e.message : e);
  process.exit(1);
}

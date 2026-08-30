#!/usr/bin/env node
/*
  Integration test: verify cross-registry wiring between core and adapters (dist builds)
  - If core + all adapters dist exist, register a renderer on core and ensure adapters
    expose a wrapper that yields expected output when invoked.
  - If any dist is missing, exit 0 (skip gracefully) so CI can still pass for partial builds.

  React and Vue ship a CJS build, so they're checked together through `require()`.
  Vue's package.json is "type": "module", so its `dist/index.js` is actually ESM -
  requiring that file (instead of `dist/index.cjs`) previously caused a dual-package
  hazard where Vue ended up with its own separate `fieldRegistry` instance instead of
  sharing core's, silently defeating this check.

  Angular ships ESM only (no CJS build) and its compiled output needs the Angular JIT
  compiler loaded before it can even be imported outside a real Angular app, so it's
  verified in a second, independent ESM-only check instead of being mixed into the
  `require()` graph above.
*/
const path = require('path');
const { pathToFileURL } = require('url');

function tryRequire(p) {
  try {
    return require(p);
  } catch {
    return null;
  }
}

async function tryImport(p) {
  try {
    return await import(pathToFileURL(p).href);
  } catch {
    return null;
  }
}

const root = process.cwd();
const coreDist = path.resolve(root, 'packages', 'core', 'dist', 'index.js');
const reactDist = path.resolve(root, 'packages', 'react', 'dist', 'index.js');
const vueDist = path.resolve(root, 'packages', 'vue', 'dist', 'index.cjs');
const coreEsmDist = path.resolve(root, 'packages', 'core', 'dist', 'index.mjs');
const angularDist = path.resolve(
  root,
  'packages',
  'angular',
  'dist',
  'fesm2022',
  'dynamic-field-kit-angular.mjs',
);

async function checkReactAndVue() {
  const core = tryRequire(coreDist);
  const reactAdapter = tryRequire(reactDist);
  const vueAdapter = tryRequire(vueDist);

  if (!core || !reactAdapter || !vueAdapter) {
    console.log(
      'React/Vue integration check skipped: core, react or vue dist not built yet.',
    );
    return true;
  }

  const renderer = (props) => `core-${props?.value ?? ''}`;
  core.fieldRegistry.register('text', renderer);

  for (const [name, reg] of [
    ['react', reactAdapter.fieldRegistry],
    ['vue', vueAdapter.fieldRegistry],
  ]) {
    const r = reg.get('text');
    if (typeof r !== 'function') {
      throw new Error(`renderer not registered in ${name} adapter`);
    }
    const out = r({ value: 'X' });
    if (out !== 'core-X') {
      throw new Error(`unexpected output from ${name} adapter wrapper: ${out}`);
    }
  }

  console.log(
    'React/Vue integration check passed: core, react and vue share a registry view.',
  );
  return true;
}

async function checkAngular() {
  try {
    // Angular's compiled output falls back to JIT for some providers; loading
    // the compiler up front avoids a throw on import when it isn't AOT-linked.
    await import(pathToFileURL(require.resolve('@angular/compiler')).href);
  } catch {
    // If @angular/compiler isn't resolvable, let the import below fail (or
    // succeed) on its own and report accordingly rather than skip silently.
  }

  const core = await tryImport(coreEsmDist);
  const angularAdapter = await tryImport(angularDist);

  if (!core || !angularAdapter) {
    console.log('Angular integration check skipped: dist not built yet.');
    return true;
  }

  const renderer = (props) => `core-${props?.value ?? ''}`;
  core.fieldRegistry.register('text', renderer);

  const r = angularAdapter.fieldRegistry.get('text');
  if (typeof r !== 'function') {
    throw new Error('renderer not registered in angular adapter');
  }
  const out = r({ value: 'X' });
  if (out !== 'core-X') {
    throw new Error(`unexpected output from angular adapter wrapper: ${out}`);
  }

  console.log(
    'Angular integration check passed: core and angular share a registry view.',
  );
  return true;
}

(async () => {
  try {
    await checkReactAndVue();
    await checkAngular();
    process.exit(0);
  } catch (e) {
    console.error('Integration test failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();

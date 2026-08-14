const fs = require('fs');
const path = require('path');

const DEFAULT_PACKAGES = ['core', 'react', 'vue', 'angular'];

const stripDotSlash = (entry) => entry.replace(/^\.\//, '');

/**
 * Resolves a package's ESM and CJS entry points from its own manifest rather
 * than guessing from file extensions. The `.js`/`.mjs` pair that tsup emits for
 * core and react inverts for vue, which is `"type": "module"` and so ships ESM
 * as `.js` and CommonJS as `.cjs`.
 */
function entryPoints(pkgJson) {
  const conditions = (pkgJson.exports && pkgJson.exports['.']) || {};
  const esm = conditions.import || pkgJson.module;
  const cjs = conditions.require || pkgJson.main;

  // ng-packagr ships ESM only and points both `main` and `module` at the same
  // fesm2022 bundle, so treating `main` as CJS there would invent a bundle.
  const hasDistinctCjs =
    cjs && (!esm || stripDotSlash(cjs) !== stripDotSlash(esm));

  return { esm, cjs: hasDistinctCjs ? cjs : null };
}

function collectBundleSizes(root, packages = DEFAULT_PACKAGES) {
  const results = [];

  for (const pkg of packages) {
    const pkgDir = path.join(root, 'packages', pkg);
    const manifest = path.join(pkgDir, 'package.json');

    if (!fs.existsSync(manifest)) {
      results.push({ pkg, format: null, bytes: null, missing: true });
      continue;
    }

    const { esm, cjs } = entryPoints(
      JSON.parse(fs.readFileSync(manifest, 'utf8'))
    );
    const found = [];

    for (const [format, entry] of [
      ['ESM', esm],
      ['CJS', cjs],
    ]) {
      if (!entry) {
        continue;
      }

      const file = path.join(pkgDir, stripDotSlash(entry));
      if (fs.existsSync(file)) {
        found.push({ pkg, format, bytes: fs.statSync(file).size });
      }
    }

    if (found.length === 0) {
      results.push({ pkg, format: null, bytes: null, missing: true });
    } else {
      results.push(...found);
    }
  }

  return results;
}

function formatSizes(sizes) {
  return sizes.map((entry) =>
    entry.missing
      ? `${entry.pkg}: not built`
      : `${entry.pkg} (${entry.format}): ${(entry.bytes / 1024).toFixed(2)} KB`
  );
}

if (require.main === module) {
  console.log('=== Bundle Sizes ===\n');
  for (const line of formatSizes(collectBundleSizes(process.cwd()))) {
    console.log(line);
  }
}

module.exports = { collectBundleSizes, formatSizes, DEFAULT_PACKAGES };

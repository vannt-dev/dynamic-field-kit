#!/usr/bin/env node
/**
 * Rewrites extensionless relative specifiers in emitted `.d.ts` files to the
 * explicit `./x.js` / `./x/index.js` form.
 *
 * The angular package's entry point is a `.mjs` bundle, so TypeScript reads its
 * declarations in ESM mode under `moduleResolution: node16` or `nodenext` - and
 * there an extensionless relative import is error TS2834, "Relative import
 * paths need explicit file extensions". A consumer on node16 resolution cannot
 * import the package at all: the failure is in `dist/index.d.ts`, the very
 * first file they reach.
 *
 * Fixing the source imports is not enough. ng-packagr writes `dist/index.d.ts`
 * itself - it is stamped "Generated bundle index. Do not edit." - and always
 * emits `export * from './public-api'`, extensionless. So the extensions have
 * to be added to the build output, as a `postbuild` step.
 *
 * The `.js` target is deliberate even though only `.d.ts` files exist next to
 * it: in an ESM declaration file TypeScript expects the specifier the runtime
 * would use, and maps `./x.js` back to `./x.d.ts` itself.
 *
 * A specifier is only rewritten when its target is on disk, so a directory
 * import becomes `./layout/index.js` rather than the broken `./layout.js`.
 * Anything unresolvable is left untouched and reported, because a silent
 * rewrite to a path that does not exist would trade one resolution error for
 * a harder-to-read one.
 *
 * Since ng-packagr 21 this rewrites nothing: it emits one rolled-up
 * `dist/types/<name>.d.ts` with no relative specifiers left to fix, so the
 * step reports "0 relative specifiers" and `arethetypeswrong` is green on
 * node16 without it. It stays as the guard it was written to be - the emit
 * shape is ng-packagr's to change back, and TS2834 is silent until a consumer
 * on node16 resolution hits it. `scripts/verify-package-entrypoints.js` and
 * the attw check before a release are what would catch a regression.
 *
 * Usage: node scripts/add-dts-extensions.js <dir> [...more dirs]
 * Paths are resolved against the caller's cwd, so a package can pass `dist`.
 */
const fs = require('fs');
const path = require('path');

// `from '...'`, `import('...')` and the bare `import '...'` side-effect form.
const SPECIFIER =
  /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.\.?\/[^'"]*)\2/g;

const DECLARATION = /\.d\.(ts|mts|cts)$/;
// Extensions a specifier may already carry; these are left alone.
const HAS_EXTENSION = /\.(m?js|cjs|json|css|node)$/;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

/**
 * Resolves a relative specifier against the directory holding the file that
 * declared it, and returns the specifier a node16 consumer needs - or null when
 * nothing on disk matches.
 */
function resolveSpecifier(fromDir, specifier) {
  const target = path.resolve(fromDir, specifier);
  for (const ext of ['.d.ts', '.d.mts', '.d.cts']) {
    if (fs.existsSync(target + ext)) {
      return `${specifier}.js`;
    }
  }
  for (const ext of ['.d.ts', '.d.mts', '.d.cts']) {
    if (fs.existsSync(path.join(target, `index${ext}`))) {
      return `${specifier.replace(/\/$/, '')}/index.js`;
    }
  }
  return null;
}

function addExtensions(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`${dir} does not exist - run the build first`);
  }

  let rewritten = 0;
  const unresolved = [];

  for (const file of walk(dir).filter((f) => DECLARATION.test(f))) {
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(
      SPECIFIER,
      (match, keyword, quote, specifier) => {
        if (HAS_EXTENSION.test(specifier)) {
          return match;
        }
        const resolved = resolveSpecifier(path.dirname(file), specifier);
        if (!resolved) {
          unresolved.push({ file, specifier });
          return match;
        }
        rewritten += 1;
        return `${keyword}${quote}${resolved}${quote}`;
      },
    );
    if (after !== before) {
      fs.writeFileSync(file, after);
    }
  }

  return { rewritten, unresolved };
}

function main(argv) {
  const dirs = argv.length ? argv : ['dist'];
  let rewritten = 0;
  const unresolved = [];
  for (const dir of dirs) {
    const r = addExtensions(path.resolve(process.cwd(), dir));
    rewritten += r.rewritten;
    unresolved.push(...r.unresolved);
  }

  for (const { file, specifier } of unresolved) {
    console.warn(`could not resolve '${specifier}' from ${file} - left as is`);
  }
  console.log(
    `added .js to ${rewritten} relative specifier${rewritten === 1 ? '' : 's'} in ${dirs.join(', ')}`,
  );
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { addExtensions, resolveSpecifier, SPECIFIER };

#!/usr/bin/env node
/**
 * Proves the Angular majors `@dynamic-field-kit/angular` claims in its
 * `peerDependencies` actually work.
 *
 * The suite only ever runs against the one Angular the workspace installs, so
 * the declared floor is never exercised - and the floor is what silently rots.
 * The package declared `>=14` long after it started importing `signal` and
 * `computed`, which do not exist before Angular 16: an install on 14 or 15
 * resolved fine and then failed on import.
 *
 * A render is out of reach here (the published fesm2022 needs the CLI's linker
 * or JIT to instantiate components), so this checks the level that actually
 * breaks across majors: the package imports under that Angular, its decorated
 * classes evaluate, and it shares one registry with core. That is the same
 * depth as scripts/integration-cross-registry.js, run once per range end.
 *
 * It then runs the floor's own Angular linker over the published fesm2022
 * bundle. That is the check that would catch the real cross-major hazard: the
 * bundle ships partial declarations, and if building on a newer Angular raised
 * their `minVersion`, every consumer below that version would fail in the
 * linker while installing and importing perfectly well.
 *
 * Run from the repo root, after `npm run build`:
 *   node scripts/verify-angular-peer-range.js
 */
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = path.resolve(__dirname, '..');

// Kept in sync by hand with packages/angular/package.json
// `peerDependencies['@angular/core']`: the declared floor, and the newest major
// the range admits. A range end missing here is the gap this script closes.
const MAJORS = ['16', '21'];

const quote = (a) => (/[\s"]/.test(a) ? '"' + a.replace(/"/g, '\\"') + '"' : a);

const npm = (args, cwd) =>
  execSync(['npm', ...args.map(quote)].join(' '), {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });

const node = (args, cwd) =>
  execFileSync(process.execPath, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });

function pack(pkgDir, outDir) {
  const out = npm(['pack', '--pack-destination', outDir], pkgDir).trim();
  return path.join(outDir, out.split('\n').pop().trim());
}

const APP = `
import 'zone.js';
// Angular's compiled output falls back to JIT for some providers; loading the
// compiler up front avoids a throw on import when it is not AOT-linked.
import '@angular/compiler';
import { VERSION } from '@angular/core';
import { fieldRegistry as coreRegistry } from '@dynamic-field-kit/core';
import {
  fieldRegistry,
  MultiFieldInput,
  createDynamicFormStore,
  collectFieldPaths,
} from '@dynamic-field-kit/angular';

const failures = [];

coreRegistry.register('text', (props) => 'core-' + (props?.value ?? ''));
const renderer = fieldRegistry.get('text');
if (typeof renderer !== 'function') {
  failures.push('core and angular do not share a registry');
} else if (renderer({ value: 'X' }) !== 'core-X') {
  failures.push('registry wrapper returned the wrong value');
}

if (typeof MultiFieldInput !== 'function') {
  failures.push('MultiFieldInput did not evaluate as a class');
}

// The store is where the signal APIs live - the reason the floor is 16.
const store = createDynamicFormStore({
  fields: [{ name: 'a', type: 'text', validate: (v) => (v ? undefined : 'Required') }],
  initialValues: { a: '' },
});
if (store.validationStatus() !== 'invalid') {
  failures.push('store did not compute a validation status: ' + store.validationStatus());
}
if (collectFieldPaths([{ name: 'a', type: 'text' }], {}).length !== 1) {
  failures.push('re-exported core helper did not work');
}

if (failures.length) {
  throw new Error(failures.join('; '));
}
console.log('angular ' + VERSION.full + ' imported and shares one registry');
`;

function verify(major, tarballs, tmpRoot) {
  const dir = fs.mkdtempSync(path.join(tmpRoot, `ng-${major}-`));
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(
      { name: 'consumer', version: '0.0.0', private: true, type: 'module' },
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(dir, 'app.mjs'), APP);

  npm(
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      `@angular/core@^${major}`,
      `@angular/common@^${major}`,
      `@angular/compiler@^${major}`,
      'rxjs@^7.8.0',
      'zone.js',
      ...tarballs,
    ],
    dir,
  );

  const installed = require(
    path.join(dir, 'node_modules', '@angular', 'core', 'package.json'),
  ).version;
  if (!installed.startsWith(`${major}.`)) {
    throw new Error(`asked for @angular/core ^${major}, got ${installed}`);
  }

  const out = node(['app.mjs'], dir).trim();
  console.log(`  ${out}`);
  return installed;
}

const LINK = `
const fs = require('fs');
const babel = require('@babel/core');
const { createEs2015LinkerPlugin } = require('@angular/compiler-cli/linker/babel');
const { NodeJSFileSystem, ConsoleLogger, LogLevel } = require('@angular/compiler-cli');

const file = process.argv[2];
const out = babel.transformSync(fs.readFileSync(file, 'utf8'), {
  filename: file,
  configFile: false,
  babelrc: false,
  compact: false,
  plugins: [
    createEs2015LinkerPlugin({
      fileSystem: new NodeJSFileSystem(),
      logger: new ConsoleLogger(LogLevel.warn),
      linkerJitMode: false,
    }),
  ],
});

const leftover = (out.code.match(/ɵɵngDeclare/g) || []).length;
if (leftover > 0) {
  throw new Error(leftover + ' partial declarations were left unlinked');
}
console.log(
  'linker ' +
    require('@angular/compiler-cli/package.json').version +
    ' linked the published bundle, 0 partial declarations left',
);
`;

/**
 * Links the published bundle with the *floor* Angular's linker. A consumer app
 * runs this as part of its own build, and it is the step that fails when a
 * library was compiled by a compiler too new for it.
 */
function verifyLinker(major, tmpRoot) {
  const dir = fs.mkdtempSync(path.join(tmpRoot, `link-${major}-`));
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(
      { name: 'linker', version: '0.0.0', private: true },
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(dir, 'link.cjs'), LINK);

  npm(
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      `@angular/compiler-cli@^${major}`,
      `@angular/compiler@^${major}`,
      '@babel/core',
    ],
    dir,
  );

  // The bundle straight off disk, not through an install: the linker only
  // reads the file, and installing the tarball here would drag in the whole
  // peer set for no benefit.
  const bundle = path.join(
    REPO,
    'packages',
    'angular',
    'dist',
    'fesm2022',
    'dynamic-field-kit-angular.mjs',
  );
  const out = node(['link.cjs', bundle], dir).trim();
  console.log(`  ${out}`);
}

function main() {
  for (const p of ['core', 'angular']) {
    const dist = path.join(REPO, 'packages', p, 'dist');
    if (!fs.existsSync(dist)) {
      console.error(
        `packages/${p}/dist is missing - run \`npm run build\` first.`,
      );
      process.exit(1);
    }
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dfk-ng-peer-'));
  try {
    const tarballs = [
      pack(path.join(REPO, 'packages', 'core'), tmpRoot),
      pack(path.join(REPO, 'packages', 'angular'), tmpRoot),
    ];

    for (const major of MAJORS) {
      console.log(`@angular/core ^${major}:`);
      verify(major, tarballs, tmpRoot);
    }

    // Only the floor: a newer linker accepting an older declaration is the
    // direction that has never been in doubt.
    console.log(`@angular/compiler-cli ^${MAJORS[0]} linking the bundle:`);
    verifyLinker(MAJORS[0], tmpRoot);

    console.log(
      `OK: @dynamic-field-kit/angular loads at both ends of its declared Angular range (${MAJORS.join(', ')}).`,
    );
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main();

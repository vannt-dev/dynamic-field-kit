#!/usr/bin/env node
/**
 * Proves the React major versions `@dynamic-field-kit/react` claims in its
 * `peerDependencies` actually work.
 *
 * The package suite only ever runs against whatever React the workspace has
 * installed, which is 19. React 18 is half of the declared range and was never
 * exercised. Testing it inside the workspace does not work: npm hoists one copy
 * of React to the root and leaves another nested, and the render then fails with
 * "A React Element from an older version of React was rendered" - an artifact of
 * the install layout, not a real incompatibility.
 *
 * So this does what a consumer does. It packs core and react into tarballs,
 * installs them into a throwaway project outside the workspace alongside one
 * exact React major, and server-renders a form. renderToString is deliberate:
 * it needs no jsdom, and it is the one render path whose API is identical on 18
 * and 19.
 *
 * Run from the repo root, after `npm run build`:
 *   node scripts/verify-react-peer-range.js
 */
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = path.resolve(__dirname, '..');

// Kept in sync by hand with packages/react/package.json `peerDependencies.react`.
// A major listed there and missing here is the gap this script exists to close.
const MAJORS = ['18', '19'];

// npm is a .cmd shim on Windows, which node 24 refuses to spawn without a
// shell, and passing an argv array *with* a shell only concatenates it. So npm
// gets one quoted command line, and node - a real executable - gets an argv.
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

// A form with one registered renderer and one default renderer, so the render
// covers both the registry path and the built-in fallback.
const APP = `
const React = require('react');
const { renderToString } = require('react-dom/server');
const { fieldRegistry } = require('@dynamic-field-kit/core');
const { DynamicInput } = require('@dynamic-field-kit/react');

fieldRegistry.register('custom', (props) =>
  React.createElement('input', { 'data-custom': '1', readOnly: true, value: String(props.value ?? '') })
);

const html = renderToString(
  React.createElement(
    'form',
    null,
    React.createElement(DynamicInput, { type: 'custom', name: 'a', value: 'x', onChange: () => {} }),
    React.createElement(DynamicInput, { type: 'text', name: 'b', value: 'y', onChange: () => {} })
  )
);

const failures = [];
if (!html.includes('data-custom="1"')) failures.push('registered renderer did not render');
if (!html.includes('value="x"')) failures.push('registered renderer lost its value');
if (!html.includes('value="y"')) failures.push('default text renderer lost its value');
if (failures.length) {
  console.error(html);
  throw new Error(failures.join('; '));
}
console.log('react ' + React.version + ' rendered: ' + html.length + ' chars');
`;

function verify(major, tarballs, tmpRoot) {
  const dir = fs.mkdtempSync(path.join(tmpRoot, `react-${major}-`));
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(
      { name: 'consumer', version: '0.0.0', private: true },
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(dir, 'app.cjs'), APP);

  npm(
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      `react@^${major}`,
      `react-dom@^${major}`,
      ...tarballs,
    ],
    dir,
  );

  const installed = require(
    path.join(dir, 'node_modules', 'react', 'package.json'),
  ).version;
  if (!installed.startsWith(`${major}.`)) {
    throw new Error(`asked for react ^${major}, got ${installed}`);
  }

  const out = node(['app.cjs'], dir).trim();
  console.log(`  ${out}`);
  return installed;
}

function main() {
  for (const p of ['core', 'react']) {
    const dist = path.join(REPO, 'packages', p, 'dist');
    if (!fs.existsSync(dist)) {
      console.error(
        `packages/${p}/dist is missing - run \`npm run build\` first.`,
      );
      process.exit(1);
    }
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dfk-peer-'));
  try {
    const tarballs = [
      pack(path.join(REPO, 'packages', 'core'), tmpRoot),
      pack(path.join(REPO, 'packages', 'react'), tmpRoot),
    ];

    for (const major of MAJORS) {
      console.log(`react ^${major}:`);
      verify(major, tarballs, tmpRoot);
    }

    console.log(
      `OK: @dynamic-field-kit/react renders under every React major it declares (${MAJORS.join(', ')}).`,
    );
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main();

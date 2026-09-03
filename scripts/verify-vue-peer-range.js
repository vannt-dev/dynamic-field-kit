#!/usr/bin/env node
/**
 * Proves the Vue versions `@dynamic-field-kit/vue` claims in its
 * `peerDependencies` actually work.
 *
 * The suite only ever runs against whatever Vue the workspace installs, which
 * is the newest 3.x. The declared floor is never exercised there, and the floor
 * is the half that breaks: the composable calls `getCurrentScope` /
 * `onScopeDispose`, which did not exist before Vue 3.2.
 *
 * So this does what a consumer does. It packs core and vue into tarballs,
 * installs them into a throwaway project outside the workspace alongside one
 * exact Vue minor, and server-renders a form with `@vue/server-renderer` -
 * no jsdom, and the same API on every 3.x.
 *
 * Run from the repo root, after `npm run build`:
 *   node scripts/verify-vue-peer-range.js
 */
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = path.resolve(__dirname, '..');

// Kept in sync by hand with packages/vue/package.json `peerDependencies.vue`:
// the declared floor, and the newest 3.x. A range end missing here is the gap
// this script exists to close.
const VERSIONS = ['3.2', 'latest'];

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
// covers both the registry path and the built-in fallback. The composable is
// exercised inside an effect scope, which is what pulls in the 3.2-only
// scope API the floor exists to guarantee.
const APP = `
const { createSSRApp, defineComponent, effectScope, h } = require('vue');
const { renderToString } = require('@vue/server-renderer');
const { fieldRegistry } = require('@dynamic-field-kit/core');
const { DynamicInput, useDynamicForm } = require('@dynamic-field-kit/vue');

fieldRegistry.register(
  'custom',
  defineComponent({
    props: { value: null },
    setup: (props) => () =>
      h('input', { 'data-custom': '1', value: String(props.value ?? '') }),
  }),
);

const scope = effectScope();
const form = scope.run(() =>
  useDynamicForm({
    fields: [{ name: 'a', type: 'custom' }],
    initialValues: { a: 'x' },
  }),
);

const App = defineComponent({
  setup: () => () =>
    h('form', null, [
      h(DynamicInput, { type: 'custom', name: 'a', value: 'x' }),
      h(DynamicInput, { type: 'text', name: 'b', value: 'y' }),
    ]),
});

renderToString(createSSRApp(App)).then((html) => {
  const failures = [];
  if (!html.includes('data-custom="1"'))
    failures.push('registered renderer did not render');
  if (!html.includes('value="x"'))
    failures.push('registered renderer lost its value');
  if (!html.includes('value="y"'))
    failures.push('default text renderer lost its value');
  if (typeof form.validationStatus.value !== 'string')
    failures.push('useDynamicForm did not expose validationStatus');

  // The reason the floor is 3.2: disposing the scope must reach the
  // composable's onScopeDispose without throwing.
  scope.stop();

  if (failures.length) {
    console.error(html);
    throw new Error(failures.join('; '));
  }
  console.log(
    'vue ' + require('vue/package.json').version + ' rendered: ' + html.length + ' chars',
  );
});
`;

function verify(version, tarballs, tmpRoot) {
  const dir = fs.mkdtempSync(path.join(tmpRoot, `vue-${version}-`));
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(
      { name: 'consumer', version: '0.0.0', private: true },
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(dir, 'app.cjs'), APP);

  const spec = version === 'latest' ? 'vue@latest' : `vue@~${version}`;
  const rendererSpec =
    version === 'latest'
      ? '@vue/server-renderer@latest'
      : `@vue/server-renderer@~${version}`;

  npm(
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      spec,
      rendererSpec,
      ...tarballs,
    ],
    dir,
  );

  const installed = require(
    path.join(dir, 'node_modules', 'vue', 'package.json'),
  ).version;
  if (version !== 'latest' && !installed.startsWith(`${version}.`)) {
    throw new Error(`asked for vue ~${version}, got ${installed}`);
  }

  const out = node(['app.cjs'], dir).trim();
  console.log(`  ${out}`);
  return installed;
}

function main() {
  for (const p of ['core', 'vue']) {
    const dist = path.join(REPO, 'packages', p, 'dist');
    if (!fs.existsSync(dist)) {
      console.error(
        `packages/${p}/dist is missing - run \`npm run build\` first.`,
      );
      process.exit(1);
    }
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dfk-vue-peer-'));
  try {
    const tarballs = [
      pack(path.join(REPO, 'packages', 'core'), tmpRoot),
      pack(path.join(REPO, 'packages', 'vue'), tmpRoot),
    ];

    for (const version of VERSIONS) {
      console.log(`vue ${version}:`);
      verify(version, tarballs, tmpRoot);
    }

    console.log(
      `OK: @dynamic-field-kit/vue renders at both ends of its declared Vue range (${VERSIONS.join(', ')}).`,
    );
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main();

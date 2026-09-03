#!/usr/bin/env node
// Lint check: every adapter must forward the whole FieldRendererProps contract.
//
// core/src/rendererProps.ts owns the list (FIELD_RENDERER_PROP_KEYS) and
// buildFieldRendererProps produces it, but each adapter still has to carry the
// keys across its own component boundary: React through DynamicInput's Props
// interface, Vue through its declared `props` (an undeclared key becomes a
// fallthrough attribute, not a prop) and its forwarding call, Angular through
// KNOWN_PROPS plus a matching @Input on BaseInputComponent.
//
// Those three lists silently drifted apart before 1.6: React dropped
// `placeholder`, `min`, `max`, `step`, `accept` and `multiple`; Vue dropped
// `required`, `id`, `dirty` and the aria flags; Angular dropped `touched`,
// `dirty`, `id` and the aria flags, leaving Angular renderers with no way to
// know whether a field had been touched. This check fails the build instead.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Vue's name for `className`. Forwarding `className` as well is not an option:
 * a renderer that does not declare it lets the key fall through to its root
 * element, where Vue assigns `el.className` - an undefined value becomes `''`
 * and wipes the class the renderer set on itself.
 */
const VUE_ALIASES = { className: 'class' };

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Returns the brace-balanced block that starts at the first `{` after `marker`. */
function blockAfter(src, marker) {
  const start = src.indexOf(marker);
  if (start === -1) {
    throw new Error(`could not find ${JSON.stringify(marker)}`);
  }
  const open = src.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') {
      depth += 1;
    } else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return src.slice(open, i + 1);
      }
    }
  }
  throw new Error(`unbalanced braces after ${JSON.stringify(marker)}`);
}

/** The contract itself, parsed from the `as const` array in core. */
function contractKeys() {
  const src = read('packages/core/src/rendererProps.ts');
  const arr = src.slice(
    src.indexOf('FIELD_RENDERER_PROP_KEYS'),
    src.indexOf('] as const'),
  );
  const keys = [...arr.matchAll(/'([a-zA-Z]+)'/g)].map((m) => m[1]);
  if (keys.length === 0) {
    throw new Error('FIELD_RENDERER_PROP_KEYS parsed as empty');
  }
  return keys;
}

/** Adapter name -> list of { what, has(key) } probes the key must satisfy. */
function probes() {
  const reactProps = blockAfter(
    read('packages/react/src/components/DynamicInput.tsx'),
    'interface Props<T extends FieldTypeKey>',
  );

  const vueSrc = read('packages/vue/src/components/DynamicInput.ts');
  const vueDeclared = blockAfter(vueSrc, '  props: {');
  const vueForwarded = blockAfter(vueSrc, 'h(Renderer.value, ');

  const angularSrc = read('packages/angular/src/components/DynamicInput.ts');
  const angularKnown = angularSrc.slice(
    angularSrc.indexOf('const KNOWN_PROPS'),
    angularSrc.indexOf('] as const'),
  );
  const angularBase = read('packages/angular/src/components/BaseInput.ts');

  const vueName = (key) => VUE_ALIASES[key] ?? key;

  return {
    react: [
      {
        what: 'DynamicInput Props interface',
        has: (key) => new RegExp(`\\b${key}\\?:`).test(reactProps),
      },
    ],
    vue: [
      {
        what: 'DynamicInput declared props',
        has: (key) =>
          new RegExp(`\\b${vueName(key)}: \\{`).test(vueDeclared) ||
          // `class` is not declarable as a Vue prop name here; it is forwarded
          // from the declared `className` prop instead.
          (VUE_ALIASES[key] && new RegExp(`\\b${key}: \\{`).test(vueDeclared)),
      },
      {
        what: 'DynamicInput renderer forwarding',
        has: (key) =>
          new RegExp(`\\b${vueName(key)}: props\\.`).test(vueForwarded),
      },
    ],
    angular: [
      {
        what: 'DynamicInput KNOWN_PROPS',
        has: (key) => angularKnown.includes(`'${key}'`),
      },
      {
        what: 'BaseInputComponent @Input',
        has: (key) =>
          new RegExp(`@Input\\(\\) ${key}\\??[?:]`).test(angularBase),
      },
    ],
  };
}

function run() {
  const keys = contractKeys();
  const all = probes();
  const failures = [];

  for (const [adapter, checks] of Object.entries(all)) {
    for (const key of keys) {
      for (const check of checks) {
        if (!check.has(key)) {
          failures.push(`${adapter}: '${key}' missing from ${check.what}`);
        }
      }
    }
  }

  return { keys, failures };
}

module.exports = { run, contractKeys };

if (require.main === module) {
  const { keys, failures } = run();
  if (failures.length > 0) {
    console.error(
      'Renderer prop contract not honoured by every adapter:\n' +
        failures.map((f) => `  - ${f}`).join('\n') +
        '\n\nSee packages/core/src/rendererProps.ts for the contract.',
    );
    process.exit(1);
  }
  console.log(
    `Renderer prop parity OK: ${keys.length} props forwarded by react, vue and angular.`,
  );
}

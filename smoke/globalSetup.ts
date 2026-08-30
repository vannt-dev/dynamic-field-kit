import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Runs once before any smoke test file loads. A static `import` from a package
// whose dist is missing would otherwise fail with an opaque resolution stack;
// this turns it into a readable "build first" error.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const requiredArtifacts = [
  'packages/core/dist/index.js',
  'packages/react/dist/index.mjs',
  'packages/vue/dist/index.js',
];

export default function globalSetup(): void {
  const missing = requiredArtifacts.filter(
    (rel) => !existsSync(resolve(repoRoot, rel)),
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing build artifact(s): ${missing.join(', ')}. ` +
        `Run "npm run build" (all packages) before the smoke tests.`,
    );
  }
}

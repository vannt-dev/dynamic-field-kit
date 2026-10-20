import { fileURLToPath } from 'node:url';

const fromHere = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

/**
 * Resolves the packages to their source, so the stories show what is on this
 * branch without building the packages first. Shared by Storybook and the
 * story tests.
 */
export const packageAliases = {
  '@dynamic-field-kit/core': fromHere('../packages/core/src/index.ts'),
  '@dynamic-field-kit/react': fromHere('../packages/react/src/index.ts'),
};

/**
 * The React package's source sits outside this folder, and a bare `react`
 * import from there would find the root install's copy. Two Reacts break
 * hooks, so both resolve from here.
 */
export const dedupe = ['react', 'react-dom'];

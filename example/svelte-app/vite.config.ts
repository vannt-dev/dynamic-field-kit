import path from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  // Set by the Pages workflow to '/dynamic-field-kit/svelte/'. Defaults to '/'
  // so `vite dev` and a plain `vite build` are unaffected.
  base: process.env.PAGES_BASE_PATH || '/',
  plugins: [svelte()],
  // The demos import example/shared (styles and translations).
  server: { fs: { allow: ['..'] } },
  resolve: {
    alias: {
      '@dynamic-field-kit/core': path.resolve(
        __dirname,
        '../../packages/core/dist/index.mjs',
      ),
      '@dynamic-field-kit/svelte': path.resolve(
        __dirname,
        '../../packages/svelte/dist/index.js',
      ),
    },
    // The adapter is read from the workspace, where its own `svelte` import
    // would resolve to the workspace's copy. Two copies of Svelte in one page
    // do not share context or reactivity, so there has to be one.
    dedupe: ['svelte'],
  },
});

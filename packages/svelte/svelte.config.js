import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
export default {
  // Only what `lang="ts"` needs; the components use no other preprocessing.
  preprocess: vitePreprocess({ script: true }),
};

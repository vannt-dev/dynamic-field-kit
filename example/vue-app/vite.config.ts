import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig({
  // Set by the Pages workflow to '/dynamic-field-kit/vue/'. Defaults to '/' so
  // `vite dev` and a plain `vite build` are unaffected.
  base: process.env.PAGES_BASE_PATH || '/',
  plugins: [vue()],
  // The demos import example/shared (styles and translations).
  server: { fs: { allow: ['..'] } },
  resolve: {
    alias: {
      '@dynamic-field-kit/core': path.resolve(
        __dirname,
        '../../packages/core/dist/index.mjs',
      ),
      '@dynamic-field-kit/vue': path.resolve(
        __dirname,
        '../../packages/vue/dist/index.js',
      ),
    },
  },
});

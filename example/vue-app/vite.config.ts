import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@dynamic-field-kit/core': path.resolve(
        __dirname,
        '../../packages/core/dist/index.mjs'
      ),
      '@dynamic-field-kit/vue': path.resolve(
        __dirname,
        '../../packages/vue/dist/index.mjs'
      ),
    },
  },
});

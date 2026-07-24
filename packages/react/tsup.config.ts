import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  // QUAN TRỌNG
  external: ['react', 'react/jsx-runtime', '@dynamic-field-kit/core'],
});

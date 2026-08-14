import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  // Sourcemaps are not published: tsup inlines the full TS source via
  // sourcesContent, which made the maps ~48% of the tarball (core: 75.7 KB of
  // 157 KB unpacked) on every consumer install. Flip back to `sourcemap: true`
  // if stepping into the library source is worth that.
  sourcemap: false,
  // QUAN TRỌNG
  external: ['react', 'react/jsx-runtime', '@dynamic-field-kit/core'],
});

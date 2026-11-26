import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  dts: { entry: 'src/index.ts' },
  clean: true,
  sourcemap: false,
});

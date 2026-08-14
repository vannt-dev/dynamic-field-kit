import { defineConfig } from 'vitest/config';

// Root-level suite for the repo's own build/CI scripts in `scripts/`. The four
// packages each run their own vitest with their own config and coverage floor;
// this one deliberately covers nothing but `scripts/**`.
export default defineConfig({
  test: {
    include: ['scripts/**/*.test.js'],
    environment: 'node',
  },
});

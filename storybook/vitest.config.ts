import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { dedupe, packageAliases } from './vite.shared.ts';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { ...packageAliases }, dedupe },
  test: {
    include: ['test/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
  },
});

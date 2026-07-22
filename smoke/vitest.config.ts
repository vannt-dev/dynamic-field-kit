import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    globalSetup: ['./globalSetup.ts'],
    include: ['*.smoke.test.{ts,tsx}'],
  },
});

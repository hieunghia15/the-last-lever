import { defineConfig } from 'vitest/config';

// BASE_PATH lets the static build live under a sub-path on the VPS later, e.g. BASE_PATH=/lever/.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});

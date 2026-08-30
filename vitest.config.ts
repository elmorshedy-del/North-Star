import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts', 'apps/**/*.test.tsx'],
    // Remains true only while the core is unimplemented. Packet P1 flips this to
    // false: after that, a workspace with no tests is a defect, not a pass.
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**/*.ts'],
      // Contracts are types only — no runtime to cover.
      exclude: ['**/*.contract.ts', '**/*.port.ts', '**/index.ts'],
      reporter: ['text', 'lcov'],
      // The core is pure functions with no I/O. There is no honest excuse for
      // leaving branches in it untested, and the invariant suites push this up
      // almost for free. Raise, never lower.
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});

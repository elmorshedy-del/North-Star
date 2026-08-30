import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

/**
 * Architecture enforcement.
 *
 * The three rules below are not style preferences — they are the architecture,
 * expressed in a form that fails the build. Prose in a README gets rationalised
 * around by whoever is in a hurry; a red pipeline does not. If you are reading
 * this because a rule fired, the rule is probably right. Escalate to the
 * architect rather than adding an eslint-disable: a disable comment here is a
 * silent architectural change, and is a review-rejection condition.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '.guardrail-tmp/**',
    ],
  },

  js.configs.recommended,

  // ---------------------------------------------------------------- TypeScript
  {
    files: ['packages/**/*.ts', 'apps/**/*.ts', 'apps/**/*.tsx'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // ------------------------------------------- RULE 1: the dependency rule
  // domain -> nothing. application -> domain. infrastructure -> both.
  // Dependencies point inward, always.
  {
    files: ['packages/core/src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['packages/core/src/**/*.ts'],
      'boundaries/elements': [
        { type: 'domain', pattern: 'packages/core/src/domain' },
        { type: 'application', pattern: 'packages/core/src/application' },
        { type: 'infrastructure', pattern: 'packages/core/src/infrastructure' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            'Dependency rule violation: {{file.type}} may not import {{dependency.type}}. ' +
            'Dependencies point inward only (domain <- application <- infrastructure).',
          policies: [
            {
              from: [{ element: { type: 'domain' } }],
              allow: [{ to: { element: { type: 'domain' } } }],
            },
            {
              from: [{ element: { type: 'application' } }],
              allow: [
                { to: { element: { type: 'domain' } } },
                { to: { element: { type: 'application' } } },
              ],
            },
            {
              from: [{ element: { type: 'infrastructure' } }],
              allow: [
                { to: { element: { type: 'domain' } } },
                { to: { element: { type: 'application' } } },
                { to: { element: { type: 'infrastructure' } } },
              ],
            },
          ],
        },
      ],

      // ------------------------------------ RULE 2: library containment
      // astronomy-engine exists behind EphemerisPort and nowhere else.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'astronomy-engine',
              message:
                'astronomy-engine may only be imported inside ' +
                'packages/core/src/infrastructure/ephemeris/. Depend on EphemerisPort instead.',
            },
          ],
        },
      ],

      // --------------------------------------- RULE 3: no ambient state
      // Position and time are injected via SkyContext and ClockPort. Core code
      // that reads a clock, a sensor or a random number is not reproducible,
      // and breaks voyage mode and every test that depends on determinism.
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message:
            'new Date() reads the ambient clock. Take an Instant as an argument, ' +
            'or obtain one from ClockPort at the app boundary. ' +
            'new Date(epochMs) with an explicit argument is fine.',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Date.now() reads the ambient clock. Use ClockPort at the app boundary.',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            'Math.random() makes core non-deterministic. Inject a seeded source if ' +
            'randomness is genuinely needed.',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'packages/core must not touch the DOM. Use a port.' },
        { name: 'document', message: 'packages/core must not touch the DOM. Use a port.' },
        { name: 'navigator', message: 'packages/core must not touch the platform. Use a port.' },
        { name: 'localStorage', message: 'Persistence belongs behind ProgressRepository.' },
      ],
    },
  },

  // The single sanctioned exception: the ephemeris adapter. This is the file the
  // containment rule exists to create — one place where the vendor library and
  // its Date-based API are allowed, and everything else stays clean.
  {
    files: ['packages/core/src/infrastructure/ephemeris/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  // Tests may reach anywhere and may build Dates freely.
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*.ts'],
    rules: {
      'boundaries/dependencies': 'off',
      'no-restricted-syntax': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // Node scripts and config files: no type-aware linting.
  {
    files: ['scripts/**/*.mjs', '*.config.js', 'eslint.config.js'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
    rules: { 'no-console': 'off' },
  },
);

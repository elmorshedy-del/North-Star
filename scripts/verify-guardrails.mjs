/**
 * Verifies that the architecture rules actually FIRE.
 *
 * A lint rule that silently does not work is worse than no rule at all: it buys
 * false confidence, and the architecture erodes underneath a green pipeline.
 * So this script writes deliberately illegal files, runs ESLint over them, and
 * asserts the expected rule reported an error on each — plus a positive control
 * that the one sanctioned exception is still allowed.
 *
 * Run in CI. If it fails, the guardrails are broken, whatever the lint job says.
 */

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';

const root = process.cwd();
const CORE = 'packages/core/src';

/** Each fixture: an illegal file, and the rule that must complain about it. */
const fixtures = [
  {
    name: 'domain may not import application',
    path: `${CORE}/domain/__guardrail_a.ts`,
    code: `import type { EphemerisPort } from '../application/ports/ephemeris.port.ts';\nexport type Leak = EphemerisPort;\n`,
    expectRule: 'boundaries/dependencies',
  },
  {
    name: 'application may not import infrastructure',
    path: `${CORE}/application/__guardrail_b.ts`,
    code: `import '../infrastructure/index.ts';\nexport const leak = 1;\n`,
    expectRule: 'boundaries/dependencies',
  },
  {
    name: 'astronomy-engine is contained to the ephemeris adapter',
    path: `${CORE}/application/__guardrail_c.ts`,
    code: `import { Body } from 'astronomy-engine';\nexport const leak = Body;\n`,
    expectRule: 'no-restricted-imports',
  },
  {
    name: 'core may not read the ambient clock via new Date()',
    path: `${CORE}/domain/__guardrail_d.ts`,
    code: `export const leak = (): number => new Date().getTime();\n`,
    expectRule: 'no-restricted-syntax',
  },
  {
    name: 'core may not read the ambient clock via Date.now()',
    path: `${CORE}/domain/__guardrail_e.ts`,
    code: `export const leak = (): number => Date.now();\n`,
    expectRule: 'no-restricted-syntax',
  },
  {
    name: 'core may not be non-deterministic via Math.random()',
    path: `${CORE}/domain/__guardrail_f.ts`,
    code: `export const leak = (): number => Math.random();\n`,
    expectRule: 'no-restricted-syntax',
  },
  {
    name: 'any is banned',
    path: `${CORE}/domain/__guardrail_g.ts`,
    code: `export const leak = (v: any): unknown => v;\n`,
    expectRule: '@typescript-eslint/no-explicit-any',
  },
  {
    name: 'non-null assertion is banned',
    path: `${CORE}/domain/__guardrail_h.ts`,
    code: `export const leak = (v: string | null): string => v!;\n`,
    expectRule: '@typescript-eslint/no-non-null-assertion',
  },
];

/** Positive control: the sanctioned exception must still be permitted. */
const control = {
  name: 'the ephemeris adapter MAY import astronomy-engine and build Dates',
  path: `${CORE}/infrastructure/ephemeris/__guardrail_control.ts`,
  code:
    `import { Body } from 'astronomy-engine';\n` +
    `export const ok = (): unknown => ({ body: Body.Sun, at: new Date() });\n`,
};

const all = [...fixtures, control];
const written = [];

function cleanup() {
  for (const p of written) {
    rmSync(join(root, p), { force: true });
  }
  const ephDir = join(root, `${CORE}/infrastructure/ephemeris`);
  if (existsSync(ephDir)) {
    try {
      rmSync(ephDir, { recursive: false });
    } catch {
      /* directory not empty — real code lives there now, leave it */
    }
  }
}

process.on('exit', cleanup);

for (const f of all) {
  mkdirSync(join(root, dirname(f.path)), { recursive: true });
  writeFileSync(join(root, f.path), f.code, 'utf8');
  written.push(f.path);
}

let raw;
try {
  raw = execFileSync(
    'npx',
    ['eslint', '--no-warn-ignored', '-f', 'json', ...all.map((f) => f.path)],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
} catch (error) {
  // ESLint exits non-zero when it reports errors, which is exactly what we want.
  raw = error.stdout ?? '';
}

if (raw.trim() === '') {
  console.error('GUARDRAIL CHECK FAILED: ESLint produced no output at all.');
  process.exit(1);
}

const results = JSON.parse(raw);
const byPath = new Map(results.map((r) => [r.filePath.replace(`${root}/`, ''), r]));

let failures = 0;

for (const f of fixtures) {
  const result = byPath.get(f.path);
  const rules = result ? result.messages.map((m) => m.ruleId) : [];
  if (rules.includes(f.expectRule)) {
    console.log(`  PASS  ${f.name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${f.name}`);
    console.error(`        expected rule ${f.expectRule}, got: ${rules.join(', ') || '(none)'}`);
  }
}

const controlResult = byPath.get(control.path);
const controlErrors = controlResult
  ? controlResult.messages.filter((m) => m.severity === 2)
  : [];
if (controlErrors.length === 0) {
  console.log(`  PASS  ${control.name}`);
} else {
  failures += 1;
  console.error(`  FAIL  ${control.name}`);
  for (const m of controlErrors) {
    console.error(`        unexpected ${m.ruleId ?? 'error'}: ${m.message}`);
  }
}

if (failures > 0) {
  console.error(`\nGUARDRAIL CHECK FAILED: ${failures} of ${all.length} checks did not hold.`);
  console.error('The architecture rules are not protecting the codebase. Fix eslint.config.js.');
  process.exit(1);
}

console.log(`\nAll ${all.length} architecture guardrails verified.`);

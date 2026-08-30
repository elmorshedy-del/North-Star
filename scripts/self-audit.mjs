/**
 * Self-audit — run this BEFORE opening a pull request.
 *
 * This is the architect's review rubric, mechanised. Every check here is one the
 * audit would perform anyway; running it yourself means finding the problem in
 * your own terminal in ten seconds rather than in a review round trip a day
 * later. A packet that passes this is usually one round from done.
 *
 * It does not replace judgement — the domain checks in your packet still need a
 * probe, and correctness is not something a grep can confirm. It catches the
 * mechanical failures, which is most of what review rounds are actually spent on.
 *
 *   npm run audit:self
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const BASE = 'origin/main';

let failures = 0;
let warnings = 0;

function pass(name, detail = '') {
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail) {
  failures += 1;
  console.error(`  FAIL  ${name}`);
  for (const line of String(detail).split('\n')) {
    if (line.trim() !== '') console.error(`        ${line}`);
  }
}
function warn(name, detail) {
  warnings += 1;
  console.warn(`  WARN  ${name}`);
  for (const line of String(detail).split('\n')) {
    if (line.trim() !== '') console.warn(`        ${line}`);
  }
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function tryGit(args) {
  try {
    return { ok: true, out: git(args) };
  } catch (error) {
    return { ok: false, out: String(error.stderr ?? error.message) };
  }
}

console.log('\nSelf-audit — the review rubric, run against your own branch.\n');

// ---------------------------------------------------------------------------
// 1. Is the branch actually up to date with main?
//
// A branch cut from a stale main can be green on its own and wrong about what
// lands, because the checks it ran are not the checks the merge runs. P1 passed
// nine guardrails while its merged result ran ten.
// ---------------------------------------------------------------------------
tryGit(['fetch', '--quiet', 'origin', 'main']);
const ancestor = tryGit(['merge-base', '--is-ancestor', BASE, 'HEAD']);
if (ancestor.ok) {
  pass('branch contains the latest origin/main');
} else {
  fail(
    'branch is behind origin/main',
    'Run: git fetch origin && git merge origin/main\n' +
      'Then re-run every check. Your branch being green says nothing about the merge.',
  );
}

// ---------------------------------------------------------------------------
// 2. Architect-owned files must be untouched.
//
// Several packets are written against each contract. Changing one silently
// breaks work you cannot see, which is why this is the first rule in AGENTS.md
// and the first thing the audit checks.
// ---------------------------------------------------------------------------
const OWNED_GLOBS = [
  '*.contract.ts',
  '*.port.ts',
  'tsconfig.base.json',
  'tsconfig.json',
  'eslint.config.js',
  'scripts/verify-guardrails.mjs',
  'scripts/self-audit.mjs',
  '.github/workflows/*',
  'packages/brand/src/index.ts',
];

// Two-dot against the WORKING TREE, not BASE...HEAD: the three-dot form compares
// commits only, so an uncommitted edit to a contract slips straight past — which
// is exactly the case this check exists to catch, and exactly how it first failed.
// Git pathspecs are not shell globs either: `*` already crosses `/`, so a `**/`
// prefix matches nothing rather than everything.
const changedOwned = tryGit(['diff', '--name-only', BASE, '--', ...OWNED_GLOBS]);

if (!changedOwned.ok) {
  warn('could not diff architect-owned files', changedOwned.out);
} else if (changedOwned.out === '') {
  pass('no architect-owned file modified');
} else {
  fail(
    'architect-owned files were modified',
    `${changedOwned.out}\n\n` +
      'These define the shape of the system and other packets depend on them.\n' +
      'Revert them and escalate instead — say what you need and why.',
  );
}

// ---------------------------------------------------------------------------
// 3. No escape hatches.
//
// A disable comment is an undiscussed architectural change; a ts-ignore is a
// silenced type error. Both are review-rejection conditions, so catch them here.
// ---------------------------------------------------------------------------
function grepSource(pattern) {
  const result = tryGit(['grep', '-n', '-E', pattern, '--', 'packages', 'apps']);
  return result.ok && result.out !== '' ? result.out : '';
}

const disables = grepSource('eslint-disable');
if (disables === '') {
  pass('no eslint-disable comments');
} else {
  fail(
    'eslint-disable found',
    `${disables}\n\nThe lint rules are the architecture. Escalate rather than silencing one.`,
  );
}

const tsIgnores = grepSource('@ts-ignore|@ts-nocheck|@ts-expect-error');
if (tsIgnores === '') {
  pass('no suppressed type errors');
} else {
  fail('type-error suppression found', tsIgnores);
}

// ---------------------------------------------------------------------------
// 4. Contract-satisfaction assertions.
//
// A module with a matching *.contract.ts must end with `const _contract: XApi =
// {...}`, so a wrong signature fails typecheck instead of review.
// ---------------------------------------------------------------------------
const sourceFiles = git(['ls-files', 'packages/*/src/**/*.ts'])
  .split('\n')
  .filter((f) => f !== '' && !/\.(test|contract|port)\.ts$/.test(f) && !f.endsWith('/index.ts'));

const missingAssertion = sourceFiles.filter((file) => {
  const contractPath = file.replace(/\.ts$/, '.contract.ts');
  if (!existsSync(contractPath)) return false;
  return !readFileSync(file, 'utf8').includes('_contract');
});

if (missingAssertion.length === 0) {
  pass('every module with a contract asserts it', `${sourceFiles.length} module(s) scanned`);
} else {
  fail(
    'module has a contract but no satisfaction assertion',
    `${missingAssertion.join('\n')}\n\nAdd: const _contract: SomeApi = { ...exports }; void _contract;`,
  );
}

// ---------------------------------------------------------------------------
// 5. Golden values must cite an external source.
//
// The failure this exists to prevent is a test that asserts the code's own
// output: green, large, and worthless. A file asserting non-trivial numbers with
// no citation anywhere is the shape that failure takes.
//
// Heuristic and deliberately loose — it flags a whole file, not a line, so a
// single honest citation clears it.
//
// Not every number is an empirical claim: `expect(mapResult(ok(4), n => n * 2))`
// asserts algebra, and there is nothing to cite. Such a file opts out with
//
//   // golden-values: none — <reason>
//
// which is a stated justification rather than a silent exemption. Preferring
// that to a hardcoded exclusion list is deliberate: it scales to files nobody
// has written yet, and it puts the reasoning where the next reader will find it.
// ---------------------------------------------------------------------------
const OPT_OUT = /golden-values:\s*none/i;
const CITATION =/(https?:\/\/|NOAA|USNO|Almanac|Bowditch|timeanddate|IANA|IAU|tzdb|docs\/0\d-)/i;
const NUMERIC_ASSERT = /\.(toBe|toBeCloseTo|toEqual|toBeGreaterThan\w*|toBeLessThan\w*)\(\s*-?\d+\.?\d*/;

const testFiles = git(['ls-files', 'packages/*/src/**/*.test.ts', 'apps/**/*.test.ts'])
  .split('\n')
  .filter((f) => f !== '');

const uncited = testFiles.filter((file) => {
  const body = readFileSync(file, 'utf8');
  if (OPT_OUT.test(body)) return false;
  const asserts = body.split('\n').some((line) => NUMERIC_ASSERT.test(line));
  return asserts && !CITATION.test(body);
});

if (testFiles.length === 0) {
  warn('no test files found', 'A packet with no tests is not done.');
} else if (uncited.length === 0) {
  pass('test files asserting numbers cite a source', `${testFiles.length} file(s) scanned`);
} else {
  fail(
    'test file asserts numbers with no cited source',
    `${uncited.join('\n')}\n\n` +
      'Every hard-coded expectation needs a comment saying where it came from —\n' +
      'NOAA, USNO, an almanac, or a closed-form identity. Generating the value by\n' +
      'running our own code and pasting it proves only that the code does what it does.\n' +
      'If no external source exists, test an invariant instead.',
  );
}

// ---------------------------------------------------------------------------
// 6. The full pipeline, on the current tree.
// ---------------------------------------------------------------------------
function runStage(label, args) {
  try {
    execFileSync('npm', args, { encoding: 'utf8', stdio: 'pipe' });
    pass(label);
    return true;
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    fail(label, out.split('\n').slice(-25).join('\n'));
    return false;
  }
}

console.log('');
runStage('npm run verify', ['run', 'verify']);
runStage('npm run test:coverage', ['run', 'test:coverage']);

// ---------------------------------------------------------------------------
console.log('');
if (failures > 0) {
  console.error(
    `Self-audit FAILED: ${failures} problem(s)${warnings > 0 ? `, ${warnings} warning(s)` : ''}.`,
  );
  console.error('Fix these before opening a pull request — the audit will find them anyway.\n');
  process.exit(1);
}
console.log(
  `Self-audit passed${warnings > 0 ? ` with ${warnings} warning(s)` : ''}.\n\n` +
    'Mechanical checks only. Your packet also asks you to PROVE the domain\n' +
    'behaviour with a probe and paste the output — a diff that looks right is not\n' +
    'evidence that it is. Do that before you open the PR.\n',
);

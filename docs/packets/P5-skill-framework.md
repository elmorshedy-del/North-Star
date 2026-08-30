# P5 — Skill framework

**Depends on:** P1 (domain primitives). Uses `fake-ephemeris.ts` from P3.
**You are building:** the machinery every skill plugs into. No individual skill yet
— P6 and P7 build those on top of this.

## Files you may create

```
packages/core/src/domain/assessment.ts        + assessment.test.ts
packages/core/src/application/skills/registry.ts + registry.test.ts
packages/core/src/application/skills/attempt.ts  + attempt.test.ts
```

## Files you must NOT touch

Any `*.contract.ts` or `*.port.ts`.

## What to implement

### `assessment.ts` — `AssessmentApi`

```ts
signedErrorOf(estimate, truth, unit): number
bandFor(errorMagnitude, scale: GradeScale): GradeBand
```

`signedErrorOf` is estimate minus truth. Negative means the learner was **under**.
Direction is kept because it is the coachable signal — someone consistently reading
high has one specific fixable habit, usually a bent arm or a false horizon.

Two rules that are easy to get wrong:

- **Bearings use shortest-way-round.** Guessing 359° against a truth of 1° is an
  error of −2°, not +358°.
- **Instants convert to minutes**, signed, and must not lose the sign.

`bandFor` maps magnitude to `'bullseye' | 'close' | 'fair' | 'off'` against a
`GradeScale { unit, bullseye, close, fair }`. **Boundaries are inclusive of the
tighter band**: an error of exactly `bullseye` is a bullseye.

### `registry.ts` — `SkillRegistryApi`

```ts
allSkills(): readonly SkillDefinition[]
skillById(id): SkillDefinition | undefined
availableNow(context, ephemeris): readonly { skill, availability }[]
```

`availableNow` returns **every** skill with its availability, never a filtered list.
The home screen shows what is possible now *and*, more quietly, what the sky is
currently withholding and when it returns. Filtering here would throw away the
information that makes a refusal into a reason to come back after dark.

Start with an empty registry; P6 and P7 register into it.

### `attempt.ts` — the one use case

```ts
interface AttemptOutcome {
  readonly grade: Grade;
  readonly truth: TruthValue;
  readonly countsTowardProgress: boolean;
}

recordAttempt(
  skill: SkillDefinition,
  estimate: Estimate,
  context: SkyContext,
  ephemeris: EphemerisPort,
): Result<AttemptOutcome, DomainError>
```

Order of operations, and it matters:

1. Check `skill.availability`. **If unavailable, return an error** — never grade an
   attempt the sky does not permit.
2. Compute `skill.truth`. Propagate its error unchanged.
3. Grade via `skill.grade`.
4. Set `countsTowardProgress` from `countsTowardProgress(context)` — **true only for
   a live sky.** A simulated context must never feed a streak, or the developer
   override panel becomes a cheat code.

`recordAttempt` does not persist anything. Persistence is the app layer's job
through `ProgressRepository`; this function stays pure so it stays testable.

## Acceptance tests

Use the fake ephemeris from P3. No real astronomy in this packet.

- `bandFor` at every boundary, exactly: error = bullseye, = close, = fair, and just
  above each
- `signedErrorOf` for bearings across the wrap: (359, 1) → −2; (1, 359) → +2
- `signedErrorOf` for instants returns signed minutes
- `signedErrorOf` sign convention asserted in both directions
- `recordAttempt` refuses when the skill is unavailable, and the error says so
- `recordAttempt` propagates a `truth` error unchanged rather than masking it
- `countsTowardProgress` is true for a `'live'` context and **false for `'simulated'`**
  — assert this explicitly; it is the anti-cheat rule
- `availableNow` includes unavailable skills, with their reasons intact

Build a minimal stub `SkillDefinition` inside the test file for these — you are
testing the framework, not a skill.

## Definition of done

```
npm run verify
npm run test:coverage
```

Both green, output pasted.

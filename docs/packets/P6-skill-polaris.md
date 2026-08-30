# P6 — Skill A: find north and your latitude from Polaris

**Depends on:** P2 (ephemeris), P3 (solar service, fake ephemeris), P5 (framework).
**You are building:** the first complete skill, end to end.

Read `docs/04-skills.md` §Skill A for the full teaching copy. Copy may be tightened;
**the facts may not be changed.**

## Files you may create

```
packages/core/src/application/skills/polaris-latitude.ts
packages/core/src/application/skills/polaris-latitude.test.ts
```

You may edit `registry.ts` to register the skill.

## Files you must NOT touch

Any `*.contract.ts` or `*.port.ts`.

## What to implement

A `SkillDefinition` with `id: 'polaris-latitude'`, `timeOfDay: 'night'`,
`estimateKind: 'angle'`, methods `['hand-span', 'device-sight']`, and
`gradeScale: { unit: 'degrees', bullseye: 1, close: 3, fair: 5 }`.

### `availability(context, ephemeris)`

Checked **in this order**; the first failure is the one reported. Each carries
user-facing copy and, where the sky will relent, an `availableAt`.

| # | Condition | Reason | `availableAt` |
|---|---|---|---|
| 1 | latitude ≤ 0° | southern hemisphere — Polaris is below the horizon | `null` |
| 2 | sun altitude > −12° | not dark enough yet | next crossing of −12° |
| 3 | Polaris apparent altitude < 10° | too far south; Polaris skims the haze | `null` |

Exact copy is in `docs/04-skills.md`. Never return a bare boolean — a refusal that
explains itself teaches something about the shape of the sky.

### `truth(context, ephemeris)`

**The truth is the observer's latitude**, which *is* the altitude of the true
celestial pole, by geometry. It needs no ephemeris call.

It is **not** Polaris's altitude. Polaris sits up to 0.71° away from the pole, and
grading against the star rather than the pole would mark a perfect measurement
wrong. See `docs/03-astronomy.md` §3.

### `grade(estimate, truth, context)`

Beyond the band, the feedback must:

1. **Name the error in body units the learner can feel** — 1° is about a
   little-finger width, 2° roughly a finger. "You were two degrees high, about a
   finger's width" is actionable; "error: 2.0" is not.
2. **Show the pole correction explicitly.** Report where Polaris actually was
   relative to the true pole at that moment, so a learner who measured the star
   perfectly and landed 0.6° out is told *why* rather than simply marked down.
   This is the moment the app visibly knows more than the folk rule, and it is the
   single most valuable line on the result screen.
3. Use `signedError` to say high or low, not just how far.

## Acceptance tests

Use the fake ephemeris from P3 for everything except the one integration test.

Availability:
- latitude −10° → unavailable, reason names the hemisphere, `availableAt` null
- latitude 45°, sun at +30° → unavailable for darkness, `availableAt` is the next
  −12° crossing
- latitude 45°, sun at −20° → **available**
- sun at exactly −12° → available (boundary inclusive)
- latitude 5°, sun at −20°, Polaris at 5° → unavailable, reason names the altitude
- Polaris at exactly 10° → available (boundary inclusive)
- Gate **order** is asserted: a southern-hemisphere daytime context reports the
  hemisphere, not the darkness

Truth and grading:
- `truth` returns latitude exactly, at several latitudes, and makes no ephemeris
  call for it
- A guess equal to latitude grades `bullseye` with `signedError` 0
- Guesses at exactly 1°, 3°, 5° error land on the band boundaries
- A high guess yields positive `signedError`; a low guess negative
- The explanation mentions the pole correction when it is material

One integration test with the **real** adapter: at a known latitude and a known
dark instant, assert `truth` equals latitude and that Polaris's measured altitude
differs from it by less than 1.0°, citing `docs/03-astronomy.md` §3.

## Definition of done

```
npm run verify
npm run test:coverage
```

Both green, output pasted.

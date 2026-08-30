# P1 — Domain primitives

**Depends on:** nothing. This is the first packet.
**You are building:** the value objects every other packet is written against.

## Goal

Implement the pure domain primitives — units, time, geography, results, and the
`SkyContext` seam. No astronomy, no I/O, no framework. Every function here is
total, deterministic, and testable with nothing but numbers.

## Files you may create

```
packages/core/src/domain/result.ts        + result.test.ts
packages/core/src/domain/units.ts         + units.test.ts
packages/core/src/domain/time.ts          + time.test.ts
packages/core/src/domain/geo.ts           + geo.test.ts
packages/core/src/domain/sky-context.ts   + sky-context.test.ts
```

You may also edit `packages/core/src/domain/index.ts` to export the new runtime
values, and `vitest.config.ts` for the one change named at the bottom.

## Files you must NOT touch

Every `*.contract.ts` and `*.port.ts` file. They are architect-owned and other
packets depend on them. If one is missing something you need, **stop and escalate.**

## The contract-satisfaction pattern

This is how your signatures get checked by the compiler rather than by review. Each
module ends with an assertion that it satisfies its `Api` interface:

```ts
import type { UnitsApi } from './units.contract.ts';
// ... implementations ...
const _contract: UnitsApi = {
  degrees, radians, hours, milliseconds,
  toRadians, toDegrees, hoursToDegrees, degreesToHours, arcminutes,
  normalise360, normaliseSigned180, angularSeparation,
};
void _contract;
```

If a signature is wrong or a function is missing, `tsc` fails. **Every module in
this packet must end with one of these.**

## What to implement

Read the contract file beside each module for the authoritative signatures and the
reasoning. Summary of the behaviour that matters:

### `result.ts` — `ResultApi`
`ok`, `err`, `isOk`, `isErr`, `mapResult`, `unwrapOr`, `domainError`.
Plain data, no classes. `isOk`/`isErr` are type guards.

### `units.ts` — `UnitsApi`
Branded constructors (`degrees`, `radians`, `hours`, `milliseconds`) that **throw on
non-finite input** — that is programmer error, not user error, so it is the one
place an exception is right. Conversions, `arcminutes` (n/60 degrees),
`hoursToDegrees` (×15), and:

- `normalise360` → `[0, 360)`. Must handle negatives: −10 → 350.
- `normaliseSigned180` → `[−180, 180)`. 181 → −179; −180 stays −180.
- `angularSeparation` → `[0, 180]`, correct across the wrap:
  **`angularSeparation(359, 1) === 2`**, not 358.

### `time.ts` — `TimeApi`
`Instant` is branded epoch milliseconds. `instantFromIso`, `toIso`, `addDuration`,
`durationBetween` (signed, positive when `a` is later).

`toCivilTime(instant, zone)` uses `Intl.DateTimeFormat` with an **explicit**
`timeZone`. It must never fall back to the ambient zone. Determine
`isDaylightSaving` by comparing the zone's offset at this instant against its
January and July offsets — the larger of those two is the DST offset in either
hemisphere.

`new Date(epochMs)` **with an argument** is permitted here. `new Date()` with no
argument is banned by lint, which is the distinction that matters: constructing a
moment from data is fine, reading the ambient clock is not.

### `geo.ts` — `GeoApi`
`geoPosition` **rejects** latitude outside [−90, 90] with `out-of-range`, and
**normalises** longitude rather than rejecting it (181 → −179). That asymmetry is
deliberate: wrapping is correct at the antimeridian and devices do report 180.0000001.

`hemisphereOf` — latitude ≥ 0 is `'northern'`.

`horizonDip` — dip of the visible horizon below the astronomical horizon:
```
dip (arcminutes) ≈ 1.76 × √(elevation in metres)
```
Returns degrees. Zero at sea level, never negative.

### `sky-context.ts` — `SkyContextApi`
`skyContext`, `atInstant` (same place, new moment), and `countsTowardProgress`,
which returns **true only for `provenance === 'live'`**. Simulated skies must never
feed a streak, or the developer override panel becomes a cheat code.

## Acceptance tests

Write these. They are the specification for this packet.

- `normalise360`: 0, 360, 359.9, −10, −370, 720
- `normaliseSigned180`: 180 → −180, 181 → −179, −180 → −180, −181 → 179
- `angularSeparation`: (359, 1) = 2, (0, 180) = 180, (10, 350) = 20, (x, x) = 0
- `angularSeparation` is symmetric and always within [0, 180] — assert over a sweep
- Round-trip `toRadians`/`toDegrees` to < 1e-12 over a sweep
- Unit constructors throw on `NaN` and `Infinity`
- `geoPosition` rejects latitude 90.1 and −90.1; accepts exactly ±90
- `geoPosition` normalises longitude 181, −181, 360, and leaves −180 alone
- `horizonDip`: 0 m → 0; 100 m → ≈ 17.6 arcminutes (0.293°), within 0.01°
- `toCivilTime` across a **DST transition**: pick a real transition in
  `Europe/London` and assert the hour and `isDaylightSaving` on both sides
- `toCivilTime` for a southern-hemisphere zone (`Australia/Sydney`) — DST detection
  must not assume July is winter
- `countsTowardProgress` is true for `'live'`, false for `'simulated'`
- `durationBetween` is signed and antisymmetric

## Definition of done

```
npm run verify
npm run test:coverage
```

Both green, output pasted into your handoff.

**One config change belongs to this packet:** set `passWithNoTests` to `false` in
`vitest.config.ts`. From now on, a workspace with no tests is a defect rather than
a pass. Do not make any other change to that file.

# P3 — Solar service

**Depends on:** P1 (domain primitives), P2 (ephemeris adapter).
**You are building:** the application-layer service that turns raw ephemeris output
into the things the sun-time skill needs.

## Goal

Everything about the sun that a *person* cares about: when it is actually noon, how
far the clock has drifted from the sky, whether it is dark enough for stars, and
how to get from the sun's height to a time of day.

## Files you may create

```
packages/core/src/application/solar/solar-service.ts
packages/core/src/application/solar/solar-service.test.ts
packages/core/src/application/solar/fake-ephemeris.ts   ← shared test double
```

`fake-ephemeris.ts` is a **deliverable of this packet** and will be reused by P5,
P6 and P7. Build it properly: a hand-written `EphemerisPort` implementation whose
every return value is settable by the test. It must not import `astronomy-engine`
— lint will stop you, and the whole point is that skill tests contain no astronomy.

## Files you must NOT touch

Any `*.contract.ts` or `*.port.ts`. Anything under `infrastructure/`.

## Interfaces you need

`EphemerisPort` (dependency-injected into your service — never construct the real
adapter here; the application layer may not import infrastructure, and lint
enforces it):

```ts
horizontalOf(body, context): Horizontal          // { altitude, azimuth, refracted }
culmination(body, context): Instant
equationOfTime(context): Milliseconds
altitudeCrossing(body, context, altitude, direction): Result<Instant, DomainError>
riseSet(body, context, direction): Result<Instant, DomainError>
```

`SkyContext` is `{ position, instant, zone, provenance }`.

## What to implement

### `trueSolarNoon(context, ephemeris): Instant`
`culmination('sun', context)`. The sun's highest point — which is not 12:00, and
near a time-zone edge in summer is not even close.

### `solarClockGap(context, ephemeris): SolarClockGap`
The payoff of the whole sun skill. Decompose the difference between true solar noon
and civil clock noon into its **three named, independently computed contributions**:

```ts
interface SolarClockGap {
  readonly equationOfTime: Milliseconds;    // the sun's own irregularity
  readonly longitudeOffset: Milliseconds;   // 4 min per degree from zone meridian
  readonly daylightSaving: Milliseconds;    // 0 or one hour
  readonly total: Milliseconds;
}
```

`total` must equal the sum, and must independently agree with the directly measured
gap between `trueSolarNoon` and civil noon. **Test both** — that cross-check is
what proves the decomposition is real rather than a plausible-looking apportionment.

Derive the zone's standard meridian from its actual UTC offset at that instant, not
from a table of your own devising.

### `isDarkEnoughForStars(context, ephemeris): boolean`
Sun altitude ≤ **−12°** (nautical twilight). Not −18°: astronomical twilight is
stricter than this product needs and would refuse to run on a perfectly good
evening. The horizon is still faintly visible at −12°, which is exactly the
condition the technique was designed for.

### `nextDarkness(context, ephemeris): Result<Instant, DomainError>`
Next time the sun crosses −12° going down. Feeds `availableAt` on the home screen,
so a refusal can say *when to come back*.

### `sunAltitudeToClockTime(context, ephemeris, altitude, side): Result<Instant, DomainError>`
Given a measured sun altitude and which side of noon the learner says they are on
(`'morning' | 'afternoon'`), return the civil time it implies.

Search rather than invert analytically: bisect between sunrise and true solar noon,
or between noon and sunset. Altitude is monotonic on each side of noon, so
bisection is exact, simple, and obviously correct — which an inverted analytic
solution would not be.

**Return an error when the altitude is unreachable that day.** A learner reporting
70° in a British December is not making a small mistake, and quietly clamping to the
maximum would grade them against a fiction.

## Acceptance tests

Use `fake-ephemeris.ts` throughout — this packet needs **no real astronomy**.

- `isDarkEnoughForStars` at exactly −12° (boundary is inclusive), −11.9°, −12.1°
- `nextDarkness` propagates `body-never-rises` / `body-always-up` unchanged rather
  than inventing a time
- `solarClockGap`: components sum to `total`
- `solarClockGap`: `total` agrees with the directly measured noon-to-noon gap
- `solarClockGap` with DST on and off, and in a southern-hemisphere zone
- `sunAltitudeToClockTime` round-trips: take the true altitude at a known instant,
  feed it back, and recover that instant within a minute — on both sides of noon
- `sunAltitudeToClockTime` errors for an altitude above the day's maximum
- Near noon, the returned time is correctly less precise; assert the function still
  converges rather than hanging or returning a wild value

One real-adapter integration test is worth having: assert **Madrid, 2026-06-21 has
a `solarClockGap.total` of about 2 h 16 min**, and cite `docs/03-astronomy.md` §6
as a regression anchor rather than a golden value.

## Definition of done

```
npm run verify
npm run test:coverage
```

Both green, output pasted. Confirm in your handoff that `fake-ephemeris.ts` is
complete enough for P5–P7 to build skill tests on — that is its purpose, and a
half-built double will cost three later packets.

# P2 — The ephemeris adapter, and the invariant suite

**Depends on:** P1 (domain primitives).
**You are building:** the single place astronomy enters this codebase, plus the
test suite that proves it is right.

This is the highest-risk packet in the project. A wrong answer here is not
obviously wrong — it is a plausible number, and everything downstream inherits it.
Read `docs/03-astronomy.md` in full before starting. It contains measured values
that contradict several familiar rules of thumb, and each contradiction is a bug
you would otherwise write.

## Files you may create

```
packages/core/src/infrastructure/ephemeris/stars.ts
packages/core/src/infrastructure/ephemeris/astronomy-engine-ephemeris.ts
packages/core/src/infrastructure/ephemeris/invariants.test.ts
packages/core/src/infrastructure/ephemeris/astronomy-engine-ephemeris.test.ts
```

You may edit `packages/core/src/infrastructure/index.ts` to export the adapter.

## Files you must NOT touch

Every `*.contract.ts` and `*.port.ts`. In particular **do not widen
`EphemerisPort`.** If you believe you need another method, stop and escalate — that
is an architectural change, and the port being narrow is the point.

## The interface you are implementing

From `application/ports/ephemeris.port.ts` — restated so you need not go looking:

```ts
type CelestialBody =
  | 'sun' | 'moon' | 'polaris' | 'dubhe' | 'merak' | 'alnilam' | 'sigma-octantis';

type SearchDirection = 'next-rise' | 'next-set';

interface MoonIllumination {
  fraction: number;      // 0 new .. 1 full
  phaseAngle: Degrees;   // 0 full .. 180 new
}

interface EphemerisPort {
  horizontalOf(body: CelestialBody, context: SkyContext): Horizontal;
  riseSet(body, context, direction): Result<Instant, DomainError>;
  altitudeCrossing(body, context, altitude: Degrees, direction): Result<Instant, DomainError>;
  culmination(body: CelestialBody, context: SkyContext): Instant;
  equationOfTime(context: SkyContext): Milliseconds;
  moonIllumination(context: SkyContext): MoonIllumination;
  localSiderealTime(context: SkyContext): Hours;
  refractionAt(trueAltitude: Degrees): Degrees;
}
```

`Horizontal` is `{ altitude: Degrees; azimuth: Degrees; refracted: boolean }`.

This directory is the **only** place `astronomy-engine` may be imported, and the
only place `new Date()` is permitted. Lint enforces both, and there is a positive
control in `npm run verify:guardrails` proving the exception still works.

## Implementation notes — read these, they are the traps

### Star registration
`astronomy-engine` has no star database. Register with `DefineStar(slot, raHours,
decDegrees, distanceLightYears)` once at module load, using the **J2000** table in
`docs/03-astronomy.md` §2. Distance is required by the API but astronomically
irrelevant here.

### Always use of-date coordinates
```ts
const eq = Equator(body, date, observer, /* ofdate */ true, /* aberration */ true);
const hor = Horizon(date, observer, eq.ra, eq.dec, 'normal');
```
**`ofdate` must be `true`.** Passing `false` yields J2000 coordinates, and feeding
those to `Horizon` gives an answer wrong by about a quarter degree in 2026 — small
enough to pass a loose test, large enough to be wrong.

### `equationOfTime` must be derived
There is **no `EquationOfTime` export.** For an observer at longitude 0, mean solar
noon is 12:00 UT, so:
```
equationOfTime = 12:00 UT − (sun's upper transit at longitude 0 that day)
```
Upper transit is `SearchHourAngle(Body.Sun, observer, 0, date, 1)`. This reproduces
the published extremes: −14.18 min on 2026-02-11, +16.45 min on 2026-11-03.

### `altitudeCrossing` argument order
`SearchAltitude(body, observer, direction, startTime, limitDays, altitude)` — the
altitude is the **last** argument, and direction is `+1` for rising, `−1` for
setting. Getting this wrong produces confidently wrong twilight times.

### Rise and set are frequently undefined
Return `err(domainError('body-always-up' | 'body-never-rises', …))` when
`SearchRiseSet` yields null. Polaris never sets for most of our audience and the
Arctic sun does neither for months. **These are ordinary outcomes, not errors** —
never throw, and never return a fabricated time.

### `refractionAt` takes a TRUE altitude
`Refraction('normal', trueAltitude)`. Expect ~28.98′ at true altitude 0 —
**not 34′.** The 34′ figure is refraction at *apparent* altitude 0, which is a
different question and has produced a great many wrong tests.

### `localSiderealTime` must return [0, 24)

`Hours` is deliberately unconstrained in the domain, because an hour angle is
legitimately signed. Sidereal time is not: wrap it into [0, 24) here, and test the
wrap. Nothing downstream will do it for you.

### `moonIllumination`
`Illumination(Body.Moon, date)` gives `phase_fraction` and `phase_angle`. It does
**not** give the bright-limb position angle, and the port deliberately does not ask
for one.

## Acceptance tests

### `invariants.test.ts` — the real safety net

These follow from physics, not from our output, so they cannot be satisfied by
being consistently wrong. Implement all fifteen from `docs/05-testing.md` §Defence 2.
The ones that carry the most weight:

- **Polaris altitude ≈ latitude**, latitudes 10–80°N, hourly across a year, within
  **1.0°**. Measured worst case is 0.71°.
- **Polaris offset from the true pole, of-date, 2026 = 0.62° ± 0.02°.** This is the
  sharpest test in the suite: J2000 coordinates would give 0.736°, and the loose
  test above passes either way. If this fails, you have an epoch bug.
- **Noon altitude = 90 − abs(latitude − declination)** — and you must include
  **latitude 0 on the June solstice**, where the naive `90 − lat + dec` form returns
  a nonsensical 113.44° against a true 66.57°.
- Sun altitude is maximal at `culmination` (sample ±3 h at 1-minute steps).
- Equation of time within ±16.5 min, crossing zero exactly 4× in 2026.
- Refraction strictly decreasing; 25′–35′ at true altitude 0; ~0 at zenith.
- Alt/az → equatorial → alt/az round-trips within 1 arcminute.
- Rise and set bracket culmination whenever all three are defined.
- Sidereal time advances 360.9856° per solar day, within 0.001°.
- Day length at the equator ≈ 12.11 h ± 0.02 h year-round.
- Alnilam rises within 2° of due east, latitudes 0–65°.

### `astronomy-engine-ephemeris.test.ts` — golden values and edge cases

**Golden values must cite an external source in a comment** — NOAA, USNO, HM
Nautical Almanac, timeanddate.com. Generating an expectation by running your own
code and pasting the output is forbidden; it proves only that the code does what it
does. Cover at minimum:

- Sunrise and sunset for a named place and date, against an external almanac
- True solar noon, London 2026-11-03 (expect ≈ 11:43:33 UTC)
- Nautical twilight for a named place and date

Edge cases:

- Arctic (78°N) in June: `riseSet(sun)` returns `body-always-up`
- Arctic in December: returns `body-never-rises`
- Polaris at 60°N: returns `body-always-up`
- Longitude exactly ±180
- Latitude exactly ±90

## Self-audit — run this BEFORE opening the PR

This packet is the highest-risk in the project, because a wrong answer here is not
obviously wrong. It is a plausible number, and everything downstream inherits it.
So the audit's own checks are given to you up front. Run them yourself; the review
will run exactly these.

### Step 1 — the mechanical checks

```
npm run audit:self
```

Contracts unmodified, no escape hatches, contract assertions present, golden values
cited, verify and coverage green. Fix anything it reports before going further.

### Step 2 — the domain probe, and this is the part that matters

Write a throwaway script that prints the values below, run it, and **paste the
output into the PR**. Do not skip this because the tests pass: a green suite proves
your tests agree with your code, not that either matches the sky.

Every number here was measured during specification and is restated in
`docs/03-astronomy.md`. Your adapter must reproduce them.

| # | Probe | Expected | What a miss means |
|---|---|---|---|
| 1 | Polaris offset from the true pole, of-date, 2026 | **0.62° ± 0.02°** | **0.736° means an epoch bug** — you are feeding J2000 coordinates to `Horizon`. This is the single sharpest check in the packet |
| 2 | max abs(Polaris apparent altitude − latitude), lat 10–80°N, hourly over a year | **≤ 0.71°** | Wrong star, wrong refraction setting, or wrong observer |
| 3 | `refractionAt(0°)` | **28.98′ ± 0.5′** | If you get ~34′ you have used apparent altitude where the port specifies true |
| 4 | Noon altitude at **latitude 0, June solstice** | **66.57°** | If you get 113.44° you used `90 − lat + dec` instead of `90 − abs(lat − dec)` |
| 5 | Equation of time 2026, min and max | **−14.18 min (11 Feb), +16.45 min (3 Nov)** | Derivation wrong, or you used mean instead of apparent transit |
| 6 | Sidereal advance per solar day | **360.9856° ± 0.001°** | Wrong sidereal call |
| 7 | Day length at the equator, four dates | **12.11 h ± 0.02** | Exactly 12.00 means you bypassed the −0.833° rise/set convention |
| 8 | True solar noon, London 2026-11-03 | **11:43:33 UTC ± 2 s** | Transit search wrong |
| 9 | `riseSet('sun')` at 78°N in June, and in December | **`body-always-up`, `body-never-rises`** | Throwing, or returning a fabricated time, instead of a `Result` |
| 10 | `localSiderealTime` across a day | **always within [0, 24)** | Missing the wrap |

Any mismatch is a real defect. Do not adjust a tolerance to make it pass — if a
number disagrees, either the implementation is wrong or you have found an error in
the specification, and **the second one is worth escalating loudly.**

### Step 3 — record what you had to decide

Anything the packet left unspecified goes in `docs/packets/P2-architect-review.md`
on your branch: what you chose, why, where to look, what you want confirmed. Check
`docs/07-standing-rulings.md` first — if a ruling already covers it, follow the
ruling and do not raise it.

## Definition of done

```
npm run audit:self
```

Green, output pasted, **plus the step-2 probe output**. State which external source
you used for each golden value; that is what the audit checks first.

A PR that arrives with a passing self-audit and a matching probe should need one
review round. That is the target.

# 05 — Testing strategy

The specific risk this document exists to manage: **an implementation that writes
tests asserting its own output.** Such a suite is green, large, and worthless — it
proves the code does what it does. Astronomy makes this especially dangerous,
because a wrong answer here is not obviously wrong. It is a plausible number.

Three defences, in increasing order of strength.

## Defence 1 — Golden values must be externally sourced

Every hard-coded expected number in a test **cites where it came from**, in a
comment on the line above:

```ts
// NOAA Solar Calculator, 51.4779 N 0.0015 W, 2026-11-03: solar noon 11:43 UTC
// https://gml.noaa.gov/grad/solcalc/
expect(minutesBetween(noon, expected)).toBeLessThan(1);
```

Acceptable sources: NOAA Solar Calculator, the US Naval Observatory, HM Nautical
Almanac Office, timeanddate.com, a published almanac, or a closed-form physical
identity.

**Forbidden:** running our own code and pasting the result as the expectation.
This is a review-rejection condition, not a style note. If you cannot find an
external source for a value, that is a signal to test an *invariant* instead.

The measured table in `docs/03-astronomy.md` §11 is a **regression anchor, not a
golden value** — it came from the same library it would be testing. Use it to
detect change, never to prove correctness, and label it as such in the test name.

## Defence 2 — Invariants, which cannot be fudged

These follow from physics and geometry, not from our output, so an implementation
cannot satisfy them by being consistently wrong. They are the real safety net, and
they are cheap: most are a loop over latitudes and dates.

Tolerances below are set from **measured** behaviour (see `docs/03-astronomy.md`),
not guessed. Do not loosen one to make a test pass — a violated tolerance here
means the implementation is wrong.

| # | Invariant | Tolerance |
|---|---|---|
| 1 | Polaris apparent altitude ≈ observer latitude, for lat 10–80°N, hourly across a year | < 1.0° |
| 2 | Polaris offset from the true pole, of-date, 2026 | 0.62° ± 0.02° |
| 3 | True celestial pole altitude = latitude exactly (geometric, no ephemeris) | < 1e-9° |
| 4 | Sun altitude is maximal at computed culmination (sample ±3 h at 1-min steps; no sample exceeds it) | strict |
| 5 | Noon altitude = 90 − abs(latitude − declination), including at latitude 0 | < 0.02° |
| 6 | Equation of time stays within ±16.5 min and crosses zero exactly 4× in 2026 | exact count |
| 7 | Refraction strictly decreases with altitude; ~0 at zenith; 25′–35′ at true altitude 0 | shape only |
| 8 | Alt/az → equatorial → alt/az round-trips | < 1 arcmin |
| 9 | Rise and set bracket culmination, whenever all three are defined | strict ordering |
| 10 | Sidereal time advances 360.9856° per solar day | < 0.001° |
| 11 | Day length at the equator ≈ 12.11 h year-round | ± 0.02 h |
| 12 | Alnilam rises within 2° of due east, latitudes 0–65° | < 2° |
| 13 | `angularSeparation` is correct across the 0/360 wrap, e.g. (359, 1) = 2 | exact |
| 14 | Longitude normalisation is correct at the antimeridian: 181 → −179, −180 → −180 | exact |
| 15 | `sightedAltitude` returns 0 for a level phone and 90 at the zenith, and does not fold back past vertical | < 0.01° |

**Invariant 2 is the sharpest test in the suite.** It discriminates correct epoch
handling: J2000 coordinates would give 0.736°, apparent gives 0.62°. A loose
"Polaris ≈ latitude within 1°" check passes either way, which is exactly why the
tight one is needed.

## Defence 3 — Test skill logic against a fake ephemeris

Skill availability, grading and copy must be tested with a **hand-written fake
`EphemerisPort`** that returns whatever sky the test wants. Asking "does the
Polaris skill refuse to run at midday" should not require computing where the sun
is; it should require a fake that says the sun is at +40°.

This is the payoff for putting `astronomy-engine` behind a port at all. These tests
are fast, deterministic, contain no astronomy, and can express skies that would be
tedious to find in reality — the Arctic in June, the equator, the moment Polaris
grazes 10°.

The real adapter is tested separately, once, by the invariant suite above.

## Structure and gates

- Tests live beside their subject: `units.ts` → `units.test.ts`.
- Invariant suites live in `packages/core/src/infrastructure/ephemeris/invariants.test.ts`
  and are named for what they prove, not the function they call.
- Coverage thresholds (`vitest.config.ts`): 90% statements, 85% branches. Contracts
  and ports are excluded — they are types with no runtime. **Raise, never lower.**
- `passWithNoTests` is currently `true`. **Packet P1 flips it to `false`.** After
  that, a workspace with no tests is a defect rather than a pass.

## Edge cases every reviewer will look for

Non-exhaustive, but these are the ones that break real navigation software:

- Polar latitudes: ±90°, and the Arctic circle in June and December
- The antimeridian: longitude ±180, and a position at exactly −180
- DST transition days, including the repeated hour in autumn
- The sun exactly at the horizon, and exactly at the gate thresholds (−12°, +5°)
- Latitude exactly 0 (hemisphere boundary) and exactly at the Polaris 10° gate
- A hand calibration of zero, or negative counts
- Attitude readings with a zero-magnitude gravity vector (device in free fall, or a
  sensor returning nothing)

## What "done" means

```
npm run verify        # typecheck + lint + guardrails + tests
npm run test:coverage # once tests exist
```

Both green, output pasted into the handoff. The guardrail check matters as much as
the tests: it proves the architecture rules still fire, and a green lint job means
nothing if the rules themselves have been defanged.

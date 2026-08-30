# 03 — Astronomy: the domain knowledge

This is the reference for anyone implementing `packages/core`. Every numeric claim
below was **measured against `astronomy-engine` v2.1.19 during specification**, not
recalled. Where a number here contradicts a textbook rule of thumb, the number is
right and the rule of thumb is being sloppy about a definition — those cases are
called out, because each one is a bug waiting to happen.

## 1. The two coordinate systems, and the only conversion that matters

- **Equatorial** (right ascension, declination) — fixed to the sky. A star's
  equatorial coordinates barely change; this is how catalogues store them.
- **Horizontal** (altitude, azimuth) — what a person standing outside actually
  sees. Altitude is degrees above the horizon; azimuth is degrees clockwise from
  true north. Depends entirely on where and when you are.

Everything this product does is the conversion from the first to the second, for a
given `SkyContext`. In `astronomy-engine`:

```
Equator(body, date, observer, /* ofdate */ true, /* aberration */ true)
  -> { ra, dec }                 // precessed to the date of observation
Horizon(date, observer, ra, dec, 'normal')
  -> { altitude, azimuth }       // 'normal' applies atmospheric refraction
```

**`ofdate` must be `true`.** Passing `false` returns J2000 coordinates, and feeding
those into `Horizon` produces an answer wrong by roughly a quarter of a degree in
2026 and growing — small enough to pass a loose test and large enough to be wrong.

## 2. The star catalogue

`astronomy-engine` has no star database. Stars are registered with `DefineStar`,
which takes **J2000** right ascension and declination; `Equator(..., ofdate=true)`
then precesses them to the observation date. Register once at module load.

| Body | Slot | RA (J2000) | Dec (J2000) | Distance (ly) | Why it is here |
|---|---|---|---|---|---|
| Polaris | Star1 | 02h 31m 49.09s | +89° 15′ 50.8″ | 433 | The north pole star |
| Dubhe | Star2 | 11h 03m 43.67s | +61° 45′ 03.7″ | 123 | Outer pointer |
| Merak | Star3 | 11h 01m 50.48s | +56° 22′ 56.7″ | 79.7 | Inner pointer |
| Alnilam | Star4 | 05h 36m 12.81s | −01° 12′ 06.9″ | 2000 | Belt centre; rises due east |
| Sigma Octantis | Star5 | 21h 08m 46.2s | −88° 57′ 23.4″ | 294 | South pole star (phase 3) |

Distance is required by the API but is astronomically irrelevant at these ranges —
it only affects parallax, which is far below our precision. Alnilam's distance in
particular is genuinely uncertain in the literature; it does not matter here.

## 3. Polaris is not the pole — the product's first real teaching moment

Everyone is taught "the altitude of Polaris equals your latitude". It is not
exactly true, and the size of the error is worth knowing precisely.

**Measured, 2026:** Polaris sits **0.62°** from the true north celestial pole in
apparent (of-date) coordinates. Note this is *not* the J2000 figure of 0.736° —
precession is currently carrying Polaris toward the pole, and it will reach its
closest approach (about 0.45°) around the year 2100. If your implementation
reports 0.74° rather than ~0.62°, **you have an epoch bug**: you are using J2000
coordinates where apparent ones are required. This single check is the sharpest
test of correct epoch handling in the whole codebase.

Because Polaris circles the pole once a day, the error in the folk rule swings with
the hour. Measured across a full year at hourly resolution:

| Observer latitude | (Polaris apparent altitude − latitude) |
|---|---|
| 10° N | −0.53° to **+0.71°** |
| 20° N | −0.58° to +0.67° |
| 35° N | −0.60° to +0.65° |
| 51.48° N | −0.62° to +0.64° |
| 65° N | −0.62° to +0.64° |
| 80° N | **−0.63°** to +0.63° |

So: **the naive rule is wrong by up to 0.71°, in a direction that depends on the
time of night.** The spread is mostly the pole offset projected onto the vertical;
the slight asymmetry at low latitudes is refraction, which lifts a low Polaris more
than a high one.

The app computes the true pole altitude and shows the learner the correction. This
is the moment it demonstrably knows more than the folklore, and it costs nothing.

**True north celestial pole altitude = observer latitude, exactly, by geometry.**
No ephemeris needed. Refraction then lifts the *apparent* pole slightly.

## 4. Atmospheric refraction

The atmosphere bends light, lifting everything toward the zenith. It is the largest
systematic correction a naked-eye observer never thinks about.

**Measured** (`Refraction('normal', h)`, h = **true** altitude):

| True altitude | Refraction |
|---|---|
| 0° | 28.98′ |
| 0.5° | 25.00′ |
| 1° | 21.74′ |
| 2° | 16.93′ |
| 5° | 9.67′ |
| 10° | 5.41′ |
| 20° | 2.74′ |
| 45° | 1.01′ |
| 80° | 0.18′ |
| 90° | 0.00′ |

**Do not write a test asserting ~34′ at the horizon.** The familiar 34′ figure is
refraction at *apparent* altitude zero — a body seen on the horizon is truly about
34′ below it. At *true* altitude zero the value is ~29′. The two are different
questions and the distinction has produced a great many wrong tests. Our port takes
a true altitude, so ~29′ is the correct expectation.

The only invariants worth testing are the shape ones: strictly decreasing with
altitude, ~0 at the zenith, and between 25′ and 35′ at the horizon.

## 5. Horizon dip

From elevation `h` metres above sea level, the visible horizon lies below the
astronomical horizon by approximately:

```
dip (arcminutes) ≈ 1.76 × √h
```

About 5.6′ from a 10 m dune, 17.6′ from a 100 m clifftop. This matters for any
measurement taken *up from the visible horizon*, which is most of them, and it is
one of the reasons a careful learner still reads slightly high. `astronomy-engine`
does not do this for you — it belongs in `geo.ts` (`horizonDip`).

## 6. The sun: altitude, noon, and why your watch lies

**Solar declination** runs between ±23.44° over the year.

**Noon altitude = 90° − |latitude − declination|.**

Write it with the absolute value. The commonly quoted `90 − lat + dec` is only
valid when the sun is *south* of the zenith, and it fails in the tropics:
**measured at latitude 0 on the June solstice, the true noon altitude is 66.57°,
while `90 − 0 + 23.44` gives 113.44°** — a nonsense figure above the zenith. The
absolute-value form is correct at every latitude, and was confirmed to 0.006° at
latitudes 0, 35 and 51.48.

### Solar time versus clock time

The gap between true solar noon and 12:00 on a phone has three independent causes,
and they stack:

1. **Equation of time** — the sun's own irregularity, from Earth's elliptical orbit
   and axial tilt. **Measured for 2026: from −14.18 min on 11 February to +16.45
   min on 3 November, crossing zero four times.** Bounded within ±16.5 min.
2. **Longitude offset within the time zone** — 4 minutes per degree from the zone's
   central meridian. A zone spanning 30° of longitude puts its edges an hour apart.
3. **Daylight saving** — a flat hour, applied politically.

`astronomy-engine` has **no `EquationOfTime` export**. Derive it: for an observer at
longitude 0, mean solar noon is 12:00 UT, so

```
equationOfTime = 12:00 UT − (time of the sun's upper transit at longitude 0)
```

which reproduces the published extremes above exactly.

**Two measured examples, both worth putting in front of a user:**

- **London, 3 November 2026** (GMT, no DST): true solar noon at **11:43:33** — the
  sun is at its highest 16 minutes *before* the clock says noon.
- **Madrid, 21 June 2026** (CEST): true solar noon at **14:16:37 local clock time**.
  The sun peaks at quarter past two in the afternoon. Spain keeps central European
  time despite sitting at Greenwich's longitude, and the solstice stacks all three
  effects the same way.

That second one is the single most persuasive fact in this product. A user who
learns nothing else will remember that their clock is two and a quarter hours out
of step with the sky.

Upper transit is `SearchHourAngle(Body.Sun, observer, 0, date, 1)`.

## 7. Twilight

Defined by the sun's altitude below the horizon: **civil −6°, nautical −12°,
astronomical −18°**. Use `SearchAltitude(body, observer, direction, startTime,
limitDays, altitude)` — note the altitude argument comes **last**.

For star work, nautical twilight (−12°) is the right gate: the horizon is still
faintly visible while the navigational stars are out, which is exactly the
condition the technique was designed for. Astronomical twilight is stricter than
this product needs and would refuse to run on a perfectly good evening.

## 8. Rise and set

`SearchRiseSet` uses the standard −0.833° convention (refraction plus, for the sun
and moon, semidiameter). Two consequences that surprise people, both measured:

- **Day length at the equator is 12.11 hours, not 12.00**, and it barely varies:
  measured 12.108 h at the March equinox, 12.122 h at the June solstice, 12.108 h
  in September, 12.126 h in December — a spread of about one minute across the
  whole year. The seven-minute excess over 12 h is refraction and semidiameter
  making the sun appear to rise early and set late. It is not an error.
- **A body of zero declination does not rise exactly due east.** Alnilam
  (dec −1.2°) was measured rising at azimuth 91.19° at the equator, 91.05° at 35°N,
  91.19° at 51.5°N and 91.59° at 65°N. Close enough to teach "Orion's belt rises
  due east" honestly, but a test demanding exactly 90° will fail.

**Rise and set are not always defined.** Above the Arctic and Antarctic circles the
sun does neither for part of the year, and Polaris never sets for most of our
audience. This is why `riseSet` returns a `Result` with `body-never-rises` and
`body-always-up` rather than throwing. At high latitudes these are the normal case,
not the error case.

A star is **circumpolar** (never sets) when `declination > 90° − latitude`, and
never rises when `declination < latitude − 90°`.

## 9. Sidereal time

The stars return to the same place 3 minutes 56 seconds earlier each solar day.
**Measured: local sidereal time advances 360.9856° per 24 hours of solar time** —
exact to four decimal places against the standard constant. This is what makes the
Big Dipper usable as a 24-hour clock face around Polaris, and it is the basis of the
future star-clock skill.

## 10. Hand angles, and why the folk rules are not good enough

At arm's length, for a typical adult:

| Gesture | Approximate angle |
|---|---|
| Little-finger width | ~1° |
| Three middle fingers | ~5° |
| Clenched fist | ~10° |
| Outstretched hand span (thumb to little finger) | ~20° |

These are **population averages and nothing more.** The ratio that governs them is
finger width to arm length, which varies substantially between people — and the
commonly taught navigation rule "four fingers is one hour of the sun's travel"
implies 3.75° per finger against a real value nearer 1.5–2°, an error of about a
factor of two.

Shipping these constants as though they were true would put a systematic error into
every hand measurement in the product. So the app measures the user's own hand once
against a known angle and stores the result. Anything derived from an uncalibrated
hand must be labelled `population-default` in the data and hedged in the UI.

## 11. Golden values for the test suite

These were measured during specification and may be used as regression anchors,
**but they are not a substitute for externally sourced golden values** (see
`docs/05-testing.md`). Their role is to catch a change in behaviour, not to prove
correctness — they came from the same library they would be testing.

| Quantity | Value | Conditions |
|---|---|---|
| Polaris offset from pole, apparent | 0.62° | 2026, of-date |
| Polaris offset from pole, J2000 | 0.736° | epoch-bug tripwire |
| max abs(Polaris altitude − latitude) | 0.71° | lat 10–80°N, whole year |
| Refraction at true altitude 0 | 28.98′ | `'normal'` |
| Equation of time, 2026 range | −14.18 to +16.45 min | Feb 11 / Nov 3 |
| Sidereal advance per solar day | 360.9856° | — |
| Day length at equator | 12.11 h | ±0.01 h all year |
| Solar noon, London 2026-11-03 | 11:43:33 UTC | — |
| Solar noon, Madrid 2026-06-21 | 14:16:37 local | CEST |
| Solstice noon altitude, lat 0 | 66.57° | = 90 − abs(0 − 23.44) |

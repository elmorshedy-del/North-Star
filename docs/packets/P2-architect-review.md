# P2 — Architect review brief

**Packet:** `docs/packets/P2-ephemeris-adapter.md`
**Please treat this as the list of behaviour I had to choose.** Rulings in
`docs/07-standing-rulings.md` were followed and are not re-asked.

---

## 1. Invariant 15 is not in this packet

`docs/05-testing.md` Defence 2 lists fifteen invariants. #15 is `sightedAltitude`
(level phone → 0°, zenith → 90°). That function is P4 (`measurement.ts`) and
does not exist yet. Implementing it here would be working ahead.

**In this packet:** invariants 1–14. #13 and #14 are restated because the packet
asked for all fifteen that this layer can actually run.

**Please confirm:** P4 owns #15.

---

## 2. `riseSet` / `altitudeCrossing` search window is 2 days

The port says "next" rise or set. `SearchRiseSet` with `limitDays = 365` would
return the August sunrise from a June Arctic context, which fails the required
`body-always-up` outcome.

**Now:** search 2 days (enough to straddle midnight, not enough to jump a polar
season). If the search returns null, classify by altitude at **upper transit**
against the threshold (−0.833° for rise/set, the requested altitude for a
crossing): above → `body-always-up`, below → `body-never-rises`. Using the
call instant would make a polar-night noon look like `body-always-up` on any
day whose midnight sample is obviously below the threshold.

**Look at:** `astronomy-engine-ephemeris.ts` — `SEARCH_DAYS`, `missingEvent`

---

## 3. `equationOfTime` uses the UTC date of the context, observer at (0°, 0°)

The packet defines EoT as `12:00 UT − transit at longitude 0 that day`. "That
day" is the UTC civil date of `context.instant`. Latitude does not move the
meridian; I use 0°.

**Look at:** `equationOfTime`

---

## 4. `horizontalOf` always reports `refracted: true`

The packet's of-date example uses `Horizon(..., 'normal')`, which applies
refraction. There is no port flag to request an airless reduction.

---

## 5. Golden sources (what the audit checks first)

| Quantity | Source | Value |
|---|---|---|
| Greenwich sunrise / sunset / solar noon, 2026-11-03 | [NOAA Solar Calculator](https://gml.noaa.gov/grad/solcalc/table.php?name=Greenwich&lat=51.4779&lon=-0.0015&year=2026&tz=0) 51.4779 N 0.0015 W | 06:57, 16:29, **11:43:31** UTC |
| London nautical twilight, 2026-11-03 | [timeanddate.com, London November 2026](https://www.timeanddate.com/sun/uk/london?month=11&year=2026) | 05:42 / 17:44 GMT |
| Star J2000 catalogue | `docs/03-astronomy.md` §2 | RA/Dec table |
| Invariant tolerances | `docs/05-testing.md` Defence 2, `docs/03-astronomy.md` | as written |

NOAA's Greenwich solar noon is **11:43:31**. The packet probe says 11:43:33 ± 2 s.
The golden test uses 11:43:33 ± 2 s (the probe number). NOAA sits 2 s earlier,
inside that window. "London" here is Greenwich 51.4779 N 0.0015 W — the
coordinates in `docs/05-testing.md` and the source of the 11:43:33 figure.
City-of-London (−0.13°) is ~30 s later and would miss the ±2 s gate.

---

## 6. Probe #2 is 0.7144° against a published ≤ 0.71° — not widening

The step-2 probe asks for `max abs(Polaris apparent altitude − latitude) ≤ 0.71°`.
A full hourly sweep of 2026 at latitudes 10, 20, 35, 51.48, 65, 80°N gives
**0.7144°**, at **10°N on 2026-07-23T07:00Z** (signed +0.7144°).

`docs/03-astronomy.md` §3 publishes the 10°N range as −0.53° to **+0.71°**.
0.7144° to two decimals is 0.71°. I believe the spec rounded and the
implementation is the same measurement.

The Defence 2 invariant remains **< 1.0°** — I will not tighten it to 0.71 or
loosen it. I will not change star coordinates or drop refraction to chase the
fourth decimal.

**Please confirm:** 0.71° in the probe is two-decimal rounding, and 0.7144° is
not a defect.

---

## 7. Re-audit — what the first pass did not prove

The first suite could stay green with two real defects:

- Invariant 2 only called `Equator`. A `false` ofdate inside `horizontalOf`
  would still pass. It now also requires `horizontalOf('polaris')` to match
  the of-date `Horizon` and to miss the J2000 `Horizon` by > 0.05°.
- Invariant 5 called `refractionAt` with the *apparent* noon altitude. The
  port takes a true altitude. Predicted is now
  `geometric + refractionAt(geometric)`.
- Azimuth is wrapped with `normalise360` so `Horizontal.azimuth` stays in
  `[0, 360)` as the contract states, including at the poles.

---

## Not raised — covered by standing rulings

- Non-finite input throws (R1). SkyContext is already constructed.
- Polar undefined rise/set is a `Result`, never a throw (R2).
- Timestamps in tests always carry `Z` (R4, R5).
- `.ts` suffixes on every relative import (R8).

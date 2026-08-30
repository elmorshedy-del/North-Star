# P1 — Architect review brief

**PR:** https://github.com/elmorshedy-del/North-Star/pull/1
**Packet:** `docs/packets/P1-domain-primitives.md`

Audit review `5062078502` asked for two blocking fixes, one constructor change,
import-style unification after merging `main`, and two non-blocking nits. Status
below. Please re-audit this branch (now merged with `main`) rather than the
pre-merge green.

---

## Required — fixed

### 1. `instantFromIso` rejects a missing offset

`Date.parse` treats `2026-06-21T12:00:00` as the host zone. That is the ambient
leak this constructor exists to prevent, and voyage mode would replay a different
sky on different machines.

**Now:** throw unless the string ends in `Z` or `±hh:mm`. Naive datetimes and
date-only forms are rejected. `+05:30` is accepted (IST, UTC+5:30).

**Look at:** `packages/core/src/domain/time.ts` — `instantFromIso`
**Tests:** `time.test.ts` — naive reject; `+05:30` → `06:30Z`

### 2. `geoPosition` rejects a non-finite elevation

`NaN` / `Infinity` used to pass the constructor and throw later inside
`horizonDip`, with a stack that said nothing about elevation. P9 will map
`position.coords.altitude`, and `Number(undefined)` is `NaN`.

**Now:** `out-of-range` at the constructor, alongside the latitude check.

**Look at:** `packages/core/src/domain/geo.ts` — `geoPosition`
**Tests:** `geo.test.ts` — `NaN` and `Infinity`

---

## Rulings — applied

1. **Equal Jan/Jul offsets ⇒ not DST — accepted.** Unchanged.
2. **Throw rather than `Result` — accepted.** Unchanged, except naive ISO is now
   rejected (Required 1).
3. **Non-finite epoch throws — accepted.** Unchanged.
4. **Below-sea-level dip clamps to 0 — accepted.** Unchanged.
5. **`timeZone` late failure — accepted with a change.** `timeZone` now probes
   `Intl.DateTimeFormat` (via the per-zone formatter cache) and throws at
   construction. Invalid id test: `Not/AZone`.
6. **Import-style split — fixed on `main`.** Merged `main`. Value imports now
   use the `.ts` suffix, same as type-only imports.

---

## Non-blocking — done

7. **`toCivilTime` formatter cost.** One `Intl.DateTimeFormat` per zone, held in
   a module-level `Map`. Wall-clock parts and the January/July DST probes reuse
   it. `timeZone` validation populates the same cache.
8. **Stale `vitest.config.ts` comment.** Now states the rule: a workspace with
   no tests is a defect, not a pass.
9. **`degreesToHours` range.** No change, as instructed.

---

## Golden-value sources (unchanged)

- London DST 2026: [timeanddate.com, London clock changes](https://www.timeanddate.com/time/change/uk/london) — 29 Mar 01:00 GMT → 02:00 BST.
- Sydney DST 2026: [timeanddate.com, Sydney clock changes](https://www.timeanddate.com/time/change/australia/sydney) — AEDT (UTC+11) in January, AEST (UTC+10) in July.
- IST offset: [timeanddate.com, IST](https://www.timeanddate.com/time/zones/ist) — UTC+5:30 year-round.
- Horizon dip: Nautical Almanac / Bowditch `1.76 × √h` metres → arcminutes, also stated in `docs/03-astronomy.md` §5.

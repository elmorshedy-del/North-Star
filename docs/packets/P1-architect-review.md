# P1 — Architect review brief

**PR:** https://github.com/elmorshedy-del/North-Star/pull/1
**Packet:** `docs/packets/P1-domain-primitives.md`
**Please treat this file as the review checklist for everything I guessed.**
The packet and contracts did not specify these behaviours. Later packets will
inherit them. Accept, reject, or rewrite each numbered item; do not let a silent
assumption survive the gate.

Verify (`npm run verify` and `npm run test:coverage`) is green. That is not the
question here. The question is whether these choices are the ones you wanted.

---

## 1. No-DST zones report `isDaylightSaving: false`

**Look at:** `packages/core/src/domain/time.ts` — `isDaylightSavingAt`

The packet says: compare this instant's offset to the January and July offsets;
the larger of those two is the DST offset in either hemisphere.

It does not say what to do when January and July are equal (UTC, `Africa/Nairobi`,
most of Queensland). I treat equal offsets as "this zone has no DST this year"
and return `false`. Otherwise `current === Math.max(jan, jul)` would be true
year-round and UTC would claim it was on daylight saving.

Southern-hemisphere detection still follows the packet: Sydney in January is DST,
Sydney in July is not. Tested in `time.test.ts`.

**Please confirm:** equal January/July offsets ⇒ not DST.

---

## 2. `instantFromIso` throws on an unparseable string

**Look at:** `packages/core/src/domain/time.ts` — `instantFromIso`
**Contract:** `TimeApi.instantFromIso(iso: string): Instant`

The return type is `Instant`, not `Result`. `invalid-format` exists on
`DomainErrorCode` but this function cannot return it without changing the
contract, which I must not do.

I throw. That matches the unit constructors: bad input here is a programmer
error (a bad literal or a bad log line at the adapter boundary), not a user
action.

`Date.parse` accepts naive datetimes (`2026-03-29T12:00:00` with no `Z` or
offset). In ES that is local time — an ambient-zone read. Tests only pass `Z`
suffixes. I did not reject missing offsets, because the packet did not ask for
a parser policy.

**Please confirm:** throw, not `Result`. And whether naive ISO should be rejected
so `toCivilTime`'s "never read the ambient zone" rule cannot leak in through
construction.

---

## 3. `instant` throws on non-finite epoch milliseconds

**Look at:** `packages/core/src/domain/time.ts` — `instant`
**Contract:** `TimeApi.instant(epochMilliseconds: number): Instant`

The packet names `instantFromIso` / `toIso` / `addDuration` / `durationBetween`
but the contract also requires `instant`. Non-finite input is not mentioned.

I throw, same rule as `degrees` / `radians` / `hours` / `milliseconds`. `NaN` as
an instant would otherwise travel silently into every skill.

**Please confirm:** non-finite epoch ms is programmer error.

---

## 4. `horizonDip` clamps elevation below sea level to zero

**Look at:** `packages/core/src/domain/geo.ts` — `horizonDip`

The packet: dip ≈ `1.76 × √(elevation in metres)`, returns degrees, zero at sea
level, never negative. It does not say what to do with Death Valley (−86 m) or a
bad reading.

`√` of a negative is `NaN`, and `degrees(NaN)` throws. That would turn a real
position into a crash. I clamp `elevationMetres` to `≥ 0` before the square
root, so dip is `0` below sea level. `geoPosition` still stores the raw
elevation; only the dip is clamped.

**Please confirm:** below-sea-level dip is `0`, not a throw and not
`out-of-range`.

---

## 5. `timeZone` is a brand only — no IANA check

**Look at:** `packages/core/src/domain/time.ts` — `timeZone`
**Contract:** `TimeApi.timeZone(id: string): TimeZoneId`

I brand the string and return it. An invented id fails later, when
`Intl.DateTimeFormat` runs inside `toCivilTime` (a `RangeError`). Validating
up front would need a tz-database dependency or a probe `Intl` call in a
constructor the packet did not describe as fallible.

**Please confirm:** late failure in `toCivilTime` is acceptable.

---

## 6. Runtime imports omit the `.ts` suffix

**Look at:** `packages/core/src/domain/index.ts` and the implementation files

Contracts use `import type { … } from './units.contract.ts'`. That is type-only,
so `tsc` accepts the suffix. Value imports (`from './units.ts'`) fail with
TS5097 because `allowImportingTsExtensions` is off, and this packet must not
edit `tsconfig`.

So: type-only imports keep `.ts`; value imports are extensionless. I did not
add a tsconfig flag.

**Please confirm:** this split is the intended module style.

---

## Also recorded, not a behaviour guess

- London DST 2026 golden values: [timeanddate.com/time/change/uk/london](https://www.timeanddate.com/time/change/uk/london) — 29 Mar 01:00 GMT → 02:00 BST.
- Sydney DST 2026: [timeanddate.com/time/change/australia/sydney](https://www.timeanddate.com/time/change/australia/sydney) — AEDT (UTC+11) in January, AEST (UTC+10) in July.
- Horizon dip 100 m → 17.6′: Nautical Almanac / Bowditch `1.76 × √h`, restated in `docs/03-astronomy.md` §5.
- `time.ts` lines 86 and 94 (missing/non-integer `Intl` parts) are untested platform-failure throws. Coverage still clears the thresholds (97.5% statements, 91.66% branches).
- `ResultApi`'s header comment omits `domainError` from the `_contract` example; the interface includes it. The assertion includes `domainError`.

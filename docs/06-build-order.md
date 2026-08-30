# 06 — Build order and review gates

Twelve packets in two phases. Each packet document in `docs/packets/` is
**self-contained**: it restates the interfaces it needs rather than sending you to
another file, because an implementer starting cold on P7 should not have to
reconstruct P1 from memory.

Do one packet at a time. Do not read ahead and do not work ahead.

## Phase 1 — core (headless, fully verifiable in CI)

| Packet | Subject | Depends on |
|---|---|---|
| P1 | Domain primitives — units, time, geo, result, sky context | — |
| P2 | `AstronomyEngineEphemeris` + the invariant suite | P1 |
| P3 | Solar service — solar noon, equation of time, twilight, altitude ↔ time | P1, P2 |
| P4 | Measurement — hand calibration, gravity vector → pitch | P1 |
| P5 | Skill framework — contract satisfaction, registry, grading | P1 |
| P6 | Skill A: Polaris latitude | P2, P3, P5 |
| P7 | Skill B: sun time | P3, P5 |

At the end of Phase 1 the product is complete and correct with no user interface.
That is deliberate: everything hard is finished and proven before anything visual
is argued about.

## Phase 2 — the browser prototype

| Packet | Subject | Depends on |
|---|---|---|
| P8 | Vite + React shell, routing, design tokens | P1 |
| P9 | Browser adapters — clock, geolocation, orientation, storage | P1 |
| P10 | Screens — Home, Teach, Calibrate, Measure, Result | P6, P7, P8, P9 |
| P11 | DevSky override panel | P9, P10 |
| P12 | Playwright E2E + GitHub Pages deploy | P10, P11 |

**P11 is load-bearing well beyond its size.** Overriding position and time is how
the night skill gets tested at midday, how Playwright drives the prototype without a
sky, and it is *the same seam voyage mode uses later*.

## Phase 3+ (specified, not scheduled)

Expo app reusing `packages/core` verbatim; then voyage mode; then the southern-sky
and star-clock skills.

## The review gate

After each packet:

1. The implementer runs `npm run verify` and pastes the output.
2. The architect audits the diff against the rubric below.
3. Findings come back as a numbered list. **The packet is not done until they are
   resolved.**

Nothing proceeds to the next packet with a red pipeline or unresolved findings. A
wrong assumption in P1 is cheap; the same assumption discovered in P7 has three
packets built on top of it.

## Audit rubric

- **Architecture** — dependency rule and library containment intact; no
  `eslint-disable`; no contract or port file modified; `EphemerisPort` not widened.
- **Types** — no `any`, no non-null assertions, no casts used to defeat the unit
  brands; contract satisfaction assertion present.
- **Tests** — golden values externally cited, never generated from our own output;
  the relevant invariants from `docs/05-testing.md` actually covered; tests not
  modified to pass; edge cases present (poles, antimeridian, DST, gate boundaries).
- **Correctness** — the astronomy traps in `docs/03-astronomy.md` handled: `ofdate`
  is true, refraction stated against *true* altitude, noon altitude uses the
  absolute-value form, rise/set treated as possibly undefined.
- **Craft** — no dead code, no speculative abstraction, comments explain *why*,
  errors handle real failure modes (permission denied, no fix, no sensors).

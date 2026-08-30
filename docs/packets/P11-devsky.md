# P11 — DevSky override panel

**Depends on:** P9, P10.
**You are building:** a small panel that is far more load-bearing than its size.

## Why this matters more than it looks

Overriding position and time is:

1. **How the night skill gets tested at midday.** Otherwise nobody can work on the
   Polaris skill between April and September without staying up.
2. **How Playwright drives the prototype** (P12) with no sky and no GPS.
3. **The exact seam voyage mode uses later.** A historical voyage is a position and
   a date — the same override, fed from a log entry instead of a form.

Build it as though it were a product feature, because in the next phase it becomes
one.

## Files you may create

```
apps/web/src/screens/DevSky.tsx
apps/web/src/state/sky-source.ts    (or wherever P10 put context composition)
+ tests
```

## What to implement

A `/dev` route with:

- Latitude, longitude, elevation inputs
- Date and time inputs, plus an IANA time-zone selector. **It must be a picker
  over a fixed list of valid zones, never a free-text field.** `timeZone()` in
  the domain validates eagerly and throws on an unknown id, on the assumption
  that an invalid zone is programmer error rather than something a user can
  type. A free-text box breaks that assumption and turns a typo into a crash.
- A set of one-tap presets — they save real time and encode the interesting cases:
  Greenwich, the equator, 78°N (Arctic, for always-up and never-rises), 40.4°N
  −3.7°E (Madrid, the two-hour solar-clock gap), and the antimeridian
- A clear **Reset to live** control

When an override is active:

- The `SkyContext` provenance becomes **`'simulated'`**
- A **persistent, unmissable banner** appears on every screen, not just `/dev`

That banner is not decoration. `countsTowardProgress` already refuses to credit a
simulated attempt, and the UI must be equally honest: a simulated fix that looks
real is a lie to the user and a cheat code for the streak.

Persist the override in `sessionStorage`, not `localStorage` — it should not survive
a browser restart and quietly convince someone their app is broken. Build the key
with `storageKey()` from `@cnav/brand`, as everywhere else.

## Acceptance tests

- Setting an override changes the resolved `SkyContext` to those values
- Provenance becomes `'simulated'` and `countsTowardProgress` is false
- The banner appears on **every** route while an override is active
- Reset restores the live clock and location, and provenance returns to `'live'`
- Each preset produces the position it claims
- An invalid input (latitude 91, malformed date) is rejected with a useful message
  rather than producing a broken context
- The override does not persist across a simulated session restart

## Definition of done

```
npm run verify
npm run build -w apps/web
```

Both green, output pasted.

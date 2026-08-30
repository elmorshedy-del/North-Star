# 01 — Architecture

## The decision everything else follows from

**A skill challenge is a pure function of (observer position, instant in time).**

Nothing in `packages/core` reads a clock, a sensor, or the network. Position and
time are injected as a `SkyContext`. Three things fall out of that one rule:

1. **Voyage mode is nearly free.** Feed a historical log entry's position and date
   and the identical skill code replays a real 1768 sight.
2. **Tests are deterministic** with no clock stubbing anywhere.
3. **The dev override panel** that exercises a night skill at midday is the same
   mechanism, not a special case.

If you are ever tempted to reach for the current time inside the core, that is the
rule you are breaking, and lint will stop you.

## Layers

```
packages/core/src/
  domain/          Value objects and entities. Imports NOTHING.
  application/     Use cases and port interfaces. Imports domain only.
  infrastructure/  Adapters. The only place astronomy-engine may appear.
apps/web/          Vite + React browser prototype
apps/mobile/       Expo native app (reserved)
```

**Dependencies point inward, always.** The domain knows nothing about the
application; the application knows nothing about any library or device.

## The three enforced rules

These are not documentation. They are in `eslint.config.js` and they fail the build.

1. **The dependency rule** — `boundaries/dependencies`. Domain may not import
   application; application may not import infrastructure.
2. **Library containment** — `no-restricted-imports`. `astronomy-engine` is
   importable only under `infrastructure/ephemeris/`.
3. **No ambient state** — `no-restricted-syntax` and `no-restricted-globals` ban
   `new Date()` with no arguments, `Date.now()`, `Math.random()`, and `window`,
   `document`, `navigator` and `localStorage` inside the core.

`new Date(epochMs)` **with** an explicit argument is allowed: constructing a moment
from data is fine, reading the ambient clock is not. That distinction is the whole
point, and the rule is written to catch exactly the second case.

### Proving the rules work

```
npm run verify:guardrails
```

`scripts/verify-guardrails.mjs` writes deliberately illegal files, runs ESLint, and
asserts each rule fired — plus a positive control that the sanctioned exception
(the ephemeris adapter) is still allowed. It runs in CI.

A lint rule that has silently stopped working is worse than no rule: it buys false
confidence while the architecture erodes under a green pipeline. This check is the
guard against that, and it should be extended whenever a rule is added.

## Contracts, and why signatures are machine-checked

Architect-owned files — `*.contract.ts` and `*.port.ts` — declare the types **and**
an `Api` interface describing the module's shape. Implementations must end with a
satisfaction assertion:

```ts
const _contract: UnitsApi = { degrees, toRadians, normalise360, /* ... */ };
```

A wrong or missing signature therefore fails `tsc`, not code review. Prose can be
misread; a type error cannot. **These files are never edited by an implementation
packet** — several packets depend on each one, and a silent change breaks work
nobody can see.

## Ports

| Port | Implemented by | Purpose |
|---|---|---|
| `EphemerisPort` | `infrastructure/ephemeris/` | All astronomy |
| `ClockPort` | each app | The only sanctioned clock read |
| `LocationProvider` | each app | GPS |
| `AttitudePort` | each app | Device orientation for sighting |
| `ProgressRepository` | each app | `localStorage` / AsyncStorage |

`EphemerisPort` is deliberately narrow — eight methods, none of them a passthrough.
A port wide enough to expose the whole library is the same as having no port.
**Widening it is an architectural change: escalate, do not improvise.**

Everything except `EphemerisPort` is implemented twice, once per app. That is why
the browser prototype is not throwaway: the native app re-implements four small
adapters and reuses the core unchanged.

## Conventions

- **Degrees everywhere.** Radians live inside a single function and never cross a
  module boundary. Branded types enforce it.
- **`Result`, not exceptions**, for anything a user can trigger. Exceptions are for
  programmer error only. A star that never rises at this latitude is an ordinary
  outcome, not an exception.
- **Branded primitives, not classes**, for value objects. They serialise to plain
  JSON, which matters because progress and voyage logs are persisted.
- **No enums.** `erasableSyntaxOnly` is on; use union types of string literals.
- **Teaching content is data**, defined in `TeachingScript`, never written into
  components. Copy in JSX cannot be tested, reviewed, reused by the native app, or
  translated.

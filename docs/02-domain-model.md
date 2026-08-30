# 02 — Domain model

The authoritative signatures live in the contract files. This document explains the
**decisions** behind them — the reasoning that would otherwise be lost, and that
would be re-argued badly six months from now.

| Concept | File |
|---|---|
| `Result`, `DomainError` | `domain/result.contract.ts` |
| `Degrees`, `Radians`, `Hours`, `Milliseconds` | `domain/units.contract.ts` |
| `Instant`, `TimeZoneId`, `CivilTime` | `domain/time.contract.ts` |
| `GeoPosition`, `Hemisphere` | `domain/geo.contract.ts` |
| `SkyContext`, `Horizontal` | `domain/sky-context.contract.ts` |
| `HandCalibration`, `AttitudeReading` | `domain/measurement.contract.ts` |
| `Estimate`, `Grade`, `GradeScale` | `domain/assessment.contract.ts` |

## Why units are branded types

```ts
export type Degrees = number & { readonly __unit: 'degrees' };
export type Radians = number & { readonly __unit: 'radians' };
```

Mixing degrees and radians is the most common source of silent wrongness in
astronomy code, and it never fails loudly — it produces a plausible wrong answer.
Branding makes it a compile error.

**Why brands rather than classes:** branded numbers serialise to plain JSON
numbers. Progress records and voyage logs are persisted and reloaded, and a class
survives neither `JSON.stringify` nor a bundler boundary intact. The cost is
needing a smart constructor to create one; that cost is worth paying.

## Why `Instant` rather than `Date`

`Date` is mutable, compares badly, serialises inconsistently — and, decisively, its
presence in a signature invites someone to write `new Date()` and read the ambient
clock. `Instant` is a branded epoch-millisecond number. Time enters the system
exactly once, through `ClockPort`, and travels as data thereafter.

`TimeZoneId` is an IANA identifier, never a fixed UTC offset. Offsets change with
DST, and the gap between civil and solar time is the entire payoff of the sun-time
skill.

## `SkyContext` — the seam

```ts
interface SkyContext {
  position: GeoPosition;
  instant: Instant;
  zone: TimeZoneId;
  provenance: 'live' | 'simulated';
}
```

`provenance` is not decoration. A simulated fix must never be presented as a real
one, and progress earned against a simulated sky must never count toward a practice
streak — otherwise the developer override panel is a cheat code. `countsTowardProgress`
returns true only for `'live'`.

## `Result` instead of exceptions

Anything a user can trigger is a modelled outcome, not an exception: a denied
location permission, a star that never rises at this latitude, a latitude out of
range. At high latitudes "the sun does not rise today" is the *normal* case.
Exceptions are reserved for programmer error.

Note the asymmetry in `geoPosition`: latitude out of range is **rejected**, but
longitude is **normalised**. Wrapping is correct behaviour at the antimeridian —
181° really is −179° — and a device can legitimately report 180.0000001.

## `Grade` carries a signed error

Direction is the coachable signal. A learner who consistently reads *high* is making
one specific, fixable mistake — usually a bent arm, or measuring from a treeline
rather than the true horizon. A bare magnitude cannot tell them that, so `Grade`
carries `signedError` alongside `errorMagnitude`.

Bearing errors must use shortest-way-round: guessing 359° against a truth of 1° is
an error of −2°, not +358°.

## `HandCalibration` is a first-class entity

The folk rules are wrong — see `docs/03-astronomy.md` §10. "Four fingers is one
hour" implies 3.75° per finger against a real value nearer 1.5–2°, and the true
figure varies between people because it depends on finger width relative to arm
length.

So calibration is measured, stored, and stamped with its `method`. A calibration
marked `population-default` is an average and must be labelled as such in the UI;
one marked `known-angle` was measured by this user and can be trusted.
`calibrateFromKnownAngle` rejects an implied value outside 0.5–5° per finger: that
means the user miscounted, and silently accepting it would poison every later
measurement in the app.

## Skills

`SkillDefinition` (in `application/skills/skill.contract.ts`) is four things and
nothing more: it knows when it is **possible**, it knows the **truth**, it can
**grade** a guess, and it can **teach** itself. Screens, progress and streaks live
outside it.

`Availability` requires a user-facing `reason` when unavailable, and an
`availableAt` when the sky will permit it. Silently hiding a skill teaches nothing;
"Polaris is below your horizon — you are too far south for this one" teaches
something real.

`TeachingScript` is data. Instructional prose inside a component cannot be tested,
reviewed as content, reused by the native app, or translated. If you find yourself
writing teaching copy in JSX, you have taken a wrong turn.

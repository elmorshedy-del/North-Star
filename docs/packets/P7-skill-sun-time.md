# P7 — Skill B: tell the time from the sun

**Depends on:** P3 (solar service), P5 (framework).
**You are building:** the day skill, which completes Phase 1.

Read `docs/04-skills.md` §Skill B for the full teaching copy.

## Files you may create

```
packages/core/src/application/skills/sun-time.ts
packages/core/src/application/skills/sun-time.test.ts
```

You may edit `registry.ts` to register the skill.

## Files you must NOT touch

Any `*.contract.ts` or `*.port.ts`.

## Safety — implement this first

`teach.safety` is **required and non-skippable**:

> "Never look directly at the sun, and never sight along the phone straight at it.
> Judge its height by the shadow you cast, or glance only at the sky beside it. Eyes
> do not heal from this."

Any UI presenting this skill must render it before any measurement. That is a
requirement on P10, but the content originates here and must not be omitted or
softened.

## What to implement

A `SkillDefinition` with `id: 'sun-time'`, `timeOfDay: 'day'`,
`estimateKind: 'instant'`, methods `['hand-span', 'device-sight', 'direct-entry']`,
and `gradeScale: { unit: 'minutes', bullseye: 10, close: 20, fair: 40 }`.

### `availability(context, ephemeris)`

| Condition | Reason | `availableAt` |
|---|---|---|
| sun altitude < 5° | too low — refraction and haze make it unreliable | next crossing of +5° |

### `truth(context, ephemeris)`

**The truth is the civil clock time at the observer's location** — what their phone
would say. Not solar time.

That is the honest target because it is the answer a person actually wants, and it
forces the app to confront the solar-versus-clock gap rather than quietly grading
against solar time and calling it a win. The gap is the most memorable thing in this
product; grading around it would throw the payoff away.

### `grade(estimate, truth, context)`

- Signed error in minutes: negative is early, positive is late.
- **Be honest about method degradation near noon.** The sun's altitude changes
  slowly around its peak, so altitude is a poor clock there. When the attempt was
  made within roughly an hour of true solar noon, the explanation must say so rather
  than blaming the learner for a bad reading. Getting this right is the difference
  between feedback that teaches and feedback that discourages.
- Away from noon, relate the error to the sun's motion: 15° per hour, so one degree
  is about four minutes.

### The result payload carries the payoff

`grade` must produce an explanation that surfaces `SolarClockGap` from P3 — the
three named contributions (equation of time, longitude offset within the zone, and
daylight saving) summing to the total.

Madrid on 21 June 2026 reaches solar noon at 14:16 local clock time; London on
3 November 2026 reaches it at 11:43. A user who learns nothing else from this app
will remember that their clock and the sky are out of step, and why.

## Acceptance tests

Fake ephemeris throughout, except one integration test.

Availability:
- sun at −5° → unavailable, `availableAt` is the next +5° crossing
- sun at exactly +5° → available (boundary inclusive)
- sun at +40° → available

Truth and grading:
- `truth` returns the context's own instant, in the context's zone
- Exact guess → `bullseye`, `signedError` 0
- Errors of exactly 10, 20, 40 minutes land on the band boundaries
- A guess an hour early gives `signedError` −60 and band `'off'`
- An attempt within an hour of solar noon produces an explanation mentioning the
  reduced precision; one at 3 h from noon does not
- The explanation names all three gap components

One integration test with the real adapter: **Madrid, 2026-06-21 — assert the
solar-clock gap is about 2 h 16 min**, citing `docs/03-astronomy.md` §6 as a
regression anchor, not a golden value.

## Definition of done

```
npm run verify
npm run test:coverage
```

Both green, output pasted.

**Phase 1 ends here.** At this point the product is complete and correct with no
user interface at all — everything hard is finished and proven before anything
visual is argued about. Confirm in your handoff that both skills are registered and
that `availableNow` returns both with sensible availability for a live context.

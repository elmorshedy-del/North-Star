# P10 — Screens

**Depends on:** P6, P7 (skills), P8 (shell), P9 (adapters).
**You are building:** the five screens that make this a usable app.

## Files you may create

Everything under `apps/web/src/screens/` and `apps/web/src/components/`.

## Files you must NOT touch

Anything in `packages/core/src`. Any `*.contract.ts` or `*.port.ts`.

**Do not write teaching copy in components.** All instructional content comes from
`skill.teach` (a `TeachingScript`). If you find yourself typing a sentence of
teaching prose into JSX, stop — it belongs in the skill definition, where it can be
tested, reviewed, reused by the native app, and translated.

## Screens

### Home — `/`
Calls `availableNow(context, ephemeris)` and renders **every** skill, not a filtered
list:

- **Available now** — prominent, tappable.
- **Not right now** — quieter, showing the `reason` and, where `availableAt` exists,
  when the sky will relent ("Polaris is up, but it isn't dark enough yet — try after
  21:14").

That framing turns a refusal into a reason to come back after dark. It is the whole
character of the home screen; do not reduce it to hiding what is unavailable.

Handle the states honestly: no location permission, no fix yet, and location denied
each need their own copy and a way forward. A spinner that never resolves is the
most common failure of apps like this.

### Teach — `/skill/:id`
Renders `teach.why`, then `teach.steps`, then `teach.commonMistakes`. If
`teach.safety` is present it is shown **prominently and is not skippable** — the sun
skill's warning is not a formality.

### Calibrate — `/calibrate`
Hand calibration. The user sights a known angle, counts hand units, and gets a
personal calibration stored via `ProgressRepository`.

Explain **why** this exists — the folk rules are wrong by roughly a factor of two
and vary between people. A user who understands that will do it carefully; one who
thinks it is a setup chore will guess, and poison every later measurement.

Uncalibrated users may still proceed on `populationDefaultCalibration`, but anything
derived from it must be visibly hedged as an average.

### Measure — `/skill/:id/measure`
Input, driven by `skill.supportedMethods`:

- `hand-span` — counters for fingers, fists, spans.
- `device-sight` — live inclinometer. **Entered via a button press**, because iOS
  requires the permission call to originate in a user gesture (P9). Show the live
  angle, use `isSteady` to gate capture, and use `averagedAltitude` over the steady
  window rather than one instantaneous sample.
- `direct-entry` — a plain time or number input.

The user commits an estimate before seeing anything about the truth. **Never reveal
the answer before they commit** — that is the entire product.

### Result — `/skill/:id/result`
The grade: band, signed error in natural units, headline, explanation. Then the
skill-specific payoff:

- **Polaris** — the pole correction. Where Polaris actually was relative to the true
  pole, so a learner who measured perfectly and landed 0.6° out learns why.
- **Sun time** — the three-part `SolarClockGap` breakdown. This is the most
  memorable thing in the app.

If the attempt ran against a simulated sky, **say so on this screen.** It must never
look like a real fix.

## Wiring

Compose the adapters once, at the app root, and pass them down. Do not construct
adapters inside screens; the composition root is what keeps the screens testable and
the dependency direction honest.

## Acceptance tests

Component tests with fake adapters and the fake ephemeris:

- Home lists available and unavailable skills, showing reasons and `availableAt`
- Home renders sensible states for permission denied, no fix, and location loading
- Teach renders every part of the script; safety is present and prominent for the
  sun skill
- Measure does not display truth or grade before the estimate is committed
- Measure shows the correct input for each `supportedMethod`
- Result renders band, signed error, and explanation
- Result shows a clear simulated-sky marker for a `'simulated'` context
- Calibrate stores a calibration and rejects an implausible one with a useful message

## Definition of done

```
npm run verify
npm run build -w apps/web
```

Both green, output pasted.

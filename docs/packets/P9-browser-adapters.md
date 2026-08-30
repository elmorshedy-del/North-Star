# P9 — Browser adapters: clock, location, orientation, storage

**Depends on:** P1, P8.
**You are building:** the four platform adapters that let the pure core run in a
browser. This is where the hard-won platform knowledge lives.

## Files you may create

```
apps/web/src/adapters/browser-clock.ts            + test
apps/web/src/adapters/browser-location.ts         + test
apps/web/src/adapters/browser-attitude.ts         + test
apps/web/src/adapters/local-storage-progress.ts   + test
```

## Files you must NOT touch

Anything in `packages/core/src`. Any `*.contract.ts` or `*.port.ts`.

## The interfaces you are implementing

```ts
interface ClockPort { now(): Instant; currentZone(): TimeZoneId }

interface LocationProvider { current(): Promise<Result<LocationFix, LocationError>> }
// LocationError code: 'permission-denied' | 'position-unavailable' | 'timeout' | 'unsupported'
// LocationFix: { position: GeoPosition; at: Instant; accuracyMetres: number }

interface AttitudePort {
  isSupported(): boolean;
  requestPermission(): Promise<Result<'granted', AttitudeError>>;
  subscribe(listener: (reading: AttitudeReading) => void): () => void;   // returns unsubscribe
}

interface ProgressRepository {
  load(): Promise<LearnerProfile>;
  save(profile: LearnerProfile): Promise<void>;
}
```

`AttitudeReading` is `{ gravity: { x, y, z }, at: Instant, accuracy }`.

## Platform traps — read all of these before writing code

These are the reasons this packet exists as its own unit. Each one silently produces
a broken app rather than an error.

### Secure context is mandatory
Geolocation and motion sensors are **unavailable over plain HTTP**, and they fail
quietly rather than throwing something useful. This is why the prototype deploys to
GitHub Pages (HTTPS) and why testing over a bare LAN address will appear to work and
then not.

### iOS gates motion behind a user gesture
`DeviceOrientationEvent.requestPermission()` and
`DeviceMotionEvent.requestPermission()` exist **only on iOS Safari**, and must be
called **synchronously inside a real user-gesture handler.** Calling on mount, or
after an `await`, silently yields nothing — no error, no events, no prompt.

Consequence for P10: any screen needing attitude must be entered through a button
press. That is a hard platform constraint, not a design preference.

Feature-detect the function; do not sniff the user agent. Android exposes the events
with no prompt at all.

### Two different orientation events
Android fires `deviceorientationabsolute`; iOS provides `webkitCompassHeading` on
the standard `deviceorientation` event. Subscribe to both and prefer whichever the
platform actually delivers.

### Prefer the gravity vector
`DeviceMotionEvent.accelerationIncludingGravity` gives the vector `sightedAltitude`
(P4) wants directly. `DeviceOrientationEvent`'s Euler angles need conversion and are
gimbal-prone near vertical — which is exactly where this app takes its measurements.
Prefer motion; fall back to orientation.

**P4 pinned a sign convention: 0° flat, +90° at the zenith.** Verify it on a real
device. If a platform disagrees, **report it — do not silently flip a sign here.**
A quiet correction in one adapter that contradicts the core's tested convention is
how a bug becomes permanent.

### `localStorage` can throw
Not merely return null — Safari private mode throws on **write**. Wrap every access
in `try`/`catch` and degrade to an in-memory profile rather than crashing. A user
who cannot save progress should still be able to use the app tonight.

## What to implement

- **`browser-clock.ts`** — `Date.now()` and
  `Intl.DateTimeFormat().resolvedOptions().timeZone`. This is a sanctioned clock
  read: it is an app-layer adapter, not core, which is exactly the boundary the lint
  rule draws.
- **`browser-location.ts`** — `navigator.geolocation.getCurrentPosition` with a
  sensible timeout and `enableHighAccuracy`. Map every `PositionError` code onto the
  right `LocationErrorCode`, and handle `navigator.geolocation` being absent.
- **`browser-attitude.ts`** — as above. `isSupported` must be honest, and
  `subscribe` must return a working unsubscribe that removes every listener it added.
- **`local-storage-progress.ts`** — versioned JSON under one key. **Validate on
  read**: stored data is untrusted input, it may come from an older build, and a
  malformed profile must degrade to an empty one rather than crash the app.

  **Build the key with `storageKey()` from `@cnav/brand`** — never from the product
  name. That helper is deliberately backed by a fixed namespace that does not follow
  the brand: if storage keys tracked the name, renaming the product would silently
  orphan every user's saved calibration and progress. They would open the app to
  find their work gone and no explanation for it. Storage keys are a data migration,
  not a label.

## Acceptance tests

Test with fakes and stubs; no real device needed.

- Location: each `PositionError` code maps to the right `LocationErrorCode`
- Location: `navigator.geolocation` absent → `'unsupported'`, never a throw
- Attitude: `isSupported` false when neither event exists
- Attitude: `requestPermission` handles the function being absent (Android) by
  succeeding, and a rejection by returning `'permission-denied'`
- Attitude: `subscribe`'s unsubscribe actually removes the listeners — assert no
  further callbacks after it runs
- Storage: round-trips a profile
- Storage: a corrupt JSON string yields an empty profile, not a throw
- Storage: a profile from an unknown schema version is discarded cleanly
- Storage: a throwing `setItem` (private mode) degrades to memory without crashing
- Clock: `currentZone` returns a plausible IANA identifier

## Definition of done

```
npm run verify
npm run build -w apps/web
```

Both green, output pasted. **List in your handoff every platform behaviour you could
not verify without a real device** — that list is what the human tester checks on
their phone, and an honest one is worth more than a confident guess.

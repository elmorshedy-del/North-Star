# P4 — Measurement: hands and the phone-as-sextant

**Depends on:** P1 (domain primitives).
**You are building:** the maths that turns a human gesture or a tilted phone into
an angle.

No astronomy in this packet. It is pure geometry and calibration, and it is
completely testable with synthetic inputs.

## Files you may create

```
packages/core/src/domain/measurement.ts
packages/core/src/domain/measurement.test.ts
```

## Files you must NOT touch

Any `*.contract.ts` or `*.port.ts`.

## The interface you are implementing

From `domain/measurement.contract.ts`, restated:

```ts
interface HandSpanCount { fingers: number; fists: number; spans: number }

interface HandCalibration {
  degreesPerFinger: Degrees;
  degreesPerFist: Degrees;
  degreesPerSpan: Degrees;
  method: 'known-angle' | 'population-default';
  calibratedAt: Instant;
}

interface GravityVector { x: number; y: number; z: number }  // W3C axes
interface AttitudeReading { gravity: GravityVector; at: Instant; accuracy: SensorAccuracy }

interface MeasurementApi {
  populationDefaultCalibration(at: Instant): HandCalibration;
  calibrateFromKnownAngle(knownAngle, counted, at): Result<HandCalibration, DomainError>;
  angleFromHandUnits(calibration, counted): Degrees;
  sightedAltitude(reading: AttitudeReading): Degrees;
  isSteady(readings, window: Milliseconds, tolerance: Degrees): boolean;
  averagedAltitude(readings): Result<Degrees, DomainError>;
}
```

End the module with `const _contract: MeasurementApi = { ... };` so the compiler
checks your signatures.

## What to implement

### `populationDefaultCalibration`
Little finger ≈ 1°, fist ≈ 10°, span ≈ 20°. Marked **`'population-default'`**, and
the UI is required to hedge anything derived from it.

These are averages and nothing more. The commonly taught "four fingers is one hour"
implies 3.75° per finger against a real value nearer 1.5–2° — wrong by about a
factor of two. That error is precisely why calibration exists, so do not quietly
present these constants as truth.

### `calibrateFromKnownAngle(knownAngle, counted, at)`
Divide the known angle by the counted units to get the user's personal
degrees-per-unit, scaling the other two units proportionally from the population
ratios (finger : fist : span = 1 : 10 : 20).

**Reject with `out-of-range` if the implied degrees-per-finger falls outside
0.5–5°.** That means the user miscounted, and silently accepting it would poison
every measurement they take afterwards. Also reject a `counted` that is all zeros —
dividing by nothing must not yield `Infinity`.

### `angleFromHandUnits`
`fingers × perFinger + fists × perFist + spans × perSpan`. Linear and total.

### `sightedAltitude(reading)`
The angle of the phone's long edge above horizontal, from the gravity vector.

Normalise the vector first — magnitude is meaningless and platforms differ. With
W3C axes (+x right, +y top, +z out of the screen), the elevation of the device's
+y axis above the horizontal plane is:

```
altitude = asin( -gy / |g| )        // in degrees, via the domain unit helpers
```

Sign convention: **0° when the phone is flat and level, +90° when its top edge
points at the zenith.** Verify this against a real device during P9 and report any
platform disagreement rather than silently flipping a sign here.

It must **not fold back past vertical** — tilting beyond the zenith should continue
past 90 or clamp deliberately, never mirror down. A mirrored reading is the classic
inclinometer bug and it is invisible until someone is standing outside in the dark.

**Reject a zero-magnitude vector.** A device in free fall, or a sensor returning
nothing, must not produce `NaN` that propagates into a grade.

### `isSteady(readings, window, tolerance)`
True when all readings inside `window` of the most recent one lie within `tolerance`
of each other. A sight taken while the phone is moving is the dominant error source
in the field — well ahead of sensor noise — so this gate matters more than it looks.

### `averagedAltitude(readings)`
Mean sighted altitude across the readings. Errors on an empty array.

## Acceptance tests

All synthetic. No device and no sky required.

- `sightedAltitude`: `(0, −1, 0)` → 90°; `(0, 0, −1)` → 0°; `(0, −0.7071, −0.7071)` → 45°
- `sightedAltitude` is invariant to vector magnitude: scale an input by 100 and by
  0.01 and get the same answer
- `sightedAltitude` errors or rejects on a zero vector — assert no `NaN` escapes
- Past-vertical behaviour is asserted explicitly, whichever behaviour you chose
- `calibrateFromKnownAngle`: 10° over 5 fingers → 2°/finger, accepted
- `calibrateFromKnownAngle`: 10° over 30 fingers → 0.33°/finger, **rejected**
- `calibrateFromKnownAngle`: 90° over 2 fingers → **rejected**
- `calibrateFromKnownAngle` with all-zero counts → rejected, no `Infinity`
- `angleFromHandUnits` is linear and additive; zero counts give zero
- `isSteady`: identical readings true; one outlier inside the window false; an
  outlier *outside* the window true
- `averagedAltitude` on an empty array returns an error, not `NaN`

## Definition of done

```
npm run verify
npm run test:coverage
```

Both green, output pasted. State in your handoff which sign convention you chose
for `sightedAltitude` and which test pins it — P9 and P10 depend on that answer.

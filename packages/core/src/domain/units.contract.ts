/**
 * Angular and temporal units.
 *
 * ARCHITECT-OWNED CONTRACT — implementation packets must not edit this file.
 *
 * Rationale: mixing degrees and radians is the single most common source of
 * silent wrongness in astronomy code, and it never fails loudly — it just
 * produces a plausible wrong answer. So units are *branded* types. Passing
 * `Radians` where `Degrees` is expected is a compile error, not a bad reading.
 *
 * Branded numbers (rather than classes) are deliberate: they serialise to plain
 * JSON numbers, which matters because progress records and voyage logs are
 * persisted and reloaded. A class would survive neither `JSON.stringify` nor a
 * bundler boundary intact.
 *
 * PROJECT RULE: degrees are the lingua franca. Radians appear only inside a
 * single function that needs them, and never cross a module boundary.
 */

export type Degrees = number & { readonly __unit: 'degrees' };
export type Radians = number & { readonly __unit: 'radians' };
/** Sidereal or right-ascension hours, range [0, 24). */
export type Hours = number & { readonly __unit: 'hours' };
/** A duration, not a point in time. See `time.contract.ts` for instants. */
export type Milliseconds = number & { readonly __unit: 'milliseconds' };

/**
 * Contract for `units.ts`. The implementation must end with:
 *   const _contract: UnitsApi = { ... };
 */
export interface UnitsApi {
  /** Non-finite input is a programmer error and must throw. */
  degrees(value: number): Degrees;
  radians(value: number): Radians;
  hours(value: number): Hours;
  milliseconds(value: number): Milliseconds;

  toRadians(value: Degrees): Radians;
  toDegrees(value: Radians): Degrees;
  /** 15 degrees per hour. */
  hoursToDegrees(value: Hours): Degrees;
  degreesToHours(value: Degrees): Hours;
  /** Convenience for small angles: 60 arcminutes = 1 degree. */
  arcminutes(value: number): Degrees;

  /** Wrap into [0, 360). Used for azimuths and bearings. */
  normalise360(value: Degrees): Degrees;
  /** Wrap into [-180, 180). Used for longitudes and signed offsets. */
  normaliseSigned180(value: Degrees): Degrees;
  /**
   * Shortest angular separation between two bearings, in [0, 180].
   * Must be correct across the 0/360 wrap: separation(359, 1) === 2.
   */
  angularSeparation(a: Degrees, b: Degrees): Degrees;
}

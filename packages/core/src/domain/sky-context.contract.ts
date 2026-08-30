/**
 * SkyContext — the seam the entire product is built on.
 *
 * ARCHITECT-OWNED CONTRACT — implementation packets must not edit this file.
 *
 * Every skill challenge is a pure function of (where you are, when it is).
 * Nothing in `packages/core` may read a clock or a sensor; it receives a
 * `SkyContext` instead. Three things fall out of that single decision:
 *
 *   1. Voyage mode is nearly free — feed it a historical log entry's position
 *      and date and the identical skill code replays a real 1768 sight.
 *   2. Tests are deterministic with no clock stubbing anywhere.
 *   3. The dev override panel that lets us exercise a night skill at midday is
 *      the same mechanism, not a special case.
 *
 * `provenance` is not decoration. A simulated fix must never be presented as a
 * real one, and progress earned against a simulated sky must never count toward
 * a practice streak — otherwise the dev panel is a cheat code.
 */

import type { GeoPosition } from './geo.contract.ts';
import type { Instant, TimeZoneId } from './time.contract.ts';
import type { Degrees } from './units.contract.ts';

export type SkyProvenance =
  /** Real device GPS and the real current time. */
  | 'live'
  /** Operator-supplied position or time (dev panel, voyage replay). */
  | 'simulated';

export interface SkyContext {
  readonly position: GeoPosition;
  readonly instant: Instant;
  readonly zone: TimeZoneId;
  readonly provenance: SkyProvenance;
}

/** Altitude/azimuth of a body as seen from a `SkyContext`. */
export interface Horizontal {
  /** Degrees above the astronomical horizon; negative when below. */
  readonly altitude: Degrees;
  /** Degrees clockwise from true north, in [0, 360). */
  readonly azimuth: Degrees;
  /** Whether atmospheric refraction has been applied to `altitude`. */
  readonly refracted: boolean;
}

/**
 * Contract for `sky-context.ts`. The implementation must end with:
 *   const _contract: SkyContextApi = { ... };
 */
export interface SkyContextApi {
  skyContext(
    position: GeoPosition,
    instant: Instant,
    zone: TimeZoneId,
    provenance: SkyProvenance,
  ): SkyContext;
  /** Same place, different moment. The workhorse of any search or sweep. */
  atInstant(context: SkyContext, instant: Instant): SkyContext;
  /** True only for 'live'. Gate streaks and achievements on this. */
  countsTowardProgress(context: SkyContext): boolean;
}

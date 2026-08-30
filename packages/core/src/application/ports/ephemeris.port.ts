/**
 * EphemerisPort — the only door through which astronomy reaches this system.
 *
 * ARCHITECT-OWNED CONTRACT — implementation packets must not edit this file.
 *
 * `astronomy-engine` may be imported in exactly one directory:
 * `packages/core/src/infrastructure/ephemeris/`. ESLint enforces this. Three
 * things are bought with that restriction, and they are worth the indirection:
 *
 *   1. Skill logic is testable against a fake ephemeris that returns whatever
 *      sky we want. Testing "does the Polaris skill refuse to run at noon"
 *      should not require computing where the sun actually is.
 *   2. The domain never learns a vendor's idea of coordinates, epochs or units.
 *   3. If accuracy needs change, one file changes.
 *
 * The port is deliberately narrow. It is NOT a mirror of astronomy-engine's API:
 * a port wide enough to expose everything is the same as having no port. Adding
 * a method here is an architectural change and needs review — if a packet finds
 * itself wanting one, that is a signal to stop and escalate, not to widen it.
 */

import type { Degrees, Hours, Milliseconds } from '../../domain/units.contract.ts';
import type { Instant } from '../../domain/time.contract.ts';
import type { SkyContext, Horizontal } from '../../domain/sky-context.contract.ts';
import type { DomainError, Result } from '../../domain/result.contract.ts';

/**
 * Bodies this product can teach with. A closed union rather than an open string:
 * the set of stars a beginner can reliably find is small and deliberate, and an
 * open type would invite a packet to reach for an arbitrary catalogue.
 */
export type CelestialBody =
  | 'sun'
  | 'moon'
  /** Alpha Ursae Minoris. Near, but NOT at, the north celestial pole. */
  | 'polaris'
  /** Alpha Ursae Majoris — outer pointer star of the Plough/Big Dipper. */
  | 'dubhe'
  /** Beta Ursae Majoris — inner pointer star; Merak-to-Dubhe extended finds Polaris. */
  | 'merak'
  /** Epsilon Orionis, centre of Orion's Belt. Declination near zero, so it rises
   *  almost due east and sets almost due west from anywhere on Earth. */
  | 'alnilam'
  /** Sigma Octantis — the southern pole star. Faint; southern-hemisphere skills. */
  | 'sigma-octantis';

export type SearchDirection = 'next-rise' | 'next-set';

export interface MoonIllumination {
  /** Fraction of the disc lit, 0 (new) to 1 (full). */
  readonly fraction: number;
  /** Sun-Earth-Moon angle, 0 (full) to 180 (new) degrees. */
  readonly phaseAngle: Degrees;
}

/*
 * DELIBERATELY ABSENT: position angle of the bright limb, which the "moon's
 * horns point to the sun, and so to south" skill will need. astronomy-engine's
 * Illumination() does not provide it and it must be derived from the sun and
 * moon equatorial positions. That is real work with its own correctness risk,
 * it belongs to a phase-3 skill, and speccing it now on an unverified
 * assumption is exactly the kind of guess this contract exists to prevent.
 * Adding it is an architectural change: escalate, do not improvise.
 */

export interface EphemerisPort {
  /** Apparent alt/az including atmospheric refraction. */
  horizontalOf(body: CelestialBody, context: SkyContext): Horizontal;

  /**
   * Next rise or set, using the standard -0.833 degree convention (refraction
   * plus semidiameter for the sun and moon).
   * Returns `body-never-rises` or `body-always-up` rather than throwing: at high
   * latitudes both are ordinary, expected outcomes, and Polaris is circumpolar
   * across the entire audience for the first night skill.
   */
  riseSet(
    body: CelestialBody,
    context: SkyContext,
    direction: SearchDirection,
  ): Result<Instant, DomainError>;

  /**
   * Next time the body crosses a given altitude. Twilight thresholds are built
   * on this: civil -6, nautical -12, astronomical -18 degrees.
   */
  altitudeCrossing(
    body: CelestialBody,
    context: SkyContext,
    altitude: Degrees,
    direction: SearchDirection,
  ): Result<Instant, DomainError>;

  /**
   * Upper transit — the body's highest point. For the sun this is TRUE SOLAR
   * NOON, which is not 12:00 and frequently not even close to it.
   */
  culmination(body: CelestialBody, context: SkyContext): Instant;

  /**
   * Apparent solar time minus mean solar time. Bounded within roughly +/-16.5
   * minutes over a year. Half of the gap between sundial and wristwatch; the
   * other half is longitude offset within the time zone, plus DST.
   */
  equationOfTime(context: SkyContext): Milliseconds;

  moonIllumination(context: SkyContext): MoonIllumination;

  /** Local apparent sidereal time. Advances ~360.9856 degrees per solar day. */
  localSiderealTime(context: SkyContext): Hours;

  /**
   * Atmospheric refraction to be added to a true altitude to get the apparent
   * one. About 34 arcminutes at the horizon, near zero at the zenith, and
   * monotonically decreasing between. Exposed because any measurement taken
   * from the horizon upward needs it, and because it is the largest systematic
   * correction a naked-eye observer never thinks about.
   */
  refractionAt(trueAltitude: Degrees): Degrees;
}

/**
 * Position on Earth.
 *
 * ARCHITECT-OWNED CONTRACT — implementation packets must not edit this file.
 */

import type { Degrees } from './units.contract.ts';
import type { DomainError, Result } from './result.contract.ts';

/**
 * Latitude in [-90, +90], positive north.
 * Longitude in [-180, +180), positive east of Greenwich.
 * Elevation in metres above mean sea level; affects horizon dip and rise/set.
 */
export interface GeoPosition {
  readonly latitude: Degrees;
  readonly longitude: Degrees;
  readonly elevationMetres: number;
}

export type Hemisphere = 'northern' | 'southern';

/**
 * Contract for `geo.ts`. The implementation must end with:
 *   const _contract: GeoApi = { ... };
 */
export interface GeoApi {
  /**
   * Rejects latitude outside [-90, 90] with `out-of-range`.
   * Longitude is *normalised*, not rejected: 181 becomes -179. Wrapping is
   * correct behaviour at the antimeridian, and a device can legitimately report
   * 180.0000001.
   */
  geoPosition(
    latitude: Degrees,
    longitude: Degrees,
    elevationMetres: number,
  ): Result<GeoPosition, DomainError>;

  hemisphereOf(position: GeoPosition): Hemisphere;

  /**
   * Dip of the visible horizon below the astronomical horizon, from elevation.
   * Positive degrees. Zero at sea level. Matters for any measurement taken from
   * the horizon upward, which is most of them.
   */
  horizonDip(position: GeoPosition): Degrees;
}

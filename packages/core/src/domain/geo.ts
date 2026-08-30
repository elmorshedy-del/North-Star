import type { DomainError, Result } from './result.contract.ts';
import type { GeoApi, GeoPosition, Hemisphere } from './geo.contract.ts';
import type { Degrees } from './units.contract.ts';
import { domainError, err, ok } from './result.ts';
import { arcminutes, normaliseSigned180 } from './units.ts';

export function geoPosition(
  latitude: Degrees,
  longitude: Degrees,
  elevationMetres: number,
): Result<GeoPosition, DomainError> {
  if (latitude < -90 || latitude > 90) {
    return err(
      domainError('out-of-range', `latitude ${String(latitude)} is outside [-90, 90]`),
    );
  }
  return ok({
    latitude,
    longitude: normaliseSigned180(longitude),
    elevationMetres,
  });
}

export function hemisphereOf(position: GeoPosition): Hemisphere {
  return position.latitude >= 0 ? 'northern' : 'southern';
}

export function horizonDip(position: GeoPosition): Degrees {
  // Below sea level the visible horizon is not below the astronomical one.
  const height = Math.max(0, position.elevationMetres);
  return arcminutes(1.76 * Math.sqrt(height));
}

const _contract: GeoApi = {
  geoPosition,
  hemisphereOf,
  horizonDip,
};
void _contract;

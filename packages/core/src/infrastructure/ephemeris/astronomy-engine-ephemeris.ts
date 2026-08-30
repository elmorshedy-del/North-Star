import {
  Body,
  Equator,
  Horizon,
  Illumination,
  Observer,
  Refraction,
  SearchAltitude,
  SearchHourAngle,
  SearchRiseSet,
  SiderealTime,
  type AstroTime,
} from 'astronomy-engine';
import type {
  CelestialBody,
  EphemerisPort,
  MoonIllumination,
  SearchDirection,
} from '../../application/ports/ephemeris.port.ts';
import type { Horizontal, SkyContext } from '../../domain/sky-context.contract.ts';
import type { DomainError, Result } from '../../domain/result.contract.ts';
import type { Instant } from '../../domain/time.contract.ts';
import type { Degrees, Hours, Milliseconds } from '../../domain/units.contract.ts';
import { domainError, err, ok } from '../../domain/result.ts';
import { instant } from '../../domain/time.ts';
import { degrees, hours, milliseconds, normalise360 } from '../../domain/units.ts';
import './stars.ts';

const BODIES: Record<CelestialBody, Body> = {
  sun: Body.Sun,
  moon: Body.Moon,
  polaris: Body.Star1,
  dubhe: Body.Star2,
  merak: Body.Star3,
  alnilam: Body.Star4,
  'sigma-octantis': Body.Star5,
};

/** Standard rise/set depression: refraction plus solar/lunar semidiameter. */
const RISE_SET_ALTITUDE = -0.833;

/**
 * Long enough to catch a next event that straddles midnight, short enough that
 * a polar midnight sun is reported as undefined rather than "next August".
 */
const SEARCH_DAYS = 2;

function observerOf(context: SkyContext): Observer {
  return new Observer(
    context.position.latitude,
    context.position.longitude,
    context.position.elevationMetres,
  );
}

function dateOf(context: SkyContext): Date {
  return new Date(context.instant);
}

function instantOf(time: AstroTime): Instant {
  return instant(time.date.getTime());
}

function searchDirection(direction: SearchDirection): number {
  return direction === 'next-rise' ? 1 : -1;
}

function missingEvent(
  body: CelestialBody,
  context: SkyContext,
  threshold: Degrees,
): Result<Instant, DomainError> {
  // Classify from upper transit, not the call instant: a polar-night noon
  // is still never-rises, even though a midnight sample of the same day
  // would have been obviously below the threshold.
  const transit = SearchHourAngle(BODIES[body], observerOf(context), 0, dateOf(context), 1);
  const peak = horizontalOfBody(body, { ...context, instant: instantOf(transit.time) });
  if (peak.altitude > threshold) {
    return err(domainError('body-always-up', `${body} stays above ${String(threshold)}° here`));
  }
  return err(domainError('body-never-rises', `${body} stays below ${String(threshold)}° here`));
}

function horizontalOfBody(body: CelestialBody, context: SkyContext): Horizontal {
  const date = dateOf(context);
  const observer = observerOf(context);
  // ofdate must be true: J2000 into Horizon is ~0.25° wrong in 2026.
  const equator = Equator(BODIES[body], date, observer, true, true);
  const horizon = Horizon(date, observer, equator.ra, equator.dec, 'normal');
  return {
    altitude: degrees(horizon.altitude),
    azimuth: normalise360(degrees(horizon.azimuth)),
    refracted: true,
  };
}

export class AstronomyEngineEphemeris implements EphemerisPort {
  horizontalOf(body: CelestialBody, context: SkyContext): Horizontal {
    return horizontalOfBody(body, context);
  }

  riseSet(
    body: CelestialBody,
    context: SkyContext,
    direction: SearchDirection,
  ): Result<Instant, DomainError> {
    const found = SearchRiseSet(
      BODIES[body],
      observerOf(context),
      searchDirection(direction),
      dateOf(context),
      SEARCH_DAYS,
    );
    if (found === null) {
      return missingEvent(body, context, degrees(RISE_SET_ALTITUDE));
    }
    return ok(instantOf(found));
  }

  altitudeCrossing(
    body: CelestialBody,
    context: SkyContext,
    altitude: Degrees,
    direction: SearchDirection,
  ): Result<Instant, DomainError> {
    const found = SearchAltitude(
      BODIES[body],
      observerOf(context),
      searchDirection(direction),
      dateOf(context),
      SEARCH_DAYS,
      altitude,
    );
    if (found === null) {
      return missingEvent(body, context, altitude);
    }
    return ok(instantOf(found));
  }

  culmination(body: CelestialBody, context: SkyContext): Instant {
    const event = SearchHourAngle(BODIES[body], observerOf(context), 0, dateOf(context), 1);
    return instantOf(event.time);
  }

  equationOfTime(context: SkyContext): Milliseconds {
    const civil = new Date(context.instant);
    const startOfUtcDay = new Date(
      Date.UTC(civil.getUTCFullYear(), civil.getUTCMonth(), civil.getUTCDate()),
    );
    const meanNoonUtc = Date.UTC(
      civil.getUTCFullYear(),
      civil.getUTCMonth(),
      civil.getUTCDate(),
      12,
      0,
      0,
    );
    // Longitude 0: mean solar noon is 12:00 UT. Latitude is irrelevant to the meridian.
    const transit = SearchHourAngle(Body.Sun, new Observer(0, 0, 0), 0, startOfUtcDay, 1);
    return milliseconds(meanNoonUtc - transit.time.date.getTime());
  }

  moonIllumination(context: SkyContext): MoonIllumination {
    const info = Illumination(Body.Moon, dateOf(context));
    return {
      fraction: info.phase_fraction,
      phaseAngle: degrees(info.phase_angle),
    };
  }

  localSiderealTime(context: SkyContext): Hours {
    const gast = SiderealTime(dateOf(context));
    const local = gast + context.position.longitude / 15;
    return hours(((local % 24) + 24) % 24);
  }

  refractionAt(trueAltitude: Degrees): Degrees {
    return degrees(Refraction('normal', trueAltitude));
  }
}

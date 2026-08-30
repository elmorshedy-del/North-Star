import { describe, expect, it } from 'vitest';
import {
  atInstant,
  degrees,
  geoPosition,
  instantFromIso,
  isErr,
  isOk,
  skyContext,
  timeZone,
} from '../../domain/index.ts';
import type { SkyContext } from '../../domain/sky-context.contract.ts';
import { AstronomyEngineEphemeris } from './astronomy-engine-ephemeris.ts';

const eph = new AstronomyEngineEphemeris();
const utc = timeZone('UTC');

function place(latitude: number, longitude: number, elevation = 0) {
  const result = geoPosition(degrees(latitude), degrees(longitude), elevation);
  if (!isOk(result)) {
    throw new Error(result.error.detail);
  }
  return result.value;
}

function at(latitude: number, longitude: number, iso: string): SkyContext {
  return skyContext(place(latitude, longitude), instantFromIso(iso), utc, 'simulated');
}

function minutesFromMidnightUtc(value: number): number {
  const date = new Date(value);
  return date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
}

describe('golden values against external almanacs', () => {
  it('matches NOAA sunrise, sunset and solar noon at Greenwich on 2026-11-03', () => {
    // NOAA Solar Calculator, 51.4779 N 0.0015 W, 2026-11-03 (UTC / GMT):
    // sunrise 06:57, sunset 16:29, solar noon 11:43:31.
    // https://gml.noaa.gov/grad/solcalc/table.php?name=Greenwich&lat=51.4779&lon=-0.0015&year=2026&tz=0
    const ctx = at(51.4779, -0.0015, '2026-11-03T00:00:00.000Z');
    const rise = eph.riseSet('sun', ctx, 'next-rise');
    const set = eph.riseSet('sun', ctx, 'next-set');
    expect(isOk(rise) && isOk(set)).toBe(true);
    if (isOk(rise) && isOk(set)) {
      expect(Math.abs(minutesFromMidnightUtc(rise.value) - (6 * 60 + 57))).toBeLessThan(1);
      expect(Math.abs(minutesFromMidnightUtc(set.value) - (16 * 60 + 29))).toBeLessThan(1);
    }

    const noon = eph.culmination('sun', ctx);
    const noaaNoon = instantFromIso('2026-11-03T11:43:31.000Z');
    expect(Math.abs(noon - noaaNoon)).toBeLessThan(2_000);
  });

  it('matches timeanddate nautical twilight in London on 2026-11-03', () => {
    // timeanddate.com, London, November 2026: nautical twilight 5:42 am – 5:44 pm local.
    // 3 Nov is GMT (UTC+0). https://www.timeanddate.com/sun/uk/london?month=11&year=2026
    const ctx = at(51.5074, -0.1278, '2026-11-03T00:00:00.000Z');
    const dawn = eph.altitudeCrossing('sun', ctx, degrees(-12), 'next-rise');
    const dusk = eph.altitudeCrossing('sun', ctx, degrees(-12), 'next-set');
    expect(isOk(dawn) && isOk(dusk)).toBe(true);
    if (isOk(dawn) && isOk(dusk)) {
      expect(Math.abs(minutesFromMidnightUtc(dawn.value) - (5 * 60 + 42))).toBeLessThan(1.5);
      expect(Math.abs(minutesFromMidnightUtc(dusk.value) - (17 * 60 + 44))).toBeLessThan(1.5);
    }
  });
});

describe('rise and set as modelled outcomes', () => {
  it('reports body-always-up for the Arctic sun in June', () => {
    const ctx = at(78, 0, '2026-06-21T00:00:00.000Z');
    const rise = eph.riseSet('sun', ctx, 'next-rise');
    const set = eph.riseSet('sun', ctx, 'next-set');
    expect(isErr(rise) && rise.error.code).toBe('body-always-up');
    expect(isErr(set) && set.error.code).toBe('body-always-up');
  });

  it('reports body-never-rises for the Arctic sun in December', () => {
    const ctx = at(78, 0, '2026-12-21T00:00:00.000Z');
    const rise = eph.riseSet('sun', ctx, 'next-rise');
    const set = eph.riseSet('sun', ctx, 'next-set');
    expect(isErr(rise) && rise.error.code).toBe('body-never-rises');
    expect(isErr(set) && set.error.code).toBe('body-never-rises');
  });

  it('reports body-always-up for Polaris at 60°N', () => {
    const ctx = at(60, 0, '2026-06-21T00:00:00.000Z');
    const set = eph.riseSet('polaris', ctx, 'next-set');
    expect(isErr(set) && set.error.code).toBe('body-always-up');
  });
});

describe('poles and the antimeridian', () => {
  it('computes horizontal coordinates at latitude ±90 and longitude ±180', () => {
    for (const [lat, lon] of [
      [90, 0],
      [-90, 0],
      [0, 180],
      [0, -180],
    ] as const) {
      const ctx = at(lat, lon, '2026-06-21T12:00:00.000Z');
      const sun = eph.horizontalOf('sun', ctx);
      expect(Number.isFinite(sun.altitude)).toBe(true);
      expect(sun.azimuth).toBeGreaterThanOrEqual(0);
      expect(sun.azimuth).toBeLessThan(360);
      expect(sun.refracted).toBe(true);
      const lst = eph.localSiderealTime(ctx);
      expect(lst).toBeGreaterThanOrEqual(0);
      expect(lst).toBeLessThan(24);
    }
  });
});

describe('localSiderealTime wrap', () => {
  it('stays in [0, 24) across a day and at both antimeridians', () => {
    const ctx = at(0, -179.9, '2026-01-01T00:00:00.000Z');
    for (let hour = 0; hour < 24; hour += 1) {
      const lst = eph.localSiderealTime(
        atInstant(ctx, instantFromIso(new Date(Date.UTC(2026, 0, 1, hour)).toISOString())),
      );
      expect(lst).toBeGreaterThanOrEqual(0);
      expect(lst).toBeLessThan(24);
    }
  });
});

describe('moonIllumination', () => {
  it('returns a fraction in [0, 1] and a phase angle in [0, 180]', () => {
    // IAU illumination geometry: phase fraction is (1 + cos i) / 2; i is [0, 180].
    const info = eph.moonIllumination(at(0, 0, '2026-11-03T00:00:00.000Z'));
    expect(info.fraction).toBeGreaterThanOrEqual(0);
    expect(info.fraction).toBeLessThanOrEqual(1);
    expect(info.phaseAngle).toBeGreaterThanOrEqual(0);
    expect(info.phaseAngle).toBeLessThanOrEqual(180);
  });
});

describe('equation of Time published extremes', () => {
  it('is near −14.18 min on 2026-02-11 and +16.45 min on 2026-11-03', () => {
    // docs/03-astronomy.md §6, matching the published 2026 extremes.
    const feb = eph.equationOfTime(at(0, 0, '2026-02-11T12:00:00.000Z')) / 60_000;
    const nov = eph.equationOfTime(at(0, 0, '2026-11-03T12:00:00.000Z')) / 60_000;
    expect(feb).toBeCloseTo(-14.18, 1);
    expect(nov).toBeCloseTo(16.45, 1);
  });
});

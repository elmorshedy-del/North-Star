import {
  Body,
  Equator,
  EquatorFromVector,
  Horizon,
  Observer,
  RotateVector,
  Rotation_HOR_EQD,
  Spherical,
  VectorFromHorizon,
} from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import {
  addDuration,
  atInstant,
  degrees,
  geoPosition,
  instantFromIso,
  isOk,
  milliseconds,
  skyContext,
  timeZone,
  angularSeparation,
  normaliseSigned180,
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

describe('Polaris apparent altitude tracks observer latitude', () => {
  it('stays within 1.0° for lat 10–80°N, hourly across a year', () => {
    // docs/05-testing.md Defence 2 #1. Measured worst case 0.71° (docs/03-astronomy.md §3).
    const latitudes = [10, 20, 35, 51.48, 65, 80];
    let worst = 0;
    for (const lat of latitudes) {
      for (let day = 0; day < 365; day += 1) {
        const dayStart = Date.UTC(2026, 0, 1) + day * 86_400_000;
        for (let hour = 0; hour < 24; hour += 1) {
          const ctx = at(lat, 0, new Date(dayStart + hour * 3_600_000).toISOString());
          const error = Math.abs(eph.horizontalOf('polaris', ctx).altitude - lat);
          if (error > worst) worst = error;
        }
      }
    }
    expect(worst).toBeLessThan(1);
  });
});

describe('Polaris offset from the true pole, of-date, 2026', () => {
  it('is 0.62° ± 0.02°, not the J2000 0.736°', () => {
    // docs/05-testing.md Defence 2 #2; docs/03-astronomy.md §3.
    // J2000 coordinates would give 0.736° — that is the epoch-bug tripwire.
    const observer = new Observer(51.48, 0, 0);
    const samples = ['2026-01-15T00:00:00.000Z', '2026-06-21T00:00:00.000Z', '2026-11-03T00:00:00.000Z'];
    for (const iso of samples) {
      const eq = Equator(Body.Star1, new Date(iso), observer, true, true);
      expect(90 - eq.dec).toBeCloseTo(0.62, 1);
      expect(Math.abs(90 - eq.dec - 0.62)).toBeLessThanOrEqual(0.02);
    }
  });
});

describe('true celestial pole altitude equals latitude', () => {
  it('holds geometrically, with no refraction and no ephemeris body', () => {
    // docs/05-testing.md Defence 2 #3. Altitude of dec=+90 is latitude, exactly.
    const date = new Date('2026-06-21T12:00:00.000Z');
    for (const lat of [-80, -35, 0, 35, 51.48, 90]) {
      const horizon = Horizon(date, new Observer(lat, 0, 0), 0, 90, '');
      expect(Math.abs(horizon.altitude - lat)).toBeLessThan(1e-9);
    }
  });
});

describe('sun altitude is maximal at culmination', () => {
  it('is not exceeded by any 1-minute sample in ±3 h', () => {
    // docs/05-testing.md Defence 2 #4.
    const ctx = at(51.4779, -0.0015, '2026-06-21T00:00:00.000Z');
    const peakAt = eph.culmination('sun', ctx);
    const peak = eph.horizontalOf('sun', atInstant(ctx, peakAt)).altitude;
    for (let minute = -180; minute <= 180; minute += 1) {
      const sample = eph.horizontalOf(
        'sun',
        atInstant(ctx, addDuration(peakAt, milliseconds(minute * 60_000))),
      ).altitude;
      expect(sample).toBeLessThanOrEqual(peak + 1e-9);
    }
  });
});

describe('noon altitude is 90 − |latitude − declination|', () => {
  it('holds at latitude 0 on the June solstice, where 90 − lat + dec is nonsense', () => {
    // docs/05-testing.md Defence 2 #5; docs/03-astronomy.md §6.
    // Naive 90 − 0 + 23.44 = 113.44°. True value is 66.57°.
    const cases = [
      { lat: 0, iso: '2026-06-21T00:00:00.000Z' },
      { lat: 35, iso: '2026-06-21T00:00:00.000Z' },
      { lat: 51.48, iso: '2026-11-03T00:00:00.000Z' },
    ];
    for (const { lat, iso } of cases) {
      const ctx = at(lat, 0, iso);
      const noon = atInstant(ctx, eph.culmination('sun', ctx));
      const equator = Equator(Body.Sun, new Date(noon.instant), new Observer(lat, 0, 0), true, true);
      const geometric = 90 - Math.abs(lat - equator.dec);
      const apparent = eph.horizontalOf('sun', noon).altitude;
      const trueAltitude = apparent - eph.refractionAt(degrees(apparent));
      expect(Math.abs(trueAltitude - geometric)).toBeLessThan(0.02);
      if (lat === 0) {
        expect(geometric).toBeCloseTo(66.57, 1);
      }
    }
  });
});

describe('equation of time in 2026', () => {
  it('stays within ±16.5 min and crosses zero exactly four times', () => {
    // docs/05-testing.md Defence 2 #6; docs/03-astronomy.md §6.
    const ctx0 = at(0, 0, '2026-01-01T12:00:00.000Z');
    let previous = eph.equationOfTime(ctx0);
    let crossings = 0;
    let min = previous;
    let max = previous;
    for (let day = 1; day < 365; day += 1) {
      const ctx = at(0, 0, new Date(Date.UTC(2026, 0, 1, 12) + day * 86_400_000).toISOString());
      const value = eph.equationOfTime(ctx);
      if (value < min) min = value;
      if (value > max) max = value;
      if ((previous < 0 && value >= 0) || (previous > 0 && value <= 0)) {
        crossings += 1;
      }
      previous = value;
    }
    expect(min).toBeGreaterThanOrEqual(-16.5 * 60_000);
    expect(max).toBeLessThanOrEqual(16.5 * 60_000);
    expect(crossings).toBe(4);
  });
});

describe('refraction shape', () => {
  it('decreases with altitude, is 25′–35′ at true 0, and ~0 at the zenith', () => {
    // docs/05-testing.md Defence 2 #7; docs/03-astronomy.md §4.
    // Port takes TRUE altitude: ~28.98′ at 0°, not the 34′ apparent-horizon figure.
    let previous = eph.refractionAt(degrees(0));
    expect(previous * 60).toBeGreaterThanOrEqual(25);
    expect(previous * 60).toBeLessThanOrEqual(35);
    for (const alt of [0.5, 1, 2, 5, 10, 20, 45, 80, 90]) {
      const next = eph.refractionAt(degrees(alt));
      expect(next).toBeLessThan(previous);
      previous = next;
    }
    expect(eph.refractionAt(degrees(90))).toBeCloseTo(0, 3);
  });
});

describe('alt/az → equatorial → alt/az round-trip', () => {
  it('closes within 1 arcminute', () => {
    // docs/05-testing.md Defence 2 #8.
    const ctx = at(51.4779, -0.0015, '2026-11-03T11:43:31.000Z');
    const first = eph.horizontalOf('sun', ctx);
    const date = new Date(ctx.instant);
    const observer = new Observer(51.4779, -0.0015, 0);
    const horVec = VectorFromHorizon(new Spherical(first.altitude, first.azimuth, 1), date, 'normal');
    const equator = EquatorFromVector(RotateVector(Rotation_HOR_EQD(date, observer), horVec));
    const second = Horizon(date, observer, equator.ra, equator.dec, 'normal');
    expect(Math.abs(first.altitude - second.altitude) * 60).toBeLessThan(1);
    expect(angularSeparation(degrees(first.azimuth), degrees(second.azimuth)) * 60).toBeLessThan(1);
  });
});

describe('rise and set bracket culmination', () => {
  it('orders rise < culmination < set whenever all three exist', () => {
    // docs/05-testing.md Defence 2 #9.
    const ctx = at(51.4779, -0.0015, '2026-11-03T00:00:00.000Z');
    const rise = eph.riseSet('sun', ctx, 'next-rise');
    const set = eph.riseSet('sun', ctx, 'next-set');
    const culm = eph.culmination('sun', ctx);
    expect(isOk(rise) && isOk(set)).toBe(true);
    if (isOk(rise) && isOk(set)) {
      expect(rise.value).toBeLessThan(culm);
      expect(culm).toBeLessThan(set.value);
    }
  });
});

describe('sidereal time advance', () => {
  it('advances 360.9856° per solar day', () => {
    // docs/05-testing.md Defence 2 #10. IAU / standard sidereal-day constant.
    const ctx = at(0, 0, '2026-06-21T00:00:00.000Z');
    const first = eph.localSiderealTime(ctx);
    const next = eph.localSiderealTime(
      atInstant(ctx, addDuration(ctx.instant, milliseconds(86_400_000))),
    );
    const deltaHours = (next - first + 24) % 24;
    // LST is wrapped to [0, 24); the Earth turned 360° plus this excess.
    const advanceDegrees = 360 + deltaHours * 15;
    expect(Math.abs(advanceDegrees - 360.9856)).toBeLessThan(0.001);
  });
});

describe('day length at the equator', () => {
  it('is 12.11 h ± 0.02 h on the four quarter-year dates', () => {
    // docs/05-testing.md Defence 2 #11; docs/03-astronomy.md §8.
    // Exactly 12.00 h would mean the −0.833° rise/set convention was skipped.
    const dates = [
      '2026-03-20T00:00:00.000Z',
      '2026-06-21T00:00:00.000Z',
      '2026-09-22T00:00:00.000Z',
      '2026-12-21T00:00:00.000Z',
    ];
    for (const iso of dates) {
      const ctx = at(0, 0, iso);
      const rise = eph.riseSet('sun', ctx, 'next-rise');
      const set = eph.riseSet('sun', ctx, 'next-set');
      expect(isOk(rise) && isOk(set)).toBe(true);
      if (isOk(rise) && isOk(set)) {
        const hoursLong = (set.value - rise.value) / 3_600_000;
        expect(hoursLong).toBeGreaterThanOrEqual(12.09);
        expect(hoursLong).toBeLessThanOrEqual(12.13);
      }
    }
  });
});

describe('Alnilam rises near due east', () => {
  it('is within 2° of azimuth 90 at latitudes 0–65°', () => {
    // docs/05-testing.md Defence 2 #12; docs/03-astronomy.md §8.
    for (const lat of [0, 35, 51.5, 65]) {
      const ctx = at(lat, 0, '2026-03-20T00:00:00.000Z');
      const rise = eph.riseSet('alnilam', ctx, 'next-rise');
      expect(isOk(rise)).toBe(true);
      if (isOk(rise)) {
        const azimuth = eph.horizontalOf('alnilam', atInstant(ctx, rise.value)).azimuth;
        expect(Math.abs(azimuth - 90)).toBeLessThan(2);
      }
    }
  });
});

describe('angularSeparation across the wrap', () => {
  it('is the shortest arc', () => {
    // docs/05-testing.md Defence 2 #13 — closed-form identity on a circle.
    expect(angularSeparation(degrees(359), degrees(1))).toBe(2);
  });
});

describe('longitude normalisation at the antimeridian', () => {
  it('wraps 181 → −179 and leaves −180 alone', () => {
    // docs/05-testing.md Defence 2 #14.
    expect(normaliseSigned180(degrees(181))).toBe(-179);
    expect(normaliseSigned180(degrees(-180))).toBe(-180);
  });
});

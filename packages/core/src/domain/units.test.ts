import { describe, expect, it } from 'vitest';
import {
  angularSeparation,
  arcminutes,
  degrees,
  degreesToHours,
  hours,
  hoursToDegrees,
  milliseconds,
  normalise360,
  normaliseSigned180,
  radians,
  toDegrees,
  toRadians,
} from './units';

describe('unit constructors', () => {
  it('throw on NaN and Infinity', () => {
    const constructors = [degrees, radians, hours, milliseconds] as const;
    for (const construct of constructors) {
      expect(() => construct(Number.NaN)).toThrow(/finite/);
      expect(() => construct(Number.POSITIVE_INFINITY)).toThrow(/finite/);
      expect(() => construct(Number.NEGATIVE_INFINITY)).toThrow(/finite/);
    }
  });
});

describe('normalise360', () => {
  it('wraps into [0, 360)', () => {
    expect(normalise360(degrees(0))).toBe(0);
    expect(normalise360(degrees(360))).toBe(0);
    expect(normalise360(degrees(359.9))).toBe(359.9);
    expect(normalise360(degrees(-10))).toBe(350);
    expect(normalise360(degrees(-370))).toBe(350);
    expect(normalise360(degrees(720))).toBe(0);
  });
});

describe('normaliseSigned180', () => {
  it('wraps into [-180, 180)', () => {
    // Invariant 14 in docs/05-testing.md: 181 → −179, −180 stays −180.
    expect(normaliseSigned180(degrees(180))).toBe(-180);
    expect(normaliseSigned180(degrees(181))).toBe(-179);
    expect(normaliseSigned180(degrees(-180))).toBe(-180);
    expect(normaliseSigned180(degrees(-181))).toBe(179);
  });
});

describe('angularSeparation', () => {
  it('is the shortest arc, including across the 0/360 wrap', () => {
    // Geometric identity: shortest arc on a circle. Invariant 13 in docs/05-testing.md.
    expect(angularSeparation(degrees(359), degrees(1))).toBe(2);
    expect(angularSeparation(degrees(0), degrees(180))).toBe(180);
    expect(angularSeparation(degrees(10), degrees(350))).toBe(20);
    expect(angularSeparation(degrees(47), degrees(47))).toBe(0);
  });

  it('is symmetric and always within [0, 180]', () => {
    for (let a = 0; a < 360; a += 10) {
      for (let b = 0; b < 360; b += 10) {
        const sep = angularSeparation(degrees(a), degrees(b));
        expect(sep).toBeGreaterThanOrEqual(0);
        expect(sep).toBeLessThanOrEqual(180);
        expect(angularSeparation(degrees(b), degrees(a))).toBe(sep);
      }
    }
  });
});

describe('conversions', () => {
  it('round-trips toRadians/toDegrees to < 1e-12 over a sweep', () => {
    for (let deg = -720; deg <= 720; deg += 15) {
      const back = toDegrees(toRadians(degrees(deg)));
      expect(Math.abs(back - deg)).toBeLessThan(1e-12);
    }
  });

  it('converts hours and degrees at 15° per hour', () => {
    // Contract / IAU: 24h of right ascension = 360°.
    expect(hoursToDegrees(hours(1))).toBe(15);
    expect(degreesToHours(degrees(15))).toBe(1);
    expect(hoursToDegrees(hours(24))).toBe(360);
  });

  it('treats 60 arcminutes as one degree', () => {
    expect(arcminutes(60)).toBe(1);
    expect(arcminutes(30)).toBe(0.5);
  });
});

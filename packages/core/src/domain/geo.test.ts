import { describe, expect, it } from 'vitest';
import { isErr, isOk } from './result';
import { degrees } from './units';
import { geoPosition, hemisphereOf, horizonDip } from './geo';

describe('geoPosition', () => {
  it('rejects latitude outside [-90, 90] and accepts the poles', () => {
    const tooNorth = geoPosition(degrees(90.1), degrees(0), 0);
    const tooSouth = geoPosition(degrees(-90.1), degrees(0), 0);
    expect(isErr(tooNorth) && tooNorth.error.code).toBe('out-of-range');
    expect(isErr(tooSouth) && tooSouth.error.code).toBe('out-of-range');

    const northPole = geoPosition(degrees(90), degrees(0), 0);
    const southPole = geoPosition(degrees(-90), degrees(0), 0);
    expect(isOk(northPole)).toBe(true);
    expect(isOk(southPole)).toBe(true);
  });

  it('normalises longitude rather than rejecting it', () => {
    // Invariant 14 in docs/05-testing.md: wrapping is correct at the antimeridian.
    const cases: ReadonlyArray<readonly [number, number]> = [
      [181, -179],
      [-181, 179],
      [360, 0],
      [-180, -180],
    ];
    for (const [input, expected] of cases) {
      const result = geoPosition(degrees(0), degrees(input), 0);
      expect(isOk(result) && result.value.longitude).toBe(expected);
    }
  });
});

describe('hemisphereOf', () => {
  it('treats latitude ≥ 0 as northern', () => {
    const equator = geoPosition(degrees(0), degrees(0), 0);
    const south = geoPosition(degrees(-0.1), degrees(0), 0);
    if (!isOk(equator) || !isOk(south)) {
      throw new Error('expected valid positions');
    }
    expect(hemisphereOf(equator.value)).toBe('northern');
    expect(hemisphereOf(south.value)).toBe('southern');
  });
});

describe('horizonDip', () => {
  it('is zero at sea level and 17.6′ from 100 m', () => {
    // Nautical Almanac / Bowditch approximation: dip (′) ≈ 1.76 × √(h metres).
    // At 100 m: 1.76 × 10 = 17.6′ = 0.2933…°. Also stated in docs/03-astronomy.md §5.
    const sea = geoPosition(degrees(0), degrees(0), 0);
    const cliff = geoPosition(degrees(0), degrees(0), 100);
    const below = geoPosition(degrees(0), degrees(0), -12);
    if (!isOk(sea) || !isOk(cliff) || !isOk(below)) {
      throw new Error('expected valid positions');
    }
    expect(horizonDip(sea.value)).toBe(0);
    expect(horizonDip(cliff.value)).toBeCloseTo(17.6 / 60, 2);
    expect(horizonDip(below.value)).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { isOk } from './result';
import { geoPosition } from './geo';
import { countsTowardProgress, atInstant, skyContext } from './sky-context';
import { instantFromIso, timeZone } from './time';
import { degrees } from './units';

function greenwich() {
  const result = geoPosition(degrees(51.4779), degrees(-0.0015), 47);
  if (!isOk(result)) {
    throw new Error(result.error.detail);
  }
  return result.value;
}

describe('SkyContext', () => {
  const position = greenwich();
  const zone = timeZone('Europe/London');
  const noon = instantFromIso('2026-06-21T12:00:00.000Z');
  const dusk = instantFromIso('2026-06-21T20:00:00.000Z');

  it('countsTowardProgress is true only for live provenance', () => {
    const live = skyContext(position, noon, zone, 'live');
    const simulated = skyContext(position, noon, zone, 'simulated');
    expect(countsTowardProgress(live)).toBe(true);
    expect(countsTowardProgress(simulated)).toBe(false);
  });

  it('atInstant keeps place, zone and provenance', () => {
    const original = skyContext(position, noon, zone, 'simulated');
    const moved = atInstant(original, dusk);
    expect(moved.instant).toBe(dusk);
    expect(moved.position).toEqual(position);
    expect(moved.zone).toBe(zone);
    expect(moved.provenance).toBe('simulated');
    expect(countsTowardProgress(moved)).toBe(false);
  });
});

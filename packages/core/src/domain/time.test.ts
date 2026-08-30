import { describe, expect, it } from 'vitest';
import { milliseconds } from './units';
import {
  addDuration,
  durationBetween,
  instant,
  instantFromIso,
  timeZone,
  toCivilTime,
  toIso,
} from './time';

describe('Instant', () => {
  it('round-trips ISO 8601 UTC timestamps', () => {
    // Unix epoch is defined as 1970-01-01T00:00:00Z.
    const epoch = instantFromIso('1970-01-01T00:00:00.000Z');
    expect(epoch).toBe(0);
    expect(toIso(epoch)).toBe('1970-01-01T00:00:00.000Z');

    const later = instantFromIso('2026-03-29T00:30:00.000Z');
    expect(toIso(later)).toBe('2026-03-29T00:30:00.000Z');
    expect(instantFromIso(toIso(later))).toBe(later);
  });

  it('throws on a non-finite epoch and an unparseable ISO string', () => {
    expect(() => instant(Number.NaN)).toThrow(/finite/);
    expect(() => instantFromIso('not-a-timestamp')).toThrow(/ISO 8601/);
  });
});

describe('durationBetween', () => {
  it('is signed and antisymmetric', () => {
    const earlier = instantFromIso('2026-01-01T00:00:00.000Z');
    const later = instantFromIso('2026-01-01T00:00:01.000Z');
    const hour = milliseconds(3_600_000);

    expect(durationBetween(later, earlier)).toBe(1000);
    expect(durationBetween(earlier, later)).toBe(-1000);
    expect(durationBetween(later, earlier) + durationBetween(earlier, later)).toBe(0);
    expect(durationBetween(earlier, earlier)).toBe(0);
    expect(addDuration(earlier, hour)).toBe(instantFromIso('2026-01-01T01:00:00.000Z'));
    expect(addDuration(later, milliseconds(-1000))).toBe(earlier);
  });
});

describe('toCivilTime', () => {
  const london = timeZone('Europe/London');
  const sydney = timeZone('Australia/Sydney');
  const utc = timeZone('UTC');

  it('uses the explicit zone on both sides of a London DST spring-forward', () => {
    // timeanddate.com, London 2026: 29 Mar 01:00 GMT clocks go forward to 02:00 BST.
    // https://www.timeanddate.com/time/change/uk/london
    const before = toCivilTime(instantFromIso('2026-03-29T00:30:00.000Z'), london);
    expect(before.hour).toBe(0);
    expect(before.minute).toBe(30);
    expect(before.second).toBe(0);
    expect(before.isDaylightSaving).toBe(false);
    expect(before.zone).toBe(london);

    const after = toCivilTime(instantFromIso('2026-03-29T01:30:00.000Z'), london);
    expect(after.hour).toBe(2);
    expect(after.minute).toBe(30);
    expect(after.isDaylightSaving).toBe(true);
  });

  it('detects DST in a southern-hemisphere zone without assuming July is summer', () => {
    // timeanddate.com, Sydney 2026: AEDT (UTC+11) until 5 Apr; AEST (UTC+10) until 4 Oct.
    // https://www.timeanddate.com/time/change/australia/sydney
    // 15 Jan 12:00 AEDT = 01:00 UTC; 15 Jul 12:00 AEST = 02:00 UTC.
    const january = toCivilTime(instantFromIso('2026-01-15T01:00:00.000Z'), sydney);
    expect(january.hour).toBe(12);
    expect(january.isDaylightSaving).toBe(true);

    const july = toCivilTime(instantFromIso('2026-07-15T02:00:00.000Z'), sydney);
    expect(july.hour).toBe(12);
    expect(july.isDaylightSaving).toBe(false);
  });

  it('reports no daylight saving in a zone with a constant offset', () => {
    // UTC has no daylight-saving offset in any year (IANA tzdb / timeanddate.com).
    const noon = toCivilTime(instantFromIso('2026-07-15T12:00:00.000Z'), utc);
    expect(noon.hour).toBe(12);
    expect(noon.isDaylightSaving).toBe(false);
  });
});

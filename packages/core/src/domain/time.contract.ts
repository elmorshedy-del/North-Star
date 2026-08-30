/**
 * Points in time.
 *
 * ARCHITECT-OWNED CONTRACT — implementation packets must not edit this file.
 *
 * Rationale: `Instant` is a branded epoch-millisecond number rather than a
 * `Date`. `Date` is mutable, compares badly, serialises inconsistently, and —
 * most importantly — its presence in a signature invites someone to reach for
 * `new Date()` and read the ambient clock. Time enters this system exactly once,
 * through `ClockPort`, and travels as data thereafter. That is what makes voyage
 * mode and deterministic tests possible.
 */

import type { Milliseconds } from './units.contract.ts';

/** Milliseconds since the Unix epoch, UTC. */
export type Instant = number & { readonly __unit: 'instant' };

/**
 * An IANA time zone identifier, e.g. 'Europe/London'.
 * Never store a fixed UTC offset: offsets change with DST, and the entire point
 * of the sun-time skill is the gap between civil clock time and solar time.
 */
export type TimeZoneId = string & { readonly __brand: 'TimeZoneId' };

/** Civil wall-clock time as a human reads it off a phone. */
export interface CivilTime {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly zone: TimeZoneId;
  /** True when the zone is observing daylight saving at this instant. */
  readonly isDaylightSaving: boolean;
}

/**
 * Contract for `time.ts`. The implementation must end with:
 *   const _contract: TimeApi = { ... };
 */
export interface TimeApi {
  instant(epochMilliseconds: number): Instant;
  instantFromIso(iso: string): Instant;
  toIso(value: Instant): string;

  addDuration(value: Instant, duration: Milliseconds): Instant;
  /** Signed: positive when `a` is later than `b`. */
  durationBetween(a: Instant, b: Instant): Milliseconds;

  /** Uses `Intl.DateTimeFormat`; must not read the ambient zone implicitly. */
  toCivilTime(value: Instant, zone: TimeZoneId): CivilTime;
  timeZone(id: string): TimeZoneId;
}

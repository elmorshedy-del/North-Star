import type { CivilTime, Instant, TimeApi, TimeZoneId } from './time.contract.ts';
import type { Milliseconds } from './units.contract.ts';
import { milliseconds } from './units.ts';

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} requires a finite number, got ${String(value)}`);
  }
}

export function instant(epochMilliseconds: number): Instant {
  assertFinite(epochMilliseconds, 'instant');
  return epochMilliseconds as Instant;
}

export function instantFromIso(iso: string): Instant {
  const epochMilliseconds = Date.parse(iso);
  if (!Number.isFinite(epochMilliseconds)) {
    throw new Error(`instantFromIso: invalid ISO 8601 timestamp: ${iso}`);
  }
  return instant(epochMilliseconds);
}

export function toIso(value: Instant): string {
  return new Date(value).toISOString();
}

export function addDuration(value: Instant, duration: Milliseconds): Instant {
  return instant(value + duration);
}

export function durationBetween(a: Instant, b: Instant): Milliseconds {
  return milliseconds(a - b);
}

export function timeZone(id: string): TimeZoneId {
  return id as TimeZoneId;
}

export function toCivilTime(value: Instant, zone: TimeZoneId): CivilTime {
  const parts = civilParts(value, zone);
  return {
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    zone,
    isDaylightSaving: isDaylightSavingAt(value, zone, parts.year),
  };
}

interface CivilParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

function civilParts(epochMs: number, zone: string): CivilParts {
  // timeZone is always explicit so this never falls back to the host zone.
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(new Date(epochMs));
  return {
    year: parseIntlInteger(partValue(parts, 'year')),
    month: parseIntlInteger(partValue(parts, 'month')),
    day: parseIntlInteger(partValue(parts, 'day')),
    hour: parseIntlInteger(partValue(parts, 'hour')),
    minute: parseIntlInteger(partValue(parts, 'minute')),
    second: parseIntlInteger(partValue(parts, 'second')),
  };
}

function partValue(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  const found = parts.find((part) => part.type === type);
  if (found === undefined) {
    throw new Error(`Intl.DateTimeFormat omitted the ${type} part`);
  }
  return found.value;
}

function parseIntlInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Intl.DateTimeFormat produced a non-integer ${value}`);
  }
  return parsed;
}

function offsetMilliseconds(epochMs: number, zone: string): number {
  const parts = civilParts(epochMs, zone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - epochMs;
}

function isDaylightSavingAt(epochMs: number, zone: string, civilYear: number): boolean {
  // Mid-month noon UTC is never a DST transition day in either hemisphere.
  const january = offsetMilliseconds(Date.UTC(civilYear, 0, 15, 12, 0, 0), zone);
  const july = offsetMilliseconds(Date.UTC(civilYear, 6, 15, 12, 0, 0), zone);
  // Equal offsets mean the zone has no DST this year. The larger offset is
  // summer time whether that falls in July (north) or January (south).
  if (january === july) {
    return false;
  }
  return offsetMilliseconds(epochMs, zone) === Math.max(january, july);
}

const _contract: TimeApi = {
  instant,
  instantFromIso,
  toIso,
  addDuration,
  durationBetween,
  toCivilTime,
  timeZone,
};
void _contract;

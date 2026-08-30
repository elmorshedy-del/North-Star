/**
 * Ports for everything the platform provides: clock, position, sensors, storage.
 *
 * ARCHITECT-OWNED CONTRACT — implementation packets must not edit this file.
 *
 * Every one of these is implemented twice — once for the browser prototype and
 * once for the native app — and `packages/core` depends only on these
 * interfaces. That is the whole reason the web prototype is not throwaway work:
 * when the Expo app arrives it re-implements four small adapters and reuses the
 * core verbatim.
 */

import type { Instant, TimeZoneId } from '../../domain/time.contract.ts';
import type { GeoPosition } from '../../domain/geo.contract.ts';
import type { AttitudeReading, HandCalibration } from '../../domain/measurement.contract.ts';
import type { Result } from '../../domain/result.contract.ts';

/**
 * The one and only place the ambient clock may be read.
 * Nothing under `packages/core` may call `Date.now()`; ESLint enforces it.
 */
export interface ClockPort {
  now(): Instant;
  /** The device's IANA zone, e.g. 'Europe/London'. */
  currentZone(): TimeZoneId;
}

export type LocationErrorCode =
  /** The user said no. Recoverable only by asking again from a gesture. */
  | 'permission-denied'
  /** Permission granted but no fix yet — indoors, cold start. */
  | 'position-unavailable'
  | 'timeout'
  /** No geolocation API at all (desktop browser, privacy build). */
  | 'unsupported';

export interface LocationError {
  readonly code: LocationErrorCode;
  readonly detail: string;
}

export interface LocationFix {
  readonly position: GeoPosition;
  readonly at: Instant;
  /** Horizontal accuracy in metres, as reported by the platform. */
  readonly accuracyMetres: number;
}

export interface LocationProvider {
  current(): Promise<Result<LocationFix, LocationError>>;
}

export type AttitudeErrorCode = 'permission-denied' | 'unsupported' | 'no-readings';

export interface AttitudeError {
  readonly code: AttitudeErrorCode;
  readonly detail: string;
}

/**
 * Device orientation, used for the phone-as-sextant sighting.
 *
 * `requestPermission` exists because iOS Safari gates motion sensors behind an
 * explicit call that must originate from a real user gesture, and silently
 * yields nothing otherwise. Android exposes them without a prompt. Any UI that
 * needs attitude must therefore be entered through a button press, never on
 * mount — this is a hard platform constraint, not a stylistic preference.
 */
export interface AttitudePort {
  isSupported(): boolean;
  /** MUST be called synchronously inside a user-gesture handler. */
  requestPermission(): Promise<Result<'granted', AttitudeError>>;
  /** Returns an unsubscribe function. */
  subscribe(listener: (reading: AttitudeReading) => void): () => void;
}

export type SkillId = string & { readonly __brand: 'SkillId' };

export interface SkillProgress {
  readonly skillId: SkillId;
  readonly attempts: number;
  readonly bestErrorMagnitude: number | null;
  readonly lastAttemptAt: Instant | null;
  /** Attempts against a live sky only. Simulated skies never count. */
  readonly liveAttempts: number;
}

export interface LearnerProfile {
  readonly calibration: HandCalibration | null;
  readonly progress: readonly SkillProgress[];
}

/** Persistence. `localStorage` in the browser, AsyncStorage on device. */
export interface ProgressRepository {
  load(): Promise<LearnerProfile>;
  save(profile: LearnerProfile): Promise<void>;
}

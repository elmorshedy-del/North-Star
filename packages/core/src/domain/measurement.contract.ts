/**
 * How a human measures an angle in the field.
 *
 * ARCHITECT-OWNED CONTRACT — implementation packets must not edit this file.
 *
 * Two methods are supported, and the difference between them is a product
 * decision, not a technical one:
 *
 *   HAND  — outstretched fist and fingers against the sky. No equipment, works
 *           when the phone is dead, and is the skill people actually keep.
 *   SIGHT — the phone itself as an inclinometer, sighted along its long edge.
 *           Far more accurate, and the moment the app feels like an instrument.
 *
 * IMPORTANT DOMAIN FACT, and the reason hand calibration exists at all: the folk
 * rules are wrong. "Four fingers is one hour" implies 3.75 degrees per finger,
 * but a real finger at arm's length subtends roughly 1.5-2 degrees — off by
 * about a factor of two — and it varies substantially between people, because
 * the ratio that matters is finger width to arm length, not hand size alone.
 * So we measure the user's own hand once against a known angle and use their
 * numbers forever after. Do not ship the folk constants as if they were true.
 */

import type { Degrees, Milliseconds } from './units.contract.ts';
import type { Instant } from './time.contract.ts';
import type { DomainError, Result } from './result.contract.ts';

/** A count of hand units stacked up from a reference, e.g. the horizon. */
export interface HandSpanCount {
  readonly fingers: number;
  readonly fists: number;
  readonly spans: number;
}

export type CalibrationMethod =
  /** Derived from the user sighting a known angle. Trustworthy. */
  | 'known-angle'
  /** Population average. A starting point, and must be labelled as such in UI. */
  | 'population-default';

export interface HandCalibration {
  readonly degreesPerFinger: Degrees;
  readonly degreesPerFist: Degrees;
  readonly degreesPerSpan: Degrees;
  readonly method: CalibrationMethod;
  readonly calibratedAt: Instant;
}

/**
 * Raw gravity vector from a device, in the device's own frame.
 * Axes follow the W3C convention: +x right, +y top, +z out of the screen.
 * Magnitude is irrelevant — implementations must normalise.
 */
export interface GravityVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type SensorAccuracy = 'high' | 'medium' | 'low' | 'unknown';

export interface AttitudeReading {
  readonly gravity: GravityVector;
  readonly at: Instant;
  readonly accuracy: SensorAccuracy;
}

/**
 * Contract for `measurement.ts`. The implementation must end with:
 *   const _contract: MeasurementApi = { ... };
 */
export interface MeasurementApi {
  /** Honest population averages, clearly marked `population-default`. */
  populationDefaultCalibration(at: Instant): HandCalibration;

  /**
   * Derive a personal calibration from one sighting of a known angle.
   * Fails `out-of-range` if the implied degrees-per-finger is not plausible
   * (outside 0.5-5 degrees) — that means the user miscounted, and silently
   * accepting it would poison every later measurement.
   */
  calibrateFromKnownAngle(
    knownAngle: Degrees,
    counted: HandSpanCount,
    at: Instant,
  ): Result<HandCalibration, DomainError>;

  angleFromHandUnits(calibration: HandCalibration, counted: HandSpanCount): Degrees;

  /**
   * Angle of the phone's long edge above horizontal, from the gravity vector.
   * Must return 0 for a flat phone and 90 for one pointed at the zenith, and
   * must stay correct past vertical rather than folding back.
   */
  sightedAltitude(reading: AttitudeReading): Degrees;

  /**
   * True when the device was held still enough to trust. A sight taken while
   * moving is the dominant error source in practice, well ahead of sensor noise.
   */
  isSteady(readings: readonly AttitudeReading[], window: Milliseconds, tolerance: Degrees): boolean;

  /** Mean sighted altitude across a steady window, to damp sensor jitter. */
  averagedAltitude(readings: readonly AttitudeReading[]): Result<Degrees, DomainError>;
}

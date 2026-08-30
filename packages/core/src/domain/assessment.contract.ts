/**
 * What the user guessed, and how wrong they were.
 *
 * ARCHITECT-OWNED CONTRACT — implementation packets must not edit this file.
 *
 * `signedError` is carried deliberately alongside magnitude. Direction is the
 * coachable signal: a learner who consistently overestimates altitude is making
 * one specific, fixable mistake (usually measuring from the visible horizon
 * without accounting for their own eye height, or letting the arm bend). A bare
 * magnitude cannot tell them that.
 */

import type { Degrees } from './units.contract.ts';
import type { Instant } from './time.contract.ts';

export type Estimate =
  | { readonly kind: 'angle'; readonly value: Degrees }
  | { readonly kind: 'bearing'; readonly value: Degrees }
  | { readonly kind: 'instant'; readonly value: Instant };

export type TruthValue = Estimate;

export type GradeBand = 'bullseye' | 'close' | 'fair' | 'off';

/** Per-skill thresholds. Boundaries are inclusive of the tighter band. */
export interface GradeScale {
  readonly unit: 'degrees' | 'minutes';
  readonly bullseye: number;
  readonly close: number;
  readonly fair: number;
}

export interface Grade {
  readonly band: GradeBand;
  /** Absolute error in `unit`. */
  readonly errorMagnitude: number;
  /** Negative = the user was under the truth, positive = over. */
  readonly signedError: number;
  readonly unit: 'degrees' | 'minutes';
  /** One short line the user reads first. */
  readonly headline: string;
  /** What the number means and what to change next time. */
  readonly explanation: string;
}

/**
 * Contract for `assessment.ts`. The implementation must end with:
 *   const _contract: AssessmentApi = { ... };
 */
export interface AssessmentApi {
  /**
   * Signed difference estimate minus truth, in the scale's unit.
   * Bearings must use shortest-way-round: guessing 359 against a truth of 1 is
   * an error of -2, not +358.
   */
  signedErrorOf(estimate: Estimate, truth: TruthValue, unit: 'degrees' | 'minutes'): number;
  bandFor(errorMagnitude: number, scale: GradeScale): GradeBand;
}

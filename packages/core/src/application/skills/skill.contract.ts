/**
 * The Skill contract — the shape every teachable technique takes.
 *
 * ARCHITECT-OWNED CONTRACT — implementation packets must not edit this file.
 *
 * A skill is four things and nothing more: it knows when it is *possible*, it
 * knows the *truth*, it can *grade* a guess against that truth, and it can
 * *teach* itself. Everything else — screens, progress, streaks — lives outside.
 *
 * Teaching content is DATA, not markup. It is defined here as a structure, not
 * written into components, because copy that lives in JSX cannot be tested,
 * reviewed as content, reused by the native app, or translated. If a packet
 * finds itself writing instructional prose inside a component, it has taken a
 * wrong turn.
 */

import type { Degrees } from '../../domain/units.contract.ts';
import type { Instant } from '../../domain/time.contract.ts';
import type { SkyContext } from '../../domain/sky-context.contract.ts';
import type { DomainError, Result } from '../../domain/result.contract.ts';
import type {
  Estimate,
  Grade,
  GradeScale,
  TruthValue,
} from '../../domain/assessment.contract.ts';
import type { HandCalibration } from '../../domain/measurement.contract.ts';
import type { EphemerisPort } from '../ports/ephemeris.port.ts';
import type { SkillId } from '../ports/device.port.ts';

export type TimeOfDay = 'day' | 'night';

export type MeasurementMethod =
  /** Counted fists and fingers, using the learner's own calibration. */
  | 'hand-span'
  /** The phone sighted along its edge as an inclinometer. */
  | 'device-sight'
  /** The learner just types a number — used for time-of-day answers. */
  | 'direct-entry';

export interface TeachingStep {
  readonly heading: string;
  readonly body: string;
  /** Key into the app's illustration registry; no markup in content. */
  readonly illustration?: string;
}

export interface TeachingScript {
  /** Why this is worth knowing. Shown before the how. */
  readonly why: string;
  readonly steps: readonly TeachingStep[];
  /** What goes wrong in the field. Written from real failure modes. */
  readonly commonMistakes: readonly string[];
  /** Rendered prominently and never skippable when present. */
  readonly safety?: string;
}

/**
 * Whether a skill can be attempted right now, from right here.
 *
 * When unavailable, `reason` is user-facing copy and is REQUIRED. Silently
 * hiding a skill teaches nothing; "Polaris is below your horizon — you are too
 * far south for this one" teaches something real about the sky. `availableAt`
 * lets the home screen say when to come back.
 */
export type Availability =
  | { readonly available: true }
  | {
      readonly available: false;
      readonly reason: string;
      readonly availableAt: Instant | null;
    };

export interface SkillDefinition {
  readonly id: SkillId;
  readonly title: string;
  readonly oneLiner: string;
  readonly timeOfDay: TimeOfDay;
  readonly prerequisites: readonly SkillId[];
  /** What kind of answer the learner gives; drives which input UI is shown. */
  readonly estimateKind: Estimate['kind'];
  readonly supportedMethods: readonly MeasurementMethod[];
  readonly gradeScale: GradeScale;
  readonly teach: TeachingScript;

  availability(context: SkyContext, ephemeris: EphemerisPort): Availability;

  /** The answer key. Pure in (context, ephemeris). */
  truth(context: SkyContext, ephemeris: EphemerisPort): Result<TruthValue, DomainError>;

  /**
   * Grade a guess and explain it in this skill's own terms. Skill-specific
   * because good feedback is specific: "you were 2 degrees high, which is about
   * one finger-width — check your arm was straight" beats "error: 2.0".
   */
  grade(estimate: Estimate, truth: TruthValue, context: SkyContext): Grade;
}

/**
 * Extra inputs a skill may need that are not part of (context, ephemeris).
 * Passed explicitly rather than reached for, same rule as everything else.
 */
export interface SkillRuntime {
  readonly ephemeris: EphemerisPort;
  readonly calibration: HandCalibration;
}

/**
 * Contract for `registry.ts`. The implementation must end with:
 *   const _contract: SkillRegistryApi = { ... };
 */
export interface SkillRegistryApi {
  allSkills(): readonly SkillDefinition[];
  skillById(id: SkillId): SkillDefinition | undefined;
  /**
   * Skills attemptable right now, for the home screen. Must return the
   * unavailable ones too, with their reasons — the home screen shows what is
   * possible now *and* what the sky is currently withholding.
   */
  availableNow(
    context: SkyContext,
    ephemeris: EphemerisPort,
  ): readonly { readonly skill: SkillDefinition; readonly availability: Availability }[];
}

/** Standard twilight thresholds, in degrees of solar altitude. */
export interface TwilightThresholds {
  readonly civil: Degrees;
  readonly nautical: Degrees;
  readonly astronomical: Degrees;
}

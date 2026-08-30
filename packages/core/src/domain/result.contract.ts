/**
 * Result type and domain error taxonomy.
 *
 * ARCHITECT-OWNED CONTRACT — implementation packets must not edit this file.
 *
 * Rationale: the core never throws for expected failures. A missing GPS fix, a
 * star that never rises at this latitude, or an out-of-range latitude are all
 * *modelled outcomes*, not exceptions. Exceptions are reserved for programmer
 * error (a bug), never for conditions the user can trigger.
 */

export type Result<T, E = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Machine-readable failure reason. Never render a code directly to a user. */
export type DomainErrorCode =
  | 'out-of-range'
  | 'invalid-format'
  | 'not-calibrated'
  | 'body-never-rises'
  | 'body-always-up'
  | 'unsupported-hemisphere';

export interface DomainError {
  readonly code: DomainErrorCode;
  /** Developer-facing detail. User-facing copy lives in the skill layer. */
  readonly detail: string;
}

/**
 * Contract for `result.ts`. The implementation must end with:
 *   const _contract: ResultApi = {
 *     ok, err, isOk, isErr, mapResult, unwrapOr, domainError,
 *   };
 */
export interface ResultApi {
  ok<T>(value: T): Result<T, never>;
  err<E>(error: E): Result<never, E>;
  isOk<T, E>(result: Result<T, E>): result is { readonly ok: true; readonly value: T };
  isErr<T, E>(result: Result<T, E>): result is { readonly ok: false; readonly error: E };
  mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>;
  unwrapOr<T, E>(result: Result<T, E>, fallback: T): T;
  domainError(code: DomainErrorCode, detail: string): DomainError;
}

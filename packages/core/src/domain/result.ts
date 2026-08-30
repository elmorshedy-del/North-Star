import type {
  DomainError,
  DomainErrorCode,
  Result,
  ResultApi,
} from './result.contract.ts';

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(
  result: Result<T, E>,
): result is { readonly ok: true; readonly value: T } {
  return result.ok;
}

export function isErr<T, E>(
  result: Result<T, E>,
): result is { readonly ok: false; readonly error: E } {
  return !result.ok;
}

export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return isOk(result) ? ok(fn(result.value)) : result;
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return isOk(result) ? result.value : fallback;
}

export function domainError(code: DomainErrorCode, detail: string): DomainError {
  return { code, detail };
}

const _contract: ResultApi = {
  ok,
  err,
  isOk,
  isErr,
  mapResult,
  unwrapOr,
  domainError,
};
void _contract;

import { describe, expect, it } from 'vitest';
import { domainError, err, isErr, isOk, mapResult, ok, unwrapOr } from './result.ts';

describe('Result', () => {
  it('isOk and isErr distinguish the two sides', () => {
    const success = ok(4);
    const failure = err(domainError('out-of-range', 'nope'));

    expect(isOk(success)).toBe(true);
    expect(isErr(success)).toBe(false);
    expect(isOk(failure)).toBe(false);
    expect(isErr(failure)).toBe(true);
  });

  it('mapResult transforms only the success side', () => {
    const success = mapResult(ok(4), (n) => n * 2);
    const failure = mapResult(err('kept'), (n: number) => n * 2);

    expect(isOk(success) && success.value).toBe(8);
    expect(isErr(failure) && failure.error).toBe('kept');
  });

  it('unwrapOr returns the value or the fallback', () => {
    expect(unwrapOr(ok('held'), 'fallback')).toBe('held');
    expect(unwrapOr(err('ignored'), 'fallback')).toBe('fallback');
  });

  it('domainError is plain data', () => {
    expect(domainError('invalid-format', 'bad iso')).toEqual({
      code: 'invalid-format',
      detail: 'bad iso',
    });
  });
});

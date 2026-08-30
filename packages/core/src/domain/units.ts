import type {
  Degrees,
  Hours,
  Milliseconds,
  Radians,
  UnitsApi,
} from './units.contract.ts';

function assertFinite(value: number, unit: string): void {
  // Non-finite input is a bug at the call site, not a user-facing failure.
  if (!Number.isFinite(value)) {
    throw new Error(`${unit} requires a finite number, got ${String(value)}`);
  }
}

export function degrees(value: number): Degrees {
  assertFinite(value, 'degrees');
  return value as Degrees;
}

export function radians(value: number): Radians {
  assertFinite(value, 'radians');
  return value as Radians;
}

export function hours(value: number): Hours {
  assertFinite(value, 'hours');
  return value as Hours;
}

export function milliseconds(value: number): Milliseconds {
  assertFinite(value, 'milliseconds');
  return value as Milliseconds;
}

export function toRadians(value: Degrees): Radians {
  return radians((value * Math.PI) / 180);
}

export function toDegrees(value: Radians): Degrees {
  return degrees((value * 180) / Math.PI);
}

export function hoursToDegrees(value: Hours): Degrees {
  return degrees(value * 15);
}

export function degreesToHours(value: Degrees): Hours {
  return hours(value / 15);
}

export function arcminutes(value: number): Degrees {
  return degrees(value / 60);
}

export function normalise360(value: Degrees): Degrees {
  return degrees(((value % 360) + 360) % 360);
}

export function normaliseSigned180(value: Degrees): Degrees {
  const wrapped = normalise360(value);
  return wrapped >= 180 ? degrees(wrapped - 360) : wrapped;
}

export function angularSeparation(a: Degrees, b: Degrees): Degrees {
  const delta = Math.abs(normalise360(a) - normalise360(b));
  return degrees(Math.min(delta, 360 - delta));
}

const _contract: UnitsApi = {
  degrees,
  radians,
  hours,
  milliseconds,
  toRadians,
  toDegrees,
  hoursToDegrees,
  degreesToHours,
  arcminutes,
  normalise360,
  normaliseSigned180,
  angularSeparation,
};
void _contract;

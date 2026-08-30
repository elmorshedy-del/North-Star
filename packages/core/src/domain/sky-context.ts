import type { GeoPosition } from './geo.contract.ts';
import type {
  SkyContext,
  SkyContextApi,
  SkyProvenance,
} from './sky-context.contract.ts';
import type { Instant, TimeZoneId } from './time.contract.ts';

export function skyContext(
  position: GeoPosition,
  instant: Instant,
  zone: TimeZoneId,
  provenance: SkyProvenance,
): SkyContext {
  return { position, instant, zone, provenance };
}

export function atInstant(context: SkyContext, instant: Instant): SkyContext {
  return { ...context, instant };
}

export function countsTowardProgress(context: SkyContext): boolean {
  return context.provenance === 'live';
}

const _contract: SkyContextApi = {
  skyContext,
  atInstant,
  countsTowardProgress,
};
void _contract;

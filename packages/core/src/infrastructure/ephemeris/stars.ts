/**
 * J2000 catalogue for the five stars this product teaches with.
 * astronomy-engine has no star database; Equator(..., ofdate=true) precesses
 * these to the observation date. Table: docs/03-astronomy.md §2.
 */
import { Body, DefineStar } from 'astronomy-engine';

function hoursMinutesSeconds(hours: number, minutes: number, seconds: number): number {
  return hours + minutes / 60 + seconds / 3600;
}

function degreesMinutesSeconds(deg: number, minutes: number, seconds: number): number {
  const sign = deg < 0 ? -1 : 1;
  return sign * (Math.abs(deg) + minutes / 60 + seconds / 3600);
}

DefineStar(Body.Star1, hoursMinutesSeconds(2, 31, 49.09), degreesMinutesSeconds(89, 15, 50.8), 433);
DefineStar(Body.Star2, hoursMinutesSeconds(11, 3, 43.67), degreesMinutesSeconds(61, 45, 3.7), 123);
DefineStar(Body.Star3, hoursMinutesSeconds(11, 1, 50.48), degreesMinutesSeconds(56, 22, 56.7), 79.7);
DefineStar(Body.Star4, hoursMinutesSeconds(5, 36, 12.81), degreesMinutesSeconds(-1, 12, 6.9), 2000);
DefineStar(Body.Star5, hoursMinutesSeconds(21, 8, 46.2), degreesMinutesSeconds(-88, 57, 23.4), 294);

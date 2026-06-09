import type { DayGroup, ProgramCode } from './types';

export function isWeekend(dg: DayGroup): boolean {
  return dg === 'SAT' || dg === 'SUN';
}

/**
 * Derive the class duration (minutes) from program, level and day-group.
 *
 * Rules (from the business spec):
 *  - Little Sparks weekday          = 60
 *  - Sparks Kid / Sparks Teen wkday = 80
 *  - Any weekend class              = 120
 *  - EXCEPT Little Sparks level 1 weekend = 60
 *
 * Duration is always derived here and never taken from user input, so the
 * stored value can never drift from the rule.
 */
export function deriveDuration(
  programCode: ProgramCode,
  level: number,
  dayGroup: DayGroup,
): number {
  if (isWeekend(dayGroup)) {
    if (programCode === 'LS' && level === 1) return 60; // "LS 1 Weekend" exception
    return 120;
  }
  return programCode === 'LS' ? 60 : 80;
}

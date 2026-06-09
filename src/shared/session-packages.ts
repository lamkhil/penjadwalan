import type { DayGroup, ProgramCode } from './types';

// Preset meeting packages. The number of meetings is not free-form — it follows
// the program and (for SK/ST) whether the day-group is a weekday or weekend.
export interface SessionPackage {
  id: string;
  label: string;
  sessions: number;
}

export const SESSION_PACKAGES: SessionPackage[] = [
  { id: 'LS', label: 'LS — 50 sesi', sessions: 50 },
  { id: 'LS_MINI', label: 'LS Mini Class — 26 sesi', sessions: 26 },
  { id: 'SKST_WEEKDAY', label: 'SK/ST Weekday — 26 sesi', sessions: 26 },
  { id: 'SKST_WEEKEND', label: 'SK/ST Weekend — 18 sesi', sessions: 18 },
];

export const WEEKEND_DAY_GROUPS: DayGroup[] = ['SAT', 'SUN'];

export function packageById(id: string): SessionPackage | undefined {
  return SESSION_PACKAGES.find((p) => p.id === id);
}

/** Package ids that apply to a program (LS vs SK/ST families). */
export function packageIdsFor(programCode: ProgramCode): string[] {
  return programCode === 'LS' ? ['LS', 'LS_MINI'] : ['SKST_WEEKDAY', 'SKST_WEEKEND'];
}

/** Best-fit default package for a program + day-group. */
export function defaultPackageId(programCode: ProgramCode, dayGroup: DayGroup): string {
  if (programCode === 'LS') return 'LS';
  return WEEKEND_DAY_GROUPS.includes(dayGroup) ? 'SKST_WEEKEND' : 'SKST_WEEKDAY';
}

/**
 * Resolve which package a stored class record corresponds to: prefer a package
 * in the program's family whose session count matches the record; otherwise fall
 * back to the program/day-group default.
 */
export function packageForRecord(
  programCode: ProgramCode,
  dayGroup: DayGroup,
  sessions?: number,
): string {
  if (sessions == null) return defaultPackageId(programCode, dayGroup);
  const family = packageIdsFor(programCode);
  const match = SESSION_PACKAGES.find((p) => family.includes(p.id) && p.sessions === sessions);
  return match?.id ?? defaultPackageId(programCode, dayGroup);
}

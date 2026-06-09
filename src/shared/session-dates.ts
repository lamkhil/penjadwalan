import type { DayGroup } from './types';

// JS getUTCDay(): Sun=0, Mon=1, ... Sat=6. Which weekdays each day-group meets.
export const DAY_GROUP_WEEKDAYS: Record<DayGroup, number[]> = {
  MON_WED: [1, 3],
  TUE_THU: [2, 4],
  FRI: [5],
  SAT: [6],
  SUN: [0],
};

function parseISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mo}-${da}`;
}

/**
 * Estimate the date of the last (Nth) meeting given a start date, the number of
 * meetings (`sessions`), and which weekdays the class meets (from its day-group).
 *
 * The start date counts as meeting #1 when it falls on a meeting weekday;
 * otherwise counting begins at the first matching weekday on/after it. Pure: no
 * dependency on the current date. Returns '' for invalid input (bad date,
 * sessions < 1).
 */
export function estimateEndDate(startISO: string, sessions: number, dayGroup: DayGroup): string {
  const start = parseISO(startISO);
  if (!start || !Number.isFinite(sessions) || sessions < 1) return '';

  const weekdays = new Set(DAY_GROUP_WEEKDAYS[dayGroup]);
  const cursor = new Date(start.getTime());
  let count = 0;
  // Safety bound: at most `sessions` weeks of days plus slack to the first match.
  const maxDays = Math.ceil(sessions) * 7 + 14;
  for (let i = 0; i < maxDays; i++) {
    if (weekdays.has(cursor.getUTCDay())) {
      count++;
      if (count >= sessions) return toISO(cursor);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return '';
}

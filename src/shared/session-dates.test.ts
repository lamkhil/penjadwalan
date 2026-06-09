import { describe, expect, it } from 'vitest';
import { estimateEndDate } from './session-dates';

describe('estimateEndDate', () => {
  it('MON_WED: 4 meetings from a Monday', () => {
    // 2026-06-08 is a Monday. Meetings: Jun 8, 10, 15, 17.
    expect(estimateEndDate('2026-06-08', 4, 'MON_WED')).toBe('2026-06-17');
  });

  it('single meeting on the start day returns the start date', () => {
    expect(estimateEndDate('2026-06-08', 1, 'MON_WED')).toBe('2026-06-08');
  });

  it('start date not on a meeting weekday skips to the first match', () => {
    // FRI group, starting Monday 2026-06-08: first Friday is Jun 12, then 19, 26.
    expect(estimateEndDate('2026-06-08', 3, 'FRI')).toBe('2026-06-26');
  });

  it('once-weekly SAT counts weeks directly', () => {
    // 2026-06-06 is a Saturday. 3 meetings: Jun 6, 13, 20.
    expect(estimateEndDate('2026-06-06', 3, 'SAT')).toBe('2026-06-20');
  });

  it('returns empty string for invalid input', () => {
    expect(estimateEndDate('2026-06-08', 0, 'MON_WED')).toBe('');
    expect(estimateEndDate('', 4, 'MON_WED')).toBe('');
    expect(estimateEndDate('not-a-date', 4, 'MON_WED')).toBe('');
  });
});

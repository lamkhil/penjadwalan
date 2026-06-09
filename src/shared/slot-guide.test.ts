import { describe, expect, it } from 'vitest';
import { computeFreeSlots } from './slot-guide';
import type { DayGroup, ScheduledClass } from './types';

const teachers = [
  { id: 'T1', worksDayGroups: ['MON_WED', 'FRI'] as DayGroup[] },
  { id: 'T2', worksDayGroups: ['MON_WED'] as DayGroup[] },
  { id: 'T3', worksDayGroups: ['SAT'] as DayGroup[] },
];

describe('computeFreeSlots', () => {
  it('returns slots only for teachers working that day-group', () => {
    const slots = computeFreeSlots(
      { programCode: 'LS', level: 2, dayGroup: 'MON_WED', gridStepMin: 60 },
      teachers,
      [],
    );
    const ids = new Set(slots.map((s) => s.teacherId));
    expect(ids.has('T1')).toBe(true);
    expect(ids.has('T2')).toBe(true);
    expect(ids.has('T3')).toBe(false); // T3 only works SAT
  });

  it('uses the derived duration (LS weekday = 60)', () => {
    const slots = computeFreeSlots(
      { programCode: 'LS', level: 2, dayGroup: 'MON_WED', gridStepMin: 60 },
      teachers,
      [],
    );
    expect(slots.every((s) => s.durationMin === 60)).toBe(true);
  });

  it('excludes start-times that overlap an existing class for that teacher', () => {
    const existing: ScheduledClass[] = [
      { id: 'A', teacherId: 'T1', classroomId: null, dayGroup: 'MON_WED', startMin: 600, durationMin: 60 },
    ];
    const slots = computeFreeSlots(
      { programCode: 'LS', level: 2, dayGroup: 'MON_WED', teacherId: 'T1', gridStepMin: 10 },
      teachers,
      existing,
    );
    // A 60-min class starting at 10:00 blocks starts in (09:01..10:59); back-to-back 11:00 is free.
    const starts = slots.map((s) => s.startMin);
    expect(starts).not.toContain(600); // 10:00 occupied
    expect(starts).not.toContain(570); // 09:30 would overlap into 10:00
    expect(starts).toContain(540); // 09:00-10:00 fits before
    expect(starts).toContain(660); // 11:00 back-to-back
  });

  it('returns empty when the only candidate teacher is OFF that day', () => {
    const slots = computeFreeSlots(
      { programCode: 'SK', level: 1, dayGroup: 'TUE_THU' },
      teachers,
      [],
    );
    expect(slots).toHaveLength(0);
  });

  it('respects the teacherId filter', () => {
    const slots = computeFreeSlots(
      { programCode: 'LS', level: 2, dayGroup: 'MON_WED', teacherId: 'T2', gridStepMin: 60 },
      teachers,
      [],
    );
    expect(slots.every((s) => s.teacherId === 'T2')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { checkConflicts, checkRetentionTeacher, overlaps } from './conflict-guard';
import type { CandidateClass, DayGroup, ScheduledClass } from './types';

// Default: every teacher works every day-group unless a test says otherwise.
const allWork = (_id: string, _dg: DayGroup) => true;

function existing(partial: Partial<ScheduledClass> & { id: string }): ScheduledClass {
  return {
    teacherId: 'T1',
    classroomId: null,
    dayGroup: 'MON_WED',
    startMin: 600, // 10:00
    durationMin: 60,
    ...partial,
  };
}

function candidate(partial: Partial<CandidateClass> = {}): CandidateClass {
  return {
    teacherId: 'T1',
    classroomId: null,
    dayGroup: 'MON_WED',
    startMin: 600,
    durationMin: 60,
    ...partial,
  };
}

describe('overlaps (half-open intervals)', () => {
  it('back-to-back does not overlap', () => {
    expect(overlaps({ start: 540, end: 600 }, { start: 600, end: 660 })).toBe(false);
  });
  it('true overlap', () => {
    expect(overlaps({ start: 540, end: 620 }, { start: 600, end: 660 })).toBe(true);
  });
});

describe('checkConflicts', () => {
  it('accepts a non-conflicting class', () => {
    const r = checkConflicts(candidate({ startMin: 660 }), [existing({ id: 'A' })], allWork);
    expect(r.ok).toBe(true);
    expect(r.reasons).toHaveLength(0);
  });

  it('back-to-back same teacher is allowed', () => {
    // existing 10:00-11:00, candidate 11:00-12:00
    const r = checkConflicts(candidate({ startMin: 660 }), [existing({ id: 'A' })], allWork);
    expect(r.ok).toBe(true);
  });

  it('flags TEACHER_OVERLAP for same teacher overlapping time', () => {
    const r = checkConflicts(candidate({ startMin: 630 }), [existing({ id: 'A' })], allWork);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContainEqual({ kind: 'TEACHER_OVERLAP', teacherId: 'T1', conflictId: 'A' });
  });

  it('different day-group never collides', () => {
    const r = checkConflicts(
      candidate({ startMin: 630, dayGroup: 'TUE_THU' }),
      [existing({ id: 'A', dayGroup: 'MON_WED' })],
      allWork,
    );
    expect(r.ok).toBe(true);
  });

  it('flags OUT_OF_HOURS before 09:00', () => {
    const r = checkConflicts(candidate({ startMin: 530 }), [], allWork);
    expect(r.reasons).toContainEqual({ kind: 'OUT_OF_HOURS', open: 540, close: 1080 });
  });

  it('flags OUT_OF_HOURS when end passes 18:00', () => {
    // 17:30 start + 120 = 19:30
    const r = checkConflicts(candidate({ startMin: 1050, durationMin: 120 }), [], allWork);
    expect(r.reasons).toContainEqual({ kind: 'OUT_OF_HOURS', open: 540, close: 1080 });
  });

  it('flags TEACHER_OFF when teacher does not work the day-group', () => {
    const worksOnlyFri = (_id: string, dg: DayGroup) => dg === 'FRI';
    const r = checkConflicts(candidate(), [], worksOnlyFri);
    expect(r.reasons).toContainEqual({ kind: 'TEACHER_OFF', teacherId: 'T1', dayGroup: 'MON_WED' });
  });

  it('excludes itself on update', () => {
    const r = checkConflicts(
      candidate({ id: 'A', startMin: 600 }),
      [existing({ id: 'A', startMin: 600 })],
      allWork,
    );
    expect(r.ok).toBe(true);
  });

  it('flags ROOM_OVERLAP for same room overlapping time, different teacher', () => {
    const r = checkConflicts(
      candidate({ teacherId: 'T2', classroomId: 'R1', startMin: 630 }),
      [existing({ id: 'A', teacherId: 'T1', classroomId: 'R1' })],
      allWork,
    );
    expect(r.ok).toBe(false);
    expect(r.reasons).toContainEqual({ kind: 'ROOM_OVERLAP', classroomId: 'R1', conflictId: 'A' });
  });
});

describe('checkRetentionTeacher', () => {
  it('flags a retention class taught by the original teacher', () => {
    const r = checkRetentionTeacher(
      { classType: 'RETENTION', teacherId: 'T1', oldClassCode: 'SK1-2024' },
      { teacherId: 'T1' },
    );
    expect(r).toEqual({ kind: 'RETENTION_SAME_TEACHER', teacherId: 'T1', oldClassCode: 'SK1-2024' });
  });

  it('allows a retention class with a different teacher', () => {
    const r = checkRetentionTeacher(
      { classType: 'RETENTION', teacherId: 'T2', oldClassCode: 'SK1-2024' },
      { teacherId: 'T1' },
    );
    expect(r).toBeNull();
  });

  it('ignores non-retention classes', () => {
    const r = checkRetentionTeacher({ classType: 'NEW', teacherId: 'T1' }, { teacherId: 'T1' });
    expect(r).toBeNull();
  });

  it('allows when the old class cannot be located', () => {
    const r = checkRetentionTeacher(
      { classType: 'RETENTION', teacherId: 'T1', oldClassCode: 'GONE' },
      undefined,
    );
    expect(r).toBeNull();
  });
});

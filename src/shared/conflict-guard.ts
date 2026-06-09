import {
  CLOSE_MIN,
  OPEN_MIN,
  type CandidateClass,
  type ConflictReason,
  type DayGroup,
  type GuardResult,
  type Interval,
  type ScheduledClass,
} from './types';

/**
 * Half-open interval overlap: [a.start, a.end) vs [b.start, b.end).
 * Back-to-back classes (one ends at 10:00, the next starts at 10:00) do NOT
 * overlap, which is the desired behaviour.
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Validate a candidate class against operating hours, teacher availability and
 * all existing classes. Pure: no I/O. Caller supplies `existing` (the relevant
 * classes — typically all classes in the same day-group) and a `teacherWorks`
 * predicate backed by each teacher's `worksDayGroups`.
 *
 * Returns every reason it finds (not just the first) so the UI can show a
 * complete picture of why a booking was rejected.
 */
export function checkConflicts(
  candidate: CandidateClass,
  existing: ScheduledClass[],
  teacherWorks: (teacherId: string, dg: DayGroup) => boolean,
): GuardResult {
  const reasons: ConflictReason[] = [];
  const end = candidate.startMin + candidate.durationMin;

  if (candidate.startMin < OPEN_MIN || end > CLOSE_MIN) {
    reasons.push({ kind: 'OUT_OF_HOURS', open: OPEN_MIN, close: CLOSE_MIN });
  }

  if (candidate.teacherId != null && !teacherWorks(candidate.teacherId, candidate.dayGroup)) {
    reasons.push({
      kind: 'TEACHER_OFF',
      teacherId: candidate.teacherId,
      dayGroup: candidate.dayGroup,
    });
  }

  const cInt: Interval = { start: candidate.startMin, end };
  for (const e of existing) {
    if (candidate.id != null && e.id === candidate.id) continue; // ignore self on update
    if (e.dayGroup !== candidate.dayGroup) continue; // only same day-group can collide

    const eInt: Interval = { start: e.startMin, end: e.startMin + e.durationMin };
    if (!overlaps(cInt, eInt)) continue;

    if (candidate.teacherId != null && e.teacherId === candidate.teacherId) {
      reasons.push({
        kind: 'TEACHER_OVERLAP',
        teacherId: candidate.teacherId,
        conflictId: e.id,
      });
    }
    if (candidate.classroomId != null && e.classroomId === candidate.classroomId) {
      reasons.push({
        kind: 'ROOM_OVERLAP',
        classroomId: candidate.classroomId,
        conflictId: e.id,
      });
    }
  }

  return { ok: reasons.length === 0, reasons };
}

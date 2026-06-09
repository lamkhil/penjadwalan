import { checkConflicts } from './conflict-guard';
import { deriveDuration } from './duration';
import {
  CLOSE_MIN,
  OPEN_MIN,
  type DayGroup,
  type FreeSlot,
  type GuideInput,
  type ScheduledClass,
} from './types';

interface GuideTeacher {
  id: string;
  worksDayGroups: DayGroup[];
}

/**
 * Compute every free start-time per teacher where a class of the correct
 * derived duration fits without violating the conflict guard, for a given
 * program/level/day-group. Used by the "open class" wizard guide.
 *
 * Pure: no I/O. The room is left unassigned at guide time (rooms are chosen
 * after the slot), so ROOM_OVERLAP cannot occur here.
 */
export function computeFreeSlots(
  input: GuideInput,
  teachers: GuideTeacher[],
  existing: ScheduledClass[],
): FreeSlot[] {
  const duration = deriveDuration(input.programCode, input.level, input.dayGroup);
  const step = input.gridStepMin ?? 10;
  const latestStart = CLOSE_MIN - duration;

  const worksMap = new Map(teachers.map((t) => [t.id, new Set(t.worksDayGroups)]));
  const teacherWorks = (teacherId: string, dg: DayGroup) =>
    worksMap.get(teacherId)?.has(dg) ?? false;

  const candidates = teachers.filter((t) => {
    if (input.teacherId && t.id !== input.teacherId) return false;
    return teacherWorks(t.id, input.dayGroup);
  });

  const slots: FreeSlot[] = [];
  for (const t of candidates) {
    for (let start = OPEN_MIN; start <= latestStart; start += step) {
      const result = checkConflicts(
        {
          teacherId: t.id,
          classroomId: null,
          dayGroup: input.dayGroup,
          startMin: start,
          durationMin: duration,
        },
        existing,
        teacherWorks,
      );
      if (result.ok) {
        slots.push({ teacherId: t.id, startMin: start, durationMin: duration });
      }
    }
  }

  slots.sort((a, b) => (a.teacherId === b.teacherId ? a.startMin - b.startMin : a.teacherId < b.teacherId ? -1 : 1));
  return slots;
}

export interface SlotCell {
  startMin: number;
  available: boolean;
}

export interface TeacherSlots {
  teacherId: string;
  slots: SlotCell[];
}

/**
 * Like computeFreeSlots, but returns EVERY candidate start-time per teacher with
 * an `available` flag — so the UI can render a full time ruler and grey out the
 * occupied ones instead of hiding them. Teachers who don't work the day-group
 * are excluded entirely (their column shows OFF elsewhere).
 */
export function computeSlotMatrix(
  input: GuideInput,
  teachers: GuideTeacher[],
  existing: ScheduledClass[],
): TeacherSlots[] {
  const duration = deriveDuration(input.programCode, input.level, input.dayGroup);
  const step = input.gridStepMin ?? 30;
  const latestStart = CLOSE_MIN - duration;

  const worksMap = new Map(teachers.map((t) => [t.id, new Set(t.worksDayGroups)]));
  const teacherWorks = (teacherId: string, dg: DayGroup) =>
    worksMap.get(teacherId)?.has(dg) ?? false;

  const candidates = teachers.filter((t) => {
    if (input.teacherId && t.id !== input.teacherId) return false;
    return teacherWorks(t.id, input.dayGroup);
  });

  return candidates.map((t) => {
    const slots: SlotCell[] = [];
    for (let start = OPEN_MIN; start <= latestStart; start += step) {
      const result = checkConflicts(
        { teacherId: t.id, classroomId: null, dayGroup: input.dayGroup, startMin: start, durationMin: duration },
        existing,
        teacherWorks,
      );
      slots.push({ startMin: start, available: result.ok });
    }
    return { teacherId: t.id, slots };
  });
}

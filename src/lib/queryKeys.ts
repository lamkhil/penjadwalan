import type { DayGroup } from '@shared/types';

export const queryKeys = {
  programs: ['programs'] as const,
  teachers: ['teachers'] as const,
  classrooms: ['classrooms'] as const,
  students: ['students'] as const,
  classes: ['classes'] as const,
  classesByDay: (dg: DayGroup) => ['classes', dg] as const,
  enrollments: (classId: string) => ['enrollments', classId] as const,
};

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { checkConflicts, checkRetentionTeacher } from '@shared/conflict-guard';
import { deriveDuration } from '@shared/duration';
import { FREED_LIFECYCLES } from '@shared/types';
import type {
  ClassRecord,
  ClassType,
  Classroom,
  ConflictReason,
  DayGroup,
  Enrollment,
  Program,
  ScheduledClass,
  Student,
  Teacher,
} from '@shared/types';
import { todayISO } from './format';

// ---- Error type carrying the structured guard reasons up to the UI ----

export class ConflictError extends Error {
  reasons: ConflictReason[];
  constructor(reasons: ConflictReason[]) {
    super('Jadwal bentrok');
    this.name = 'ConflictError';
    this.reasons = reasons;
  }
}

// ---- Generic helpers ----

function withId<T>(snap: { id: string; data: () => unknown }): T {
  return { id: snap.id, ...(snap.data() as object) } as T;
}

async function listAll<T>(col: string): Promise<T[]> {
  const snap = await getDocs(collection(db, col));
  return snap.docs.map((d) => withId<T>(d));
}

// ---- Programs (read-mostly seed data) ----

export const listPrograms = () => listAll<Program>('programs');

// ---- Teachers ----

export const listTeachers = () => listAll<Teacher>('teachers');

export async function createTeacher(t: Omit<Teacher, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'teachers'), t);
  return ref.id;
}

export async function updateTeacher(id: string, patch: Partial<Omit<Teacher, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'teachers', id), patch);
}

export async function deleteTeacher(id: string): Promise<void> {
  await deleteDoc(doc(db, 'teachers', id));
}

// ---- Classrooms ----

export const listClassrooms = () => listAll<Classroom>('classrooms');

export async function createClassroom(c: Omit<Classroom, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'classrooms'), c);
  return ref.id;
}

export async function updateClassroom(id: string, patch: Partial<Omit<Classroom, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'classrooms', id), patch);
}

export async function deleteClassroom(id: string): Promise<void> {
  await deleteDoc(doc(db, 'classrooms', id));
}

// ---- Students ----

export const listStudents = () => listAll<Student>('students');

export async function createStudent(s: Omit<Student, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'students'), s);
  return ref.id;
}

export async function updateStudent(id: string, patch: Partial<Omit<Student, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'students', id), patch);
}

export async function deleteStudent(id: string): Promise<void> {
  await deleteDoc(doc(db, 'students', id));
}

// ---- Classes ----

export const listClasses = () => listAll<ClassRecord>('classes');

export async function listClassesByDayGroup(dg: DayGroup): Promise<ClassRecord[]> {
  const snap = await getDocs(query(collection(db, 'classes'), where('dayGroup', '==', dg)));
  return snap.docs.map((d) => withId<ClassRecord>(d));
}

/** Realtime subscription to all classes of one day-group, for the grid. */
export function subscribeClasses(dg: DayGroup, cb: (classes: ClassRecord[]) => void): () => void {
  const q = query(collection(db, 'classes'), where('dayGroup', '==', dg));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => withId<ClassRecord>(d))));
}

function toScheduled(c: ClassRecord): ScheduledClass {
  return {
    id: c.id,
    teacherId: c.teacherId,
    classroomId: c.classroomId,
    dayGroup: c.dayGroup,
    startMin: c.startMin,
    durationMin: c.durationMin,
  };
}

// Input for creating/updating a class. Note: durationMin is intentionally NOT
// accepted — it is always derived from program/level/dayGroup.
export type ClassInput = Omit<ClassRecord, 'id' | 'durationMin'>;

/** Find a class by its (user-entered) classCode. Used to resolve a retention
 *  class's original class. Returns the first match or undefined. */
async function findClassByCode(classCode: string): Promise<ClassRecord | undefined> {
  const snap = await getDocs(query(collection(db, 'classes'), where('classCode', '==', classCode)));
  return snap.docs.length ? withId<ClassRecord>(snap.docs[0]) : undefined;
}

async function runGuard(
  candidate: {
    id?: string;
    classType: ClassType;
    oldClassCode?: string;
    teacherId: string | null;
    classroomId: string | null;
    dayGroup: DayGroup;
    startMin: number;
    durationMin: number;
  },
): Promise<void> {
  const [existing, teachers] = await Promise.all([
    listClassesByDayGroup(candidate.dayGroup),
    listTeachers(),
  ]);
  // Completed classes no longer occupy their slot — exclude them from the check.
  const active = existing.filter((c) => !FREED_LIFECYCLES.includes(c.lifecycle));
  const worksMap = new Map(teachers.map((t) => [t.id, new Set(t.worksDayGroups)]));
  const teacherWorks = (teacherId: string, dg: DayGroup) => worksMap.get(teacherId)?.has(dg) ?? false;
  const result = checkConflicts(candidate, active.map(toScheduled), teacherWorks);
  const reasons = [...result.reasons];

  // Retention classes must use a different teacher than the original class.
  if (candidate.classType === 'RETENTION' && candidate.oldClassCode) {
    const oldClass = await findClassByCode(candidate.oldClassCode);
    const retention = checkRetentionTeacher(candidate, oldClass);
    if (retention) reasons.push(retention);
  }

  if (reasons.length) throw new ConflictError(reasons);
}

/** Create a class. Derives duration, runs the conflict guard, then writes. */
export async function createClass(input: ClassInput): Promise<string> {
  const durationMin = deriveDuration(input.programCode, input.level, input.dayGroup);
  await runGuard({
    classType: input.classType,
    oldClassCode: input.oldClassCode,
    teacherId: input.teacherId,
    classroomId: input.classroomId,
    dayGroup: input.dayGroup,
    startMin: input.startMin,
    durationMin,
  });
  const ref = await addDoc(collection(db, 'classes'), { ...input, durationMin });
  return ref.id;
}

/** Update a class. Re-derives duration and re-runs the guard (excluding self). */
export async function updateClass(id: string, input: ClassInput): Promise<void> {
  const durationMin = deriveDuration(input.programCode, input.level, input.dayGroup);
  await runGuard({
    id,
    classType: input.classType,
    oldClassCode: input.oldClassCode,
    teacherId: input.teacherId,
    classroomId: input.classroomId,
    dayGroup: input.dayGroup,
    startMin: input.startMin,
    durationMin,
  });
  await setDoc(doc(db, 'classes', id), { ...input, durationMin });
}

export async function deleteClass(id: string): Promise<void> {
  await deleteDoc(doc(db, 'classes', id));
}

/** Mark a running class as Selesai (COMPLETED). Frees its slot. */
export async function finishClass(id: string): Promise<void> {
  await updateDoc(doc(db, 'classes', id), { lifecycle: 'COMPLETED', completedAt: todayISO() });
}

/**
 * Auto-complete any CONFIRMED class whose endDate has passed. Returns how many
 * were updated. Idempotent — safe to call on every app load.
 */
export async function autoCompleteExpired(): Promise<number> {
  const today = todayISO();
  const snap = await getDocs(query(collection(db, 'classes'), where('lifecycle', '==', 'CONFIRMED')));
  const expired = snap.docs
    .map((d) => withId<ClassRecord>(d))
    .filter((c) => c.endDate && c.endDate < today);
  await Promise.all(
    expired.map((c) => updateDoc(doc(db, 'classes', c.id), { lifecycle: 'COMPLETED', completedAt: today })),
  );
  return expired.length;
}

// ---- Enrollments ----

export async function listEnrollmentsByClass(classId: string): Promise<Enrollment[]> {
  const snap = await getDocs(query(collection(db, 'enrollments'), where('classId', '==', classId)));
  return snap.docs.map((d) => withId<Enrollment>(d));
}

export async function createEnrollment(e: Omit<Enrollment, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'enrollments'), e);
  return ref.id;
}

export async function deleteEnrollment(id: string): Promise<void> {
  await deleteDoc(doc(db, 'enrollments', id));
}

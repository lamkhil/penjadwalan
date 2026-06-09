// Core domain types shared across the pure logic modules, the Firestore repo,
// and the React UI. These types have NO dependency on Firebase or the DOM so
// they can be unit-tested in isolation and (later) lifted into a Cloud Function.

export type ProgramCode = 'LS' | 'SK' | 'ST';

export type DayGroup = 'MON_WED' | 'TUE_THU' | 'FRI' | 'SAT' | 'SUN';

export const DAY_GROUPS: DayGroup[] = ['MON_WED', 'TUE_THU', 'FRI', 'SAT', 'SUN'];

export const DAY_GROUP_LABEL: Record<DayGroup, string> = {
  MON_WED: 'Monday & Wednesday',
  TUE_THU: 'Tuesday & Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
};

export type ClassType = 'NEW' | 'RETENTION';

export type ClassStatus = 'NEW' | 'TRIAL' | 'ACTIVE' | 'OFF';

// Class lifecycle:
//  DRAFT     = belum mulai, masih bisa diubah-ubah
//  FORMING   = belum mulai, sedang dibentuk (akan dibuka)
//  CONFIRMED = kelas sedang berjalan
//  COMPLETED = kelas sudah selesai (slot dibebaskan, disembunyikan di grid by default)
export type Lifecycle = 'DRAFT' | 'FORMING' | 'CONFIRMED' | 'COMPLETED';

export const LIFECYCLES: Lifecycle[] = ['DRAFT', 'FORMING', 'CONFIRMED', 'COMPLETED'];

export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  DRAFT: 'Draft (belum mulai, bisa diubah)',
  FORMING: 'Forming (belum mulai)',
  CONFIRMED: 'Berjalan',
  COMPLETED: 'Selesai',
};

// Lifecycles that no longer occupy a teacher's slot (excluded from conflict guard).
export const FREED_LIFECYCLES: Lifecycle[] = ['COMPLETED'];

// Operating hours, expressed as minutes-from-midnight. 09:00 = 540, 18:00 = 1080.
export const OPEN_MIN = 540;
export const CLOSE_MIN = 1080;

// ---- Master data ----

export interface Program {
  code: ProgramCode;
  name: string;
  minLevel: number;
  maxLevel: number;
  weekdayDurationMin: number;
  color: string; // hex used for grid blocks
}

export interface Teacher {
  id: string;
  code: string; // 2-letter initials e.g. 'CC'
  name: string;
  isAssistant: boolean;
  active: boolean;
  worksDayGroups: DayGroup[]; // absence of a day-group = OFF that day-group
}

export interface Classroom {
  id: string;
  code: string; // e.g. 'EA'
  name: string; // e.g. 'Elephant A'
  floor?: string; // e.g. 'Lt 2'
}

export interface Student {
  id: string;
  studentCode: string; // e.g. 'R260032'
  name: string;
  scheduleLabel?: string; // raw label from the source sheet, e.g. 'LS 1 Sun'
}

export interface ClassRecord {
  id: string;
  classCode: string;
  classType: ClassType;
  oldClassCode?: string; // required iff classType === 'RETENTION'
  programCode: ProgramCode;
  level: number;
  dayGroup: DayGroup;
  startMin: number; // minutes from midnight
  durationMin: number; // derived server/client-side, never trusted from input
  teacherId: string | null;
  classroomId: string | null;
  startDate?: string; // ISO 'YYYY-MM-DD'
  endDate?: string; // ISO 'YYYY-MM-DD' — tanggal akhir kelas (dipakai auto-complete)
  completedAt?: string; // ISO 'YYYY-MM-DD' — kapan kelas ditandai Selesai
  status: ClassStatus;
  lifecycle: Lifecycle;
  picCode?: string; // PIC staff code shown on grid block, e.g. 'FL'
  studentCount?: number;
  notes?: string;
}

export type EnrollmentStatus = 'ENROLLED' | 'TRIAL' | 'WAITLIST' | 'DROPPED';

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  status: EnrollmentStatus;
}

// ---- Conflict guard ----

export interface Interval {
  start: number;
  end: number;
}

// Minimal shape the conflict guard needs from an already-scheduled class.
export interface ScheduledClass {
  id: string;
  teacherId: string | null;
  classroomId: string | null;
  dayGroup: DayGroup;
  startMin: number;
  durationMin: number;
}

// Shape of the class being validated. `id` is present on update so the guard
// excludes the record from colliding with itself.
export interface CandidateClass {
  id?: string;
  teacherId: string | null;
  classroomId: string | null;
  dayGroup: DayGroup;
  startMin: number;
  durationMin: number;
}

export type ConflictReason =
  | { kind: 'OUT_OF_HOURS'; open: number; close: number }
  | { kind: 'TEACHER_OFF'; teacherId: string; dayGroup: DayGroup }
  | { kind: 'TEACHER_OVERLAP'; teacherId: string; conflictId: string }
  | { kind: 'ROOM_OVERLAP'; classroomId: string; conflictId: string };

export interface GuardResult {
  ok: boolean;
  reasons: ConflictReason[];
}

// ---- Slot guide ----

export interface GuideInput {
  programCode: ProgramCode;
  level: number;
  dayGroup: DayGroup;
  teacherId?: string; // optional filter to a single teacher
  gridStepMin?: number; // candidate start granularity, default 10
}

export interface FreeSlot {
  teacherId: string;
  startMin: number;
  durationMin: number;
}

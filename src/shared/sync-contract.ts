// Placeholder type contract for the deferred Apps Script <-> Google Sheets sync
// phase. Nothing here is implemented yet; it only fixes the import/export shape
// so the future connector and the app agree on the wire format.

import type { ClassRecord, Classroom, Student, Teacher } from './types';

/** A full snapshot the connector would push to / pull from Google Sheets. */
export interface SyncSnapshot {
  version: 1;
  exportedAt: string; // ISO timestamp
  teachers: Teacher[];
  classrooms: Classroom[];
  students: Student[];
  classes: ClassRecord[];
}

/** Direction of a sync run, for logging/auditing once implemented. */
export type SyncDirection = 'APP_TO_SHEET' | 'SHEET_TO_APP';

export interface SyncResult {
  direction: SyncDirection;
  ranAt: string;
  counts: Record<keyof Omit<SyncSnapshot, 'version' | 'exportedAt'>, number>;
}

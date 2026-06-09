import type { ConflictReason, Lifecycle, ProgramCode } from '@shared/types';

/** 540 -> "09:00" */
export function minToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "09:00" -> 540 */
export function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export const PROGRAM_COLOR: Record<ProgramCode, string> = {
  LS: '#F4B9B9',
  SK: '#B9D7F4',
  ST: '#C9F4B9',
};

export const PROGRAM_LABEL: Record<ProgramCode, string> = {
  LS: 'Little Sparks',
  SK: 'Sparks Kid',
  ST: 'Sparks Teen',
};

/** Short program/level tag for a grid block, e.g. "LS 1". */
export function programTag(programCode: ProgramCode, level: number): string {
  return `${programCode} ${level}`;
}

export const DRAFT_COLOR = '#c9ccd1'; // abu-abu untuk kelas Draft
export const COMPLETED_COLOR = '#dfe2e6'; // abu pudar untuk kelas Selesai

/** Block background by lifecycle: Draft/Selesai = abu, lainnya = warna program. */
export function blockColor(programCode: ProgramCode, lifecycle: Lifecycle | undefined): string {
  if (lifecycle === 'DRAFT') return DRAFT_COLOR;
  if (lifecycle === 'COMPLETED') return COMPLETED_COLOR;
  return PROGRAM_COLOR[programCode];
}

/** Today's date as ISO 'YYYY-MM-DD' (local). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Human-readable Indonesian explanation of a guard rejection reason. */
export function reasonText(r: ConflictReason): string {
  switch (r.kind) {
    case 'OUT_OF_HOURS':
      return `Di luar jam operasional (${minToHHMM(r.open)}–${minToHHMM(r.close)}).`;
    case 'TEACHER_OFF':
      return `Teacher tidak mengajar (OFF) pada hari ini.`;
    case 'TEACHER_OVERLAP':
      return `Teacher sudah punya kelas yang bertabrakan di jam ini.`;
    case 'ROOM_OVERLAP':
      return `Ruang kelas sudah dipakai kelas lain di jam ini.`;
  }
}

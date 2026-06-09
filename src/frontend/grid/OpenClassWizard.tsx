import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { computeSlotMatrix } from '@shared/slot-guide';
import { deriveDuration } from '@shared/duration';
import {
  DAY_GROUPS,
  DAY_GROUP_LABEL,
  LIFECYCLES,
  LIFECYCLE_LABEL,
  type ClassRecord,
  type ClassType,
  type Classroom,
  type DayGroup,
  type Lifecycle,
  type Program,
  type ProgramCode,
  type Teacher,
} from '@shared/types';
import { PROGRAM_LABEL, minToHHMM, reasonText } from '@lib/format';
import { ConflictError, createClass, updateClass, type ClassInput } from '@lib/repo';
import { queryKeys } from '@lib/queryKeys';

export function OpenClassWizard({
  teachers,
  programs,
  classrooms,
  classes,
  defaultDayGroup,
  editing,
  onClose,
}: {
  teachers: Teacher[];
  programs: Program[];
  classrooms: Classroom[];
  classes: ClassRecord[]; // classes for the currently-viewed day-group
  defaultDayGroup: DayGroup;
  editing?: ClassRecord; // when set, the wizard edits this class instead of creating
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!editing;
  const [classType, setClassType] = useState<ClassType>(editing?.classType ?? 'NEW');
  const [oldClassCode, setOldClassCode] = useState(editing?.oldClassCode ?? '');
  const [classCode, setClassCode] = useState(editing?.classCode ?? '');
  const [programCode, setProgramCode] = useState<ProgramCode>(editing?.programCode ?? 'LS');
  const [level, setLevel] = useState(editing?.level ?? 1);
  const [dayGroup, setDayGroup] = useState<DayGroup>(editing?.dayGroup ?? defaultDayGroup);
  const [teacherId, setTeacherId] = useState<string | null>(editing?.teacherId ?? null);
  const [startMin, setStartMin] = useState<number | null>(editing?.startMin ?? null);
  const [classroomId, setClassroomId] = useState<string | null>(editing?.classroomId ?? null);
  const [startDate, setStartDate] = useState(editing?.startDate ?? '');
  const [endDate, setEndDate] = useState(editing?.endDate ?? '');
  const [lifecycle, setLifecycle] = useState<Lifecycle>(editing?.lifecycle ?? 'CONFIRMED');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const program = programs.find((p) => p.code === programCode);
  const maxLevel = program?.maxLevel ?? 10;
  const duration = deriveDuration(programCode, level, dayGroup);

  // The guide is computed entirely client-side from the loaded masters + classes.
  // Full time ruler per teacher (every 30 min); occupied slots flagged unavailable.
  const slotMatrix = useMemo(() => {
    // The wizard can target any day-group; only classes for that day-group matter.
    // When editing, exclude the class itself so its current slot reads as free.
    const sameDay = classes.filter(
      (c) => c.dayGroup === dayGroup && c.id !== editing?.id && c.lifecycle !== 'COMPLETED',
    );
    return computeSlotMatrix(
      { programCode, level, dayGroup, gridStepMin: 30 },
      teachers.map((t) => ({ id: t.id, worksDayGroups: t.worksDayGroups })),
      sameDay.map((c) => ({
        id: c.id,
        teacherId: c.teacherId,
        classroomId: c.classroomId,
        dayGroup: c.dayGroup,
        startMin: c.startMin,
        durationMin: c.durationMin,
      })),
    );
  }, [classes, teachers, programCode, level, dayGroup, editing?.id]);

  const slotsByTeacher = useMemo(() => {
    const m = new Map<string, { startMin: number; available: boolean }[]>();
    for (const row of slotMatrix) {
      const slots = row.slots.slice();
      // Ensure the currently-selected start shows up even if off the 30-min ruler
      // (e.g. an existing class starting at 10:10 while editing).
      if (startMin != null && teacherId === row.teacherId && !slots.some((s) => s.startMin === startMin)) {
        slots.push({ startMin, available: true });
        slots.sort((a, b) => a.startMin - b.startMin);
      }
      m.set(row.teacherId, slots);
    }
    return m;
  }, [slotMatrix, startMin, teacherId]);

  const teacherById = new Map(teachers.map((t) => [t.id, t]));

  async function onSave() {
    const errs: string[] = [];
    if (!classCode.trim()) errs.push('Class ID wajib diisi.');
    if (classType === 'RETENTION' && !oldClassCode.trim()) errs.push('Kode kelas lama wajib diisi untuk Retention Class.');
    if (!teacherId) errs.push('Pilih teacher.');
    if (startMin == null) errs.push('Pilih jam mulai dari slot yang tersedia.');
    if (errs.length) {
      setErrors(errs);
      return;
    }

    const input: ClassInput = {
      classCode: classCode.trim(),
      classType,
      oldClassCode: classType === 'RETENTION' ? oldClassCode.trim() : undefined,
      programCode,
      level,
      dayGroup,
      startMin: startMin!,
      teacherId,
      classroomId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      completedAt: editing?.completedAt,
      status: editing?.status ?? 'NEW',
      lifecycle,
    };

    setSaving(true);
    setErrors([]);
    try {
      if (editing) await updateClass(editing.id, input);
      else await createClass(input);
      await qc.invalidateQueries({ queryKey: queryKeys.classes });
      onClose();
    } catch (e) {
      if (e instanceof ConflictError) {
        setErrors(e.reasons.map(reasonText));
      } else {
        setErrors(['Gagal menyimpan kelas. Coba lagi.']);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wizard fullscreen" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{isEdit ? `Edit Kelas · ${editing!.classCode}` : 'Buka Kelas Baru'}</h2>
          <button className="ghost" onClick={onClose}>✕</button>
        </header>

        <div className="modal-body wizard-cols">
          <div className="wizard-left">
          <div className="form-grid">
            <label>
              Jenis Kelas
              <select value={classType} onChange={(e) => setClassType(e.target.value as ClassType)}>
                <option value="NEW">New Class</option>
                <option value="RETENTION">Retention Class</option>
              </select>
            </label>
            {classType === 'RETENTION' && (
              <label>
                Kode Kelas Lama
                <input value={oldClassCode} onChange={(e) => setOldClassCode(e.target.value)} placeholder="mis. SK1-2024" />
              </label>
            )}
            <label>
              Class ID
              <input value={classCode} onChange={(e) => setClassCode(e.target.value)} placeholder="mis. SK1-MW-A" />
            </label>
            <label>
              Program
              <select
                value={programCode}
                onChange={(e) => {
                  setProgramCode(e.target.value as ProgramCode);
                  setLevel(1);
                  setTeacherId(null);
                  setStartMin(null);
                }}
              >
                {programs.map((p) => (
                  <option key={p.code} value={p.code}>{PROGRAM_LABEL[p.code]}</option>
                ))}
              </select>
            </label>
            <label>
              Level
              <select value={level} onChange={(e) => { setLevel(Number(e.target.value)); setTeacherId(null); setStartMin(null); }}>
                {Array.from({ length: maxLevel }, (_, i) => i + 1).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
            <label>
              Hari
              <select value={dayGroup} onChange={(e) => { setDayGroup(e.target.value as DayGroup); setTeacherId(null); setStartMin(null); }}>
                {DAY_GROUPS.map((dg) => (
                  <option key={dg} value={dg}>{DAY_GROUP_LABEL[dg]}</option>
                ))}
              </select>
            </label>
            <label>
              Ruang Kelas (opsional)
              <select value={classroomId ?? ''} onChange={(e) => setClassroomId(e.target.value || null)}>
                <option value="">—</option>
                {classrooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
                ))}
              </select>
            </label>
            <label>
              Start Class (tanggal)
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label>
              Tanggal Selesai (opsional)
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <label>
              Status Kelas
              <select value={lifecycle} onChange={(e) => setLifecycle(e.target.value as Lifecycle)}>
                {LIFECYCLES.map((lc) => (
                  <option key={lc} value={lc}>{LIFECYCLE_LABEL[lc]}</option>
                ))}
              </select>
            </label>
            <div className="derived">
              Durasi otomatis: <strong>{duration} menit</strong>
            </div>
          </div>

          {teacherId != null && startMin != null && (
            <div className="selection-summary">
              Dipilih: <strong>{teacherById.get(teacherId)?.code}</strong> @ {minToHHMM(startMin)}–{minToHHMM(startMin + duration)}
            </div>
          )}

          {errors.length > 0 && (
            <div className="error-list">
              {errors.map((e, i) => <div key={i} className="error">{e}</div>)}
            </div>
          )}
          </div>

          <div className="wizard-right">
            <h3>Slot tersedia (guide)</h3>
            <p className="muted small">
              Pilih teacher &amp; jam dari slot yang bebas bentrok untuk {PROGRAM_LABEL[programCode]} {level} ({duration} mnt).
            </p>
            <div className="guide">
              {teachers
                .filter((t) => t.worksDayGroups.includes(dayGroup))
                .map((t) => {
                  const slots = slotsByTeacher.get(t.id) ?? [];
                  return (
                    <div className="guide-row" key={t.id}>
                      <div className="guide-teacher">
                        {t.code} <span className="muted small">{t.name}</span>
                      </div>
                      <div className="guide-slots">
                        {slots.map((s) => {
                          const active = teacherId === t.id && startMin === s.startMin;
                          const cn = active ? 'chip active' : s.available ? 'chip' : 'chip taken';
                          return (
                            <button
                              key={s.startMin}
                              className={cn}
                              disabled={!s.available}
                              title={s.available ? undefined : 'Sudah terisi / bentrok'}
                              onClick={() => { setTeacherId(t.id); setStartMin(s.startMin); }}
                            >
                              {minToHHMM(s.startMin)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <footer className="modal-foot">
          <button className="ghost" onClick={onClose}>Batal</button>
          <button onClick={() => void onSave()} disabled={saving}>
            {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Simpan Kelas'}
          </button>
        </footer>
      </div>
    </div>
  );
}

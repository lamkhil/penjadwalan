import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { computeFreeSlots } from '@shared/slot-guide';
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
import { ConflictError, createClass, type ClassInput } from '@lib/repo';
import { queryKeys } from '@lib/queryKeys';

export function OpenClassWizard({
  teachers,
  programs,
  classrooms,
  classes,
  defaultDayGroup,
  onClose,
}: {
  teachers: Teacher[];
  programs: Program[];
  classrooms: Classroom[];
  classes: ClassRecord[]; // classes for the currently-viewed day-group
  defaultDayGroup: DayGroup;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [classType, setClassType] = useState<ClassType>('NEW');
  const [oldClassCode, setOldClassCode] = useState('');
  const [classCode, setClassCode] = useState('');
  const [programCode, setProgramCode] = useState<ProgramCode>('LS');
  const [level, setLevel] = useState(1);
  const [dayGroup, setDayGroup] = useState<DayGroup>(defaultDayGroup);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [startMin, setStartMin] = useState<number | null>(null);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [lifecycle, setLifecycle] = useState<Lifecycle>('CONFIRMED');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const program = programs.find((p) => p.code === programCode);
  const maxLevel = program?.maxLevel ?? 10;
  const duration = deriveDuration(programCode, level, dayGroup);

  // The guide is computed entirely client-side from the loaded masters + classes.
  const freeSlots = useMemo(() => {
    // The wizard can target any day-group; only classes for that day-group matter.
    const sameDay = classes.filter((c) => c.dayGroup === dayGroup);
    return computeFreeSlots(
      { programCode, level, dayGroup, gridStepMin: 10 },
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
  }, [classes, teachers, programCode, level, dayGroup]);

  // Group free start-times per teacher for display.
  const slotsByTeacher = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const s of freeSlots) {
      const arr = m.get(s.teacherId) ?? [];
      arr.push(s.startMin);
      m.set(s.teacherId, arr);
    }
    return m;
  }, [freeSlots]);

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
      status: 'NEW',
      lifecycle,
    };

    setSaving(true);
    setErrors([]);
    try {
      await createClass(input);
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
      <div className="modal wizard" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Buka Kelas Baru</h2>
          <button className="ghost" onClick={onClose}>✕</button>
        </header>

        <div className="modal-body">
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

          <h3>Slot tersedia (guide)</h3>
          <p className="muted small">
            Pilih teacher &amp; jam dari slot yang bebas bentrok untuk {PROGRAM_LABEL[programCode]} {level} ({duration} mnt).
          </p>
          <div className="guide">
            {teachers
              .filter((t) => t.worksDayGroups.includes(dayGroup))
              .map((t) => {
                const starts = slotsByTeacher.get(t.id) ?? [];
                return (
                  <div className="guide-row" key={t.id}>
                    <div className="guide-teacher">
                      {t.code} <span className="muted small">{t.name}</span>
                    </div>
                    <div className="guide-slots">
                      {starts.length === 0 && <span className="muted small">tidak ada slot</span>}
                      {starts.map((s) => {
                        const active = teacherId === t.id && startMin === s;
                        return (
                          <button
                            key={s}
                            className={active ? 'chip active' : 'chip'}
                            onClick={() => { setTeacherId(t.id); setStartMin(s); }}
                          >
                            {minToHHMM(s)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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

        <footer className="modal-foot">
          <button className="ghost" onClick={onClose}>Batal</button>
          <button onClick={() => void onSave()} disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan Kelas'}
          </button>
        </footer>
      </div>
    </div>
  );
}

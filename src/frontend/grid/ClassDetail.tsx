import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DAY_GROUP_LABEL,
  LIFECYCLES,
  LIFECYCLE_LABEL,
  type ClassRecord,
  type ClassStatus,
  type Classroom,
  type Lifecycle,
  type Teacher,
} from '@shared/types';
import { PROGRAM_LABEL, minToHHMM, programTag, reasonText } from '@lib/format';
import { ConflictError, deleteClass, updateClass, type ClassInput } from '@lib/repo';
import { queryKeys } from '@lib/queryKeys';

const STATUSES: ClassStatus[] = ['NEW', 'TRIAL', 'ACTIVE', 'OFF'];

export function ClassDetail({
  cls,
  teacher,
  classroom,
  onClose,
}: {
  cls: ClassRecord;
  teacher?: Teacher;
  classroom?: Classroom;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ClassStatus>(cls.status);
  const [lifecycle, setLifecycle] = useState<Lifecycle>(cls.lifecycle ?? 'CONFIRMED');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setErrors([]);
    const { id: _id, durationMin: _d, ...rest } = cls;
    const input: ClassInput = { ...rest, status, lifecycle };
    try {
      await updateClass(cls.id, input);
      await qc.invalidateQueries({ queryKey: queryKeys.classes });
      onClose();
    } catch (e) {
      if (e instanceof ConflictError) setErrors(e.reasons.map(reasonText));
      else setErrors(['Gagal menyimpan.']);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Hapus kelas ${cls.classCode}?`)) return;
    setBusy(true);
    try {
      await deleteClass(cls.id);
      await qc.invalidateQueries({ queryKey: queryKeys.classes });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal detail" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{programTag(cls.programCode, cls.level)} · {cls.classCode}</h2>
          <button className="ghost" onClick={onClose}>✕</button>
        </header>
        <div className="modal-body">
          <dl className="kv">
            <dt>Program</dt><dd>{PROGRAM_LABEL[cls.programCode]} {cls.level}</dd>
            <dt>Jenis</dt><dd>{cls.classType === 'NEW' ? 'New Class' : `Retention (${cls.oldClassCode ?? '-'})`}</dd>
            <dt>Hari</dt><dd>{DAY_GROUP_LABEL[cls.dayGroup]}</dd>
            <dt>Jam</dt><dd>{minToHHMM(cls.startMin)}–{minToHHMM(cls.startMin + cls.durationMin)} ({cls.durationMin} mnt)</dd>
            <dt>Teacher</dt><dd>{teacher ? `${teacher.code} — ${teacher.name}` : '-'}</dd>
            <dt>Ruang</dt><dd>{classroom ? `${classroom.code} — ${classroom.name}` : '-'}</dd>
            <dt>Mulai</dt><dd>{cls.startDate ?? '-'}</dd>
            <dt>Lifecycle</dt><dd>{LIFECYCLE_LABEL[cls.lifecycle ?? 'CONFIRMED']}</dd>
          </dl>

          <label>
            Status Kelas (lifecycle)
            <select value={lifecycle} onChange={(e) => setLifecycle(e.target.value as Lifecycle)}>
              {LIFECYCLES.map((lc) => <option key={lc} value={lc}>{LIFECYCLE_LABEL[lc]}</option>)}
            </select>
          </label>
          <label>
            Status Operasional
            <select value={status} onChange={(e) => setStatus(e.target.value as ClassStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          {errors.length > 0 && (
            <div className="error-list">
              {errors.map((e, i) => <div key={i} className="error">{e}</div>)}
            </div>
          )}
        </div>
        <footer className="modal-foot">
          <button className="danger ghost" onClick={() => void remove()} disabled={busy}>Hapus</button>
          <div className="spacer" />
          <button className="ghost" onClick={onClose}>Tutup</button>
          <button onClick={() => void save()} disabled={busy}>Simpan</button>
        </footer>
      </div>
    </div>
  );
}

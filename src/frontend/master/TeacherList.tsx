import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DAY_GROUPS,
  DAY_GROUP_LABEL,
  type DayGroup,
  type Teacher,
} from '@shared/types';
import {
  createTeacher,
  deleteTeacher,
  listTeachers,
  updateTeacher,
} from '@lib/repo';
import { queryKeys } from '@lib/queryKeys';

type Draft = Omit<Teacher, 'id'>;

const EMPTY: Draft = { code: '', name: '', isAssistant: false, active: true, worksDayGroups: [] };

export function TeacherList() {
  const qc = useQueryClient();
  const { data: teachers = [], isLoading } = useQuery({ queryKey: queryKeys.teachers, queryFn: listTeachers });
  const [editing, setEditing] = useState<Teacher | 'new' | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.teachers });

  const createM = useMutation({ mutationFn: createTeacher, onSuccess: invalidate });
  const updateM = useMutation({
    mutationFn: (v: { id: string; patch: Draft }) => updateTeacher(v.id, v.patch),
    onSuccess: invalidate,
  });
  const deleteM = useMutation({ mutationFn: deleteTeacher, onSuccess: invalidate });

  return (
    <div className="master-page">
      <div className="master-head">
        <h1>Master Teacher</h1>
        <button onClick={() => setEditing('new')}>+ Tambah Teacher</button>
      </div>

      {isLoading ? (
        <div className="centered">Memuat…</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Kode</th><th>Nama</th><th>TA?</th><th>Hari Mengajar</th><th>Aktif</th><th></th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id}>
                <td className="mono">{t.code}</td>
                <td>{t.name}</td>
                <td>{t.isAssistant ? 'Ya' : ''}</td>
                <td className="small">
                  {t.worksDayGroups.length === 0 ? <span className="muted">—</span> :
                    t.worksDayGroups.map((d) => DAY_GROUP_LABEL[d]).join(', ')}
                </td>
                <td>{t.active ? '✓' : '✗'}</td>
                <td className="row-actions">
                  <button className="ghost small" onClick={() => setEditing(t)}>Edit</button>
                  <button className="ghost small danger" onClick={() => { if (confirm(`Hapus ${t.name}?`)) deleteM.mutate(t.id); }}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <TeacherForm
          initial={editing === 'new' ? EMPTY : editing}
          onCancel={() => setEditing(null)}
          onSave={(draft) => {
            if (editing === 'new') createM.mutate(draft);
            else updateM.mutate({ id: editing.id, patch: draft });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TeacherForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Draft;
  onSave: (d: Draft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);

  function toggleDay(dg: DayGroup) {
    setDraft((d) => ({
      ...d,
      worksDayGroups: d.worksDayGroups.includes(dg)
        ? d.worksDayGroups.filter((x) => x !== dg)
        : [...d.worksDayGroups, dg],
    }));
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head"><h2>Teacher</h2><button className="ghost" onClick={onCancel}>✕</button></header>
        <div className="modal-body">
          <label>Kode<input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} maxLength={3} /></label>
          <label>Nama<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label className="checkbox"><input type="checkbox" checked={draft.isAssistant} onChange={(e) => setDraft({ ...draft, isAssistant: e.target.checked })} /> Teaching Assistant (TA)</label>
          <label className="checkbox"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Aktif</label>
          <div className="field-label">Hari mengajar (yang tidak dicentang = OFF)</div>
          <div className="day-checks">
            {DAY_GROUPS.map((dg) => (
              <label key={dg} className="checkbox">
                <input type="checkbox" checked={draft.worksDayGroups.includes(dg)} onChange={() => toggleDay(dg)} />
                {DAY_GROUP_LABEL[dg]}
              </label>
            ))}
          </div>
        </div>
        <footer className="modal-foot">
          <button className="ghost" onClick={onCancel}>Batal</button>
          <button onClick={() => onSave(draft)} disabled={!draft.code || !draft.name}>Simpan</button>
        </footer>
      </div>
    </div>
  );
}

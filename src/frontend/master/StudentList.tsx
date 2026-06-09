import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Student } from '@shared/types';
import { createStudent, deleteStudent, listStudents, updateStudent } from '@lib/repo';
import { queryKeys } from '@lib/queryKeys';

type Draft = Omit<Student, 'id'>;
const EMPTY: Draft = { studentCode: '', name: '', scheduleLabel: '' };

export function StudentList() {
  const qc = useQueryClient();
  const { data: students = [], isLoading } = useQuery({ queryKey: queryKeys.students, queryFn: listStudents });
  const [editing, setEditing] = useState<Student | 'new' | null>(null);
  const [q, setQ] = useState('');
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.students });

  const createM = useMutation({ mutationFn: createStudent, onSuccess: invalidate });
  const updateM = useMutation({ mutationFn: (v: { id: string; patch: Draft }) => updateStudent(v.id, v.patch), onSuccess: invalidate });
  const deleteM = useMutation({ mutationFn: deleteStudent, onSuccess: invalidate });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((s) =>
      s.name.toLowerCase().includes(needle) || s.studentCode.toLowerCase().includes(needle),
    );
  }, [students, q]);

  return (
    <div className="master-page">
      <div className="master-head">
        <h1>Master Siswa</h1>
        <div className="head-tools">
          <input className="search" placeholder="Cari nama / ID…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={() => setEditing('new')}>+ Tambah Siswa</button>
        </div>
      </div>
      {isLoading ? <div className="centered">Memuat…</div> : (
        <table className="data-table">
          <thead><tr><th>ID</th><th>Nama</th><th>Schedule</th><th></th></tr></thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="mono">{s.studentCode}</td><td>{s.name}</td><td className="small">{s.scheduleLabel ?? '-'}</td>
                <td className="row-actions">
                  <button className="ghost small" onClick={() => setEditing(s)}>Edit</button>
                  <button className="ghost small danger" onClick={() => { if (confirm(`Hapus ${s.name}?`)) deleteM.mutate(s.id); }}>Hapus</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} className="muted centered">Tidak ada siswa.</td></tr>}
          </tbody>
        </table>
      )}
      {editing && (
        <StudentForm
          initial={editing === 'new' ? EMPTY : editing}
          onCancel={() => setEditing(null)}
          onSave={(d) => { if (editing === 'new') createM.mutate(d); else updateM.mutate({ id: editing.id, patch: d }); setEditing(null); }}
        />
      )}
    </div>
  );
}

function StudentForm({ initial, onSave, onCancel }: { initial: Draft; onSave: (d: Draft) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Draft>(initial);
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head"><h2>Siswa</h2><button className="ghost" onClick={onCancel}>✕</button></header>
        <div className="modal-body">
          <label>ID Siswa<input value={draft.studentCode} onChange={(e) => setDraft({ ...draft, studentCode: e.target.value })} placeholder="mis. R260032" /></label>
          <label>Nama<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label>Schedule (opsional)<input value={draft.scheduleLabel ?? ''} onChange={(e) => setDraft({ ...draft, scheduleLabel: e.target.value })} placeholder="mis. SK 3 TTH" /></label>
        </div>
        <footer className="modal-foot">
          <button className="ghost" onClick={onCancel}>Batal</button>
          <button onClick={() => onSave(draft)} disabled={!draft.name}>Simpan</button>
        </footer>
      </div>
    </div>
  );
}

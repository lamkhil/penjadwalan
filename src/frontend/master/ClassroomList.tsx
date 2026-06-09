import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Classroom } from '@shared/types';
import { createClassroom, deleteClassroom, listClassrooms, updateClassroom } from '@lib/repo';
import { queryKeys } from '@lib/queryKeys';

type Draft = Omit<Classroom, 'id'>;
const EMPTY: Draft = { code: '', name: '', floor: '' };

export function ClassroomList() {
  const qc = useQueryClient();
  const { data: rooms = [], isLoading } = useQuery({ queryKey: queryKeys.classrooms, queryFn: listClassrooms });
  const [editing, setEditing] = useState<Classroom | 'new' | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.classrooms });

  const createM = useMutation({ mutationFn: createClassroom, onSuccess: invalidate });
  const updateM = useMutation({ mutationFn: (v: { id: string; patch: Draft }) => updateClassroom(v.id, v.patch), onSuccess: invalidate });
  const deleteM = useMutation({ mutationFn: deleteClassroom, onSuccess: invalidate });

  return (
    <div className="master-page">
      <div className="master-head">
        <h1>Master Ruang Kelas</h1>
        <button onClick={() => setEditing('new')}>+ Tambah Ruang</button>
      </div>
      {isLoading ? <div className="centered">Memuat…</div> : (
        <table className="data-table">
          <thead><tr><th>Kode</th><th>Nama</th><th>Lantai</th><th></th></tr></thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.code}</td><td>{r.name}</td><td>{r.floor ?? '-'}</td>
                <td className="row-actions">
                  <button className="ghost small" onClick={() => setEditing(r)}>Edit</button>
                  <button className="ghost small danger" onClick={() => { if (confirm(`Hapus ${r.name}?`)) deleteM.mutate(r.id); }}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && (
        <RoomForm
          initial={editing === 'new' ? EMPTY : editing}
          onCancel={() => setEditing(null)}
          onSave={(d) => { if (editing === 'new') createM.mutate(d); else updateM.mutate({ id: editing.id, patch: d }); setEditing(null); }}
        />
      )}
    </div>
  );
}

function RoomForm({ initial, onSave, onCancel }: { initial: Draft; onSave: (d: Draft) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Draft>(initial);
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head"><h2>Ruang Kelas</h2><button className="ghost" onClick={onCancel}>✕</button></header>
        <div className="modal-body">
          <label>Kode<input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} /></label>
          <label>Nama<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label>Lantai<input value={draft.floor ?? ''} onChange={(e) => setDraft({ ...draft, floor: e.target.value })} placeholder="mis. Lt 2" /></label>
        </div>
        <footer className="modal-foot">
          <button className="ghost" onClick={onCancel}>Batal</button>
          <button onClick={() => onSave(draft)} disabled={!draft.code || !draft.name}>Simpan</button>
        </footer>
      </div>
    </div>
  );
}

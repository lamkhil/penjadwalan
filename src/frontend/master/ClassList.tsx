import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DAY_GROUPS,
  DAY_GROUP_LABEL,
  LIFECYCLES,
  LIFECYCLE_LABEL,
  type ClassRecord,
  type DayGroup,
  type Lifecycle,
} from '@shared/types';
import {
  deleteClass,
  finishClass,
  listClasses,
  listClassrooms,
  listPrograms,
  listTeachers,
} from '@lib/repo';
import { queryKeys } from '@lib/queryKeys';
import { PROGRAM_LABEL, minToHHMM } from '@lib/format';
import { OpenClassWizard } from '../grid/OpenClassWizard';
import { Select } from '../ui/Select';

type DayFilter = DayGroup | 'ALL';
type LcFilter = Lifecycle | 'ALL';

export function ClassList() {
  const qc = useQueryClient();
  const { data: classes = [], isLoading } = useQuery({ queryKey: queryKeys.classes, queryFn: listClasses });
  const { data: teachers = [] } = useQuery({ queryKey: queryKeys.teachers, queryFn: listTeachers });
  const { data: classrooms = [] } = useQuery({ queryKey: queryKeys.classrooms, queryFn: listClassrooms });
  const { data: programs = [] } = useQuery({ queryKey: queryKeys.programs, queryFn: listPrograms });

  const [day, setDay] = useState<DayFilter>('ALL');
  const [lc, setLc] = useState<LcFilter>('ALL');
  const [q, setQ] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRecord | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.classes });
  const finishM = useMutation({ mutationFn: finishClass, onSuccess: invalidate });
  const deleteM = useMutation({ mutationFn: deleteClass, onSuccess: invalidate });

  const teacherByCode = new Map(teachers.map((t) => [t.id, t]));
  const roomById = new Map(classrooms.map((r) => [r.id, r]));

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return classes
      .filter((c) => (day === 'ALL' ? true : c.dayGroup === day))
      .filter((c) => (lc === 'ALL' ? true : (c.lifecycle ?? 'CONFIRMED') === lc))
      .filter((c) => (needle ? c.classCode.toLowerCase().includes(needle) : true))
      .sort((a, b) =>
        a.dayGroup === b.dayGroup
          ? a.startMin - b.startMin
          : DAY_GROUPS.indexOf(a.dayGroup) - DAY_GROUPS.indexOf(b.dayGroup),
      );
  }, [classes, day, lc, q]);

  return (
    <div className="master-page">
      <div className="master-head">
        <h1>Master Kelas</h1>
        <div className="head-tools">
          <Select
            className="filter"
            ariaLabel="Filter hari"
            value={day}
            onChange={(v) => setDay(v as DayFilter)}
            options={[
              { value: 'ALL', label: 'Semua hari' },
              ...DAY_GROUPS.map((dg) => ({ value: dg, label: DAY_GROUP_LABEL[dg] })),
            ]}
          />
          <Select
            className="filter"
            ariaLabel="Filter status"
            value={lc}
            onChange={(v) => setLc(v as LcFilter)}
            options={[
              { value: 'ALL', label: 'Semua status' },
              ...LIFECYCLES.map((x) => ({ value: x, label: LIFECYCLE_LABEL[x] })),
            ]}
          />
          <input className="search" placeholder="Cari Class ID…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={() => setWizardOpen(true)}>+ Buka Kelas</button>
        </div>
      </div>

      <div className="muted small" style={{ marginBottom: 8 }}>{rows.length} kelas</div>

      {isLoading ? (
        <div className="centered">Memuat…</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Class ID</th><th>Program</th><th>Hari</th><th>Jam</th>
              <th>Teacher</th><th>Ruang</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const t = c.teacherId ? teacherByCode.get(c.teacherId) : undefined;
              const r = c.classroomId ? roomById.get(c.classroomId) : undefined;
              const life = c.lifecycle ?? 'CONFIRMED';
              return (
                <tr key={c.id}>
                  <td className="mono">{c.classCode}</td>
                  <td>{PROGRAM_LABEL[c.programCode]} {c.level}</td>
                  <td className="small">{DAY_GROUP_LABEL[c.dayGroup]}</td>
                  <td className="mono small">{minToHHMM(c.startMin)}–{minToHHMM(c.startMin + c.durationMin)}</td>
                  <td>{t ? t.code : '-'}</td>
                  <td>{r ? r.code : '-'}</td>
                  <td><span className={`lc-pill lc-${life.toLowerCase()}`}>{LIFECYCLE_LABEL[life]}</span></td>
                  <td className="row-actions">
                    <button className="ghost small" onClick={() => setEditing(c)}>Edit</button>
                    {life === 'CONFIRMED' && (
                      <button className="ghost small" onClick={() => finishM.mutate(c.id)}>Selesaikan</button>
                    )}
                    <button className="ghost small danger" onClick={() => { if (confirm(`Hapus kelas ${c.classCode}?`)) deleteM.mutate(c.id); }}>Hapus</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={8} className="muted centered">Tidak ada kelas.</td></tr>}
          </tbody>
        </table>
      )}

      {(wizardOpen || editing) && (
        <OpenClassWizard
          teachers={teachers}
          programs={programs}
          classrooms={classrooms}
          classes={classes}
          defaultDayGroup={day === 'ALL' ? 'MON_WED' : day}
          editing={editing ?? undefined}
          onClose={() => { setWizardOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

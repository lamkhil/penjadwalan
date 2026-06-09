import { useState } from 'react';
import type { ClassRecord, DayGroup } from '@shared/types';
import { DRAFT_COLOR, PROGRAM_COLOR, PROGRAM_LABEL } from '@lib/format';
import { DayGroupTabs } from './DayGroupTabs';
import { ScheduleGrid } from './ScheduleGrid';
import { OpenClassWizard } from './OpenClassWizard';
import { ClassDetail } from './ClassDetail';
import { useClassesByDay, useMasters } from './useGridData';

export function GridPage() {
  const [dayGroup, setDayGroup] = useState<DayGroup>('MON_WED');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRecord | null>(null);
  const [selected, setSelected] = useState<ClassRecord | null>(null);
  const [showForming, setShowForming] = useState(true);
  const [showDraft, setShowDraft] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  const { teachers, classrooms, programs } = useMasters();
  const { classes, loading } = useClassesByDay(dayGroup);

  // Confirmed selalu tampil; Forming/Draft/Selesai mengikuti toggle.
  const visibleClasses = classes.filter((c) => {
    const lc = c.lifecycle ?? 'CONFIRMED';
    if (lc === 'FORMING') return showForming;
    if (lc === 'DRAFT') return showDraft;
    if (lc === 'COMPLETED') return showCompleted;
    return true;
  });

  const teacherList = teachers.data ?? [];
  const classroomList = classrooms.data ?? [];
  const programList = programs.data ?? [];

  const teacherById = new Map(teacherList.map((t) => [t.id, t]));
  const roomById = new Map(classroomList.map((r) => [r.id, r]));

  const mastersLoading = teachers.isLoading || classrooms.isLoading || programs.isLoading;

  return (
    <div className="grid-page">
      <div className="grid-toolbar">
        <DayGroupTabs value={dayGroup} onChange={setDayGroup} />
        <div className="toolbar-right">
          <div className="legend">
            {programList.map((p) => (
              <span key={p.code} className="legend-item">
                <span className="swatch" style={{ background: PROGRAM_COLOR[p.code] }} />
                {PROGRAM_LABEL[p.code]}
              </span>
            ))}
            <span className="legend-item">
              <span className="swatch" style={{ background: DRAFT_COLOR }} />
              Draft
            </span>
          </div>
          <div className="lc-toggles">
            <label className="toggle">
              <input type="checkbox" checked={showForming} onChange={(e) => setShowForming(e.target.checked)} />
              Forming
            </label>
            <label className="toggle">
              <input type="checkbox" checked={showDraft} onChange={(e) => setShowDraft(e.target.checked)} />
              Draft
            </label>
            <label className="toggle">
              <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
              Selesai
            </label>
          </div>
          <button onClick={() => setWizardOpen(true)} disabled={mastersLoading}>+ Buka Kelas</button>
        </div>
      </div>

      {mastersLoading ? (
        <div className="centered">Memuat master data…</div>
      ) : (
        <ScheduleGrid
          dayGroup={dayGroup}
          teachers={teacherList}
          classrooms={classroomList}
          classes={visibleClasses}
          onBlockClick={setSelected}
        />
      )}
      {loading && <div className="muted small loading-hint">Menyinkronkan jadwal…</div>}

      {(wizardOpen || editingClass) && (
        <OpenClassWizard
          teachers={teacherList}
          programs={programList}
          classrooms={classroomList}
          classes={classes}
          defaultDayGroup={dayGroup}
          editing={editingClass ?? undefined}
          onClose={() => { setWizardOpen(false); setEditingClass(null); }}
        />
      )}

      {selected && (
        <ClassDetail
          cls={selected}
          teacher={selected.teacherId ? teacherById.get(selected.teacherId) : undefined}
          classroom={selected.classroomId ? roomById.get(selected.classroomId) : undefined}
          onEdit={() => { setEditingClass(selected); setSelected(null); }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

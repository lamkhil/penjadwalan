import { useState } from 'react';
import type { ClassRecord, DayGroup } from '@shared/types';
import { PROGRAM_COLOR, PROGRAM_LABEL } from '@lib/format';
import { DayGroupTabs } from './DayGroupTabs';
import { ScheduleGrid } from './ScheduleGrid';
import { OpenClassWizard } from './OpenClassWizard';
import { ClassDetail } from './ClassDetail';
import { useClassesByDay, useMasters } from './useGridData';

export function GridPage() {
  const [dayGroup, setDayGroup] = useState<DayGroup>('MON_WED');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selected, setSelected] = useState<ClassRecord | null>(null);

  const { teachers, classrooms, programs } = useMasters();
  const { classes, loading } = useClassesByDay(dayGroup);

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
          classes={classes}
          onBlockClick={setSelected}
        />
      )}
      {loading && <div className="muted small loading-hint">Menyinkronkan jadwal…</div>}

      {wizardOpen && (
        <OpenClassWizard
          teachers={teacherList}
          programs={programList}
          classrooms={classroomList}
          classes={classes}
          defaultDayGroup={dayGroup}
          onClose={() => setWizardOpen(false)}
        />
      )}

      {selected && (
        <ClassDetail
          cls={selected}
          teacher={selected.teacherId ? teacherById.get(selected.teacherId) : undefined}
          classroom={selected.classroomId ? roomById.get(selected.classroomId) : undefined}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

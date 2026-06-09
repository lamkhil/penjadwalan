import { CLOSE_MIN, OPEN_MIN, type ClassRecord, type Classroom, type DayGroup, type Teacher } from '@shared/types';
import { minToHHMM } from '@lib/format';
import { ClassBlock, PX_PER_MIN } from './ClassBlock';

const TOTAL_HEIGHT = (CLOSE_MIN - OPEN_MIN) * PX_PER_MIN;

// 30-minute horizontal gridlines + labels (09:00 .. 18:00)
const AXIS_TICKS: number[] = [];
for (let m = OPEN_MIN; m <= CLOSE_MIN; m += 30) AXIS_TICKS.push(m);

export function ScheduleGrid({
  dayGroup,
  teachers,
  classrooms,
  classes,
  onBlockClick,
}: {
  dayGroup: DayGroup;
  teachers: Teacher[];
  classrooms: Classroom[];
  classes: ClassRecord[];
  onBlockClick: (cls: ClassRecord) => void;
}) {
  const roomById = new Map(classrooms.map((c) => [c.id, c]));
  const classesByTeacher = new Map<string, ClassRecord[]>();
  for (const c of classes) {
    if (!c.teacherId) continue;
    const arr = classesByTeacher.get(c.teacherId) ?? [];
    arr.push(c);
    classesByTeacher.set(c.teacherId, arr);
  }

  return (
    <div className="grid-scroll">
      <div className="grid-table" style={{ ['--row-h' as string]: `${TOTAL_HEIGHT}px` }}>
        {/* Time axis */}
        <div className="grid-col time-col">
          <div className="grid-head">Jam</div>
          <div className="grid-body" style={{ height: TOTAL_HEIGHT }}>
            {AXIS_TICKS.map((m) => (
              <div
                key={m}
                className="axis-tick"
                style={{ top: (m - OPEN_MIN) * PX_PER_MIN }}
              >
                <span>{minToHHMM(m)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* One column per teacher */}
        {teachers.map((t) => {
          const off = !t.worksDayGroups.includes(dayGroup);
          const tClasses = classesByTeacher.get(t.id) ?? [];
          return (
            <div className={off ? 'grid-col teacher-col off' : 'grid-col teacher-col'} key={t.id}>
              <div className="grid-head" title={t.name}>
                {t.code}
                {t.isAssistant && <sup>TA</sup>}
              </div>
              <div className="grid-body" style={{ height: TOTAL_HEIGHT }}>
                {AXIS_TICKS.map((m) => (
                  <div key={m} className="row-line" style={{ top: (m - OPEN_MIN) * PX_PER_MIN }} />
                ))}
                {off ? (
                  <div className="off-overlay">OFF</div>
                ) : (
                  tClasses.map((c) => (
                    <ClassBlock
                      key={c.id}
                      cls={c}
                      classroom={c.classroomId ? roomById.get(c.classroomId) : undefined}
                      onClick={() => onBlockClick(c)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

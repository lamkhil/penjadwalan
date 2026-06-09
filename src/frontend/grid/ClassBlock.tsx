import { OPEN_MIN, type ClassRecord, type Classroom } from '@shared/types';
import { PROGRAM_COLOR, minToHHMM, programTag } from '@lib/format';

const PX_PER_MIN = 1.1; // vertical scale of the grid

export function ClassBlock({
  cls,
  classroom,
  onClick,
}: {
  cls: ClassRecord;
  classroom?: Classroom;
  onClick: () => void;
}) {
  const top = (cls.startMin - OPEN_MIN) * PX_PER_MIN;
  const height = cls.durationMin * PX_PER_MIN;
  const color = PROGRAM_COLOR[cls.programCode];

  return (
    <button
      className="class-block"
      style={{ top, height, background: color }}
      onClick={onClick}
      title={`${programTag(cls.programCode, cls.level)} • ${minToHHMM(cls.startMin)}–${minToHHMM(cls.startMin + cls.durationMin)}`}
    >
      <div className="cb-tag">{programTag(cls.programCode, cls.level)}</div>
      <div className="cb-meta">
        {cls.studentCount != null && <span>{cls.studentCount}</span>}
        {cls.picCode && <span>({cls.picCode})</span>}
        {classroom && <span className="cb-room">{classroom.code}</span>}
      </div>
      {cls.status !== 'ACTIVE' && <div className="cb-status">{cls.status}</div>}
    </button>
  );
}

export { PX_PER_MIN };

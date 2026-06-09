import { OPEN_MIN, type ClassRecord, type Classroom } from '@shared/types';
import { blockColor, minToHHMM, programTag } from '@lib/format';

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
  const lifecycle = cls.lifecycle ?? 'CONFIRMED';
  const color = blockColor(cls.programCode, lifecycle);
  const cls2 = `class-block lc-${lifecycle.toLowerCase()}`;

  return (
    <button
      className={cls2}
      style={{ top, height, background: color }}
      onClick={onClick}
      title={`${programTag(cls.programCode, cls.level)} • ${minToHHMM(cls.startMin)}–${minToHHMM(cls.startMin + cls.durationMin)} • ${lifecycle}`}
    >
      <div className="cb-tag">
        {programTag(cls.programCode, cls.level)}
        {lifecycle === 'FORMING' && <span className="cb-badge">F</span>}
        {lifecycle === 'DRAFT' && <span className="cb-badge">D</span>}
        {lifecycle === 'COMPLETED' && <span className="cb-badge">✓</span>}
      </div>
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

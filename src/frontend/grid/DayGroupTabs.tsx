import { DAY_GROUPS, DAY_GROUP_LABEL, type DayGroup } from '@shared/types';

export function DayGroupTabs({
  value,
  onChange,
}: {
  value: DayGroup;
  onChange: (dg: DayGroup) => void;
}) {
  return (
    <div className="daygroup-tabs">
      {DAY_GROUPS.map((dg) => (
        <button
          key={dg}
          className={dg === value ? 'tab active' : 'tab'}
          onClick={() => onChange(dg)}
        >
          {DAY_GROUP_LABEL[dg]}
        </button>
      ))}
    </div>
  );
}

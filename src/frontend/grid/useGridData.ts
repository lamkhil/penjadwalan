import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listClassrooms, listPrograms, listTeachers, subscribeClasses } from '@lib/repo';
import { queryKeys } from '@lib/queryKeys';
import type { ClassRecord, DayGroup } from '@shared/types';

export function useMasters() {
  const teachers = useQuery({ queryKey: queryKeys.teachers, queryFn: listTeachers });
  const classrooms = useQuery({ queryKey: queryKeys.classrooms, queryFn: listClassrooms });
  const programs = useQuery({ queryKey: queryKeys.programs, queryFn: listPrograms });
  return { teachers, classrooms, programs };
}

/** Realtime list of classes for one day-group. */
export function useClassesByDay(dayGroup: DayGroup) {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeClasses(dayGroup, (c) => {
      setClasses(c);
      setLoading(false);
    });
    return unsub;
  }, [dayGroup]);

  return { classes, loading };
}

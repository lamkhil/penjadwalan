import { describe, expect, it } from 'vitest';
import { defaultPackageId, packageById, packageForRecord, packageIdsFor } from './session-packages';

describe('session packages', () => {
  it('LS defaults to the 50-session regular package', () => {
    expect(defaultPackageId('LS', 'MON_WED')).toBe('LS');
    expect(packageById('LS')?.sessions).toBe(50);
  });

  it('SK/ST weekday vs weekend default by day-group', () => {
    expect(defaultPackageId('SK', 'MON_WED')).toBe('SKST_WEEKDAY');
    expect(defaultPackageId('ST', 'FRI')).toBe('SKST_WEEKDAY');
    expect(defaultPackageId('SK', 'SAT')).toBe('SKST_WEEKEND');
    expect(defaultPackageId('ST', 'SUN')).toBe('SKST_WEEKEND');
    expect(packageById('SKST_WEEKDAY')?.sessions).toBe(26);
    expect(packageById('SKST_WEEKEND')?.sessions).toBe(18);
  });

  it('only offers packages in the program family', () => {
    expect(packageIdsFor('LS')).toEqual(['LS', 'LS_MINI']);
    expect(packageIdsFor('SK')).toEqual(['SKST_WEEKDAY', 'SKST_WEEKEND']);
  });

  it('matches a stored record to its package by session count within the family', () => {
    expect(packageForRecord('LS', 'MON_WED', 26)).toBe('LS_MINI');
    expect(packageForRecord('LS', 'MON_WED', 50)).toBe('LS');
    expect(packageForRecord('SK', 'SAT', 18)).toBe('SKST_WEEKEND');
  });

  it('falls back to the default when the stored count matches nothing', () => {
    expect(packageForRecord('LS', 'MON_WED', 99)).toBe('LS');
    expect(packageForRecord('SK', 'MON_WED', undefined)).toBe('SKST_WEEKDAY');
  });
});

import { describe, expect, it } from 'vitest';
import { deriveDuration, isWeekend } from './duration';

describe('isWeekend', () => {
  it('treats SAT and SUN as weekend', () => {
    expect(isWeekend('SAT')).toBe(true);
    expect(isWeekend('SUN')).toBe(true);
  });
  it('treats weekday day-groups as not weekend', () => {
    expect(isWeekend('MON_WED')).toBe(false);
    expect(isWeekend('TUE_THU')).toBe(false);
    expect(isWeekend('FRI')).toBe(false);
  });
});

describe('deriveDuration', () => {
  it('Little Sparks weekday = 60', () => {
    expect(deriveDuration('LS', 1, 'MON_WED')).toBe(60);
    expect(deriveDuration('LS', 5, 'FRI')).toBe(60);
  });
  it('Sparks Kid / Teen weekday = 80', () => {
    expect(deriveDuration('SK', 3, 'TUE_THU')).toBe(80);
    expect(deriveDuration('ST', 7, 'MON_WED')).toBe(80);
  });
  it('any weekend class = 120', () => {
    expect(deriveDuration('SK', 1, 'SAT')).toBe(120);
    expect(deriveDuration('ST', 2, 'SUN')).toBe(120);
    expect(deriveDuration('LS', 2, 'SAT')).toBe(120);
  });
  it('LS level 1 weekend is the 60-minute exception', () => {
    expect(deriveDuration('LS', 1, 'SAT')).toBe(60);
    expect(deriveDuration('LS', 1, 'SUN')).toBe(60);
  });
});

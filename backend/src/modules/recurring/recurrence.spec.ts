import { Frequency } from '@prisma/client';
import { RuleSchedule, nextOccurrences, occurrencesBetween, occursOn } from './recurrence';

const weekly = (
  days: number[],
  startsOn = '2026-11-02',
  endsOn: string | null = null,
): RuleSchedule => ({
  frequency: Frequency.WEEKLY,
  daysOfWeek: days,
  dayOfMonth: null,
  startsOn,
  endsOn,
});

describe('recurrence', () => {
  // 2026-11-02 — понедельник, 2026-11-03 — вторник.
  it('WEEKLY: каждый вторник', () => {
    const rule = weekly([2]);
    expect(occurrencesBetween(rule, '2026-11-02', '2026-11-30')).toEqual([
      '2026-11-03',
      '2026-11-10',
      '2026-11-17',
      '2026-11-24',
    ]);
  });

  it('WEEKLY: воскресенье — это 7', () => {
    expect(occursOn(weekly([7]), '2026-11-08')).toBe(true);
    expect(occursOn(weekly([7]), '2026-11-09')).toBe(false);
  });

  it('BIWEEKLY: через неделю от недели начала', () => {
    const rule: RuleSchedule = { ...weekly([2, 5]), frequency: Frequency.BIWEEKLY };
    expect(occurrencesBetween(rule, '2026-11-02', '2026-11-30')).toEqual([
      '2026-11-03',
      '2026-11-06',
      '2026-11-17',
      '2026-11-20',
    ]);
  });

  it('BIWEEKLY: начало посреди недели не сбивает чётность', () => {
    // Правило с четверга 05.11: вторник 03.11 той же недели раньше начала, 10.11 — нечётная неделя.
    const rule: RuleSchedule = { ...weekly([2], '2026-11-05'), frequency: Frequency.BIWEEKLY };
    expect(nextOccurrences(rule, '2026-11-05', 2)).toEqual(['2026-11-17', '2026-12-01']);
  });

  it('MONTHLY: 15-го числа, с переходом через год', () => {
    const rule: RuleSchedule = {
      frequency: Frequency.MONTHLY,
      daysOfWeek: [],
      dayOfMonth: 15,
      startsOn: '2026-11-01',
      endsOn: null,
    };
    expect(nextOccurrences(rule, '2026-11-16', 3)).toEqual([
      '2026-12-15',
      '2027-01-15',
      '2027-02-15',
    ]);
  });

  it('не выходит за даты начала и окончания', () => {
    const rule = weekly([1, 2, 3, 4, 5, 6, 7], '2026-11-10', '2026-11-12');
    expect(occurrencesBetween(rule, '2026-11-01', '2026-11-30')).toEqual([
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
    ]);
    expect(nextOccurrences(rule, '2026-11-13', 3)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { availablePeople, daysAway } from './absences';
import { HOUSE, type Absence, type Week } from './config';
import { addDays } from './dates';
import { scheduleWeek } from './scheduler';

const MONDAY = '2026-11-02';

describe('daysAway', () => {
  it('counts only the days inside the week', () => {
    const absences: Absence[] = [{ person: 'L', from: '2026-10-30', to: '2026-11-03' }];
    expect(daysAway(absences, 'L', MONDAY)).toBe(2);
  });

  it('counts overlapping absences once', () => {
    const absences: Absence[] = [
      { person: 'L', from: '2026-11-02', to: '2026-11-04' },
      { person: 'L', from: '2026-11-03', to: '2026-11-05' },
    ];
    expect(daysAway(absences, 'L', MONDAY)).toBe(4);
  });
});

describe('availablePeople', () => {
  it('keeps people away for a long weekend', () => {
    const absences: Absence[] = [{ person: 'I', from: '2026-11-06', to: '2026-11-08' }];
    expect(availablePeople(HOUSE, absences, MONDAY)).toContain('I');
  });

  it('removes people away for most of the week', () => {
    const absences: Absence[] = [{ person: 'I', from: '2026-11-05', to: '2026-11-12' }];
    expect(availablePeople(HOUSE, absences, MONDAY)).not.toContain('I');
  });
});

describe('G away for three weeks', () => {
  const absences: Absence[] = [{ person: 'G', from: '2026-11-16', to: '2026-12-06' }];

  const history: Week[] = [];
  for (let i = 0; i < 12; i++) {
    const monday = addDays(MONDAY, 7 * i);
    history.push(scheduleWeek(HOUSE, history, monday, availablePeople(HOUSE, absences, monday)));
  }
  const bathroom2 = history.map((w) => w.assignments.bathroom2);

  it('has S cover bathroom 2 while he is away, with a note', () => {
    expect(bathroom2.slice(0, 5)).toEqual(['G', 'S', 'S', 'S', 'S']);
    expect(history[3].notes).toEqual([
      'S does Cleaning Bathroom 2 for week 3 in a row (no one else available).',
    ]);
    expect(history[4].notes).toHaveLength(1);
  });

  it('has G catch up when back, never 3 weeks in a row', () => {
    expect(bathroom2.slice(5)).toEqual([
      'G', 'G', 'S', 'G', 'G', 'S', 'G',
    ]);
    const count = (p: string) => bathroom2.filter((x) => x === p).length;
    expect(count('G')).toBe(count('S'));
  });
});

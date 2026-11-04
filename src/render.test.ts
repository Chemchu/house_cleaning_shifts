import { describe, expect, it } from 'vitest';
import { HOUSE, type Week } from './config';
import { renderSchedule, renderWeek, weekRange } from './render';

describe('weekRange', () => {
  it('formats a week inside one month', () => {
    expect(weekRange('2026-11-02')).toBe('02-08 November');
  });

  it('formats a week crossing months', () => {
    expect(weekRange('2026-11-30')).toBe('30 November-06 December');
  });
});

describe('renderWeek', () => {
  it('adds notes as warnings after the tasks', () => {
    const week: Week = {
      start: '2026-11-23',
      assignments: { floor: 'L', bathroom1: 'I', bathroom2: 'S' },
      notes: ['First note.', 'Second note.'],
    };
    expect(renderWeek(HOUSE, week)).toBe(
      [
        '## 23-29 November',
        '',
        '- L -> Vacuum and disinfect common areas floor',
        '- I -> Cleaning Bathroom 1 (shared between C, I and L)',
        '- S -> Cleaning Bathroom 2 (shared between G and S)',
        '',
        '> ⚠️ First note.',
        '>',
        '> ⚠️ Second note.',
      ].join('\n'),
    );
  });
});

describe('renderSchedule', () => {
  it('matches the format of november-2026.md', () => {
    const weeks: Week[] = [
      { start: '2026-11-02', assignments: { floor: 'G', bathroom1: 'L', bathroom2: 'G' }, notes: [] },
      { start: '2026-11-09', assignments: { floor: 'S', bathroom1: 'C', bathroom2: 'S' }, notes: [] },
    ];
    expect(renderSchedule(HOUSE, weeks)).toBe(`# House Cleaning - November

## 02-08 November

- G -> Vacuum and disinfect common areas floor
- L -> Cleaning Bathroom 1 (shared between C, I and L)
- G -> Cleaning Bathroom 2 (shared between G and S)

## 09-15 November

- S -> Vacuum and disinfect common areas floor
- C -> Cleaning Bathroom 1 (shared between C, I and L)
- S -> Cleaning Bathroom 2 (shared between G and S)
`);
  });

  it('names every month the weeks start in', () => {
    const weeks: Week[] = [
      { start: '2026-11-30', assignments: {}, notes: [] },
      { start: '2026-12-07', assignments: {}, notes: [] },
    ];
    expect(renderSchedule(HOUSE, weeks).split('\n')[0]).toBe('# House Cleaning - November - December');
  });
});

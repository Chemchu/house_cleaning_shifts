import { describe, expect, it } from 'vitest';
import { HOUSE, type Week } from './config';
import { renderWeek, weekRange } from './render';

describe('weekRange', () => {
  it('formats a week inside one month', () => {
    expect(weekRange('2026-11-02')).toBe('02-08 November');
  });

  it('formats a week crossing months', () => {
    expect(weekRange('2026-11-30')).toBe('30 November-06 December');
  });
});

describe('renderWeek', () => {
  it('lists each task with who shares it', () => {
    const week: Week = {
      start: '2026-11-02',
      house: HOUSE,
      available: HOUSE.people,
      assignments: { floor: 'G', bathroom1: 'L', bathroom2: 'G' },
      notes: [],
    };
    expect(renderWeek(week)).toBe(
      [
        '# House Cleaning - 02-08 November',
        '',
        '- G -> Vacuum and disinfect common areas floor',
        '- L -> Cleaning Bathroom 1 (shared between C, I and L)',
        '- G -> Cleaning Bathroom 2 (shared between G and S)',
      ].join('\n'),
    );
  });

  it('adds who is away and notes as warnings after the tasks', () => {
    const week: Week = {
      start: '2026-11-23',
      house: HOUSE,
      available: ['C', 'I', 'S'],
      assignments: { floor: 'C', bathroom1: 'I', bathroom2: 'S' },
      notes: ['First note.', 'Second note.'],
    };
    expect(renderWeek(week)).toBe(
      [
        '# House Cleaning - 23-29 November',
        '',
        '- C -> Vacuum and disinfect common areas floor',
        '- I -> Cleaning Bathroom 1 (shared between C, I and L)',
        '- S -> Cleaning Bathroom 2 (shared between G and S)',
        '',
        '_Away: G and L_',
        '',
        '> ⚠️ First note.',
        '>',
        '> ⚠️ Second note.',
      ].join('\n'),
    );
  });
});

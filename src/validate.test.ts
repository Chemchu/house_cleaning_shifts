import { describe, expect, it } from 'vitest';
import { HOUSE, type Week } from './config';
import { addDays } from './dates';
import { scheduleOptions, scheduleWeek } from './scheduler';
import { validateChange } from './validate';
import { toWeekFile, weekFilePath } from './weekFile';

const START = '2026-11-02';
const history: Week[] = [];
for (let i = 0; i < 3; i++) history.push(scheduleWeek(HOUSE, history, addDays(START, 7 * i)));
const next = addDays(START, 21);

const add = (week: Week, path = weekFilePath(week.start)) => ({ status: 'A', path, text: toWeekFile(week) });

describe('validateChange', () => {
  it('accepts the fairest week', () => {
    expect(validateChange(history, [add(scheduleWeek(HOUSE, history, next))])).toEqual([]);
  });

  it('accepts any regenerated option', () => {
    const options = scheduleOptions(HOUSE, history, next);
    expect(validateChange(history, [add(options.at(-1)!)])).toEqual([]);
  });

  it('accepts a later week, leaving a gap', () => {
    expect(validateChange(history, [add(scheduleWeek(HOUSE, history, addDays(next, 7)))])).toEqual([]);
  });

  it('accepts deleting the latest week only', () => {
    expect(validateChange(history, [{ status: 'D', path: 'schedules/2026-W47.md' }])).toEqual([]);
    expect(validateChange(history, [{ status: 'D', path: 'schedules/2026-W46.md' }])).toEqual([
      'schedules/2026-W46.md: only the latest week (schedules/2026-W47.md) can be deleted.',
    ]);
  });

  it('rejects more than one change', () => {
    const week = scheduleWeek(HOUSE, history, next);
    expect(validateChange(history, [add(week), add(week)])).toEqual([
      'Expected exactly one changed file, got 2.',
    ]);
  });

  it('rejects files outside schedules/', () => {
    expect(validateChange(history, [{ status: 'M', path: '.github/workflows/auto-merge.yml' }])).toEqual([
      '.github/workflows/auto-merge.yml: only files in schedules/ can change.',
    ]);
  });

  it('rejects edits to existing weeks', () => {
    expect(validateChange(history, [{ status: 'M', path: 'schedules/2026-W47.md' }])).toEqual([
      'schedules/2026-W47.md: week files can only be added or deleted.',
    ]);
  });

  it('rejects a file whose name does not match its week', () => {
    const week = scheduleWeek(HOUSE, history, next);
    expect(validateChange(history, [add(week, 'schedules/2026-W50.md')])).toEqual([
      'schedules/2026-W50.md: should be named schedules/2026-W48.md.',
    ]);
  });

  it('rejects a week that is not after the latest one', () => {
    const week = scheduleWeek(HOUSE, history.slice(0, 2), history[2].start);
    expect(validateChange(history, [add(week)])).toContain('2026-W47 is not after the latest week 2026-W47.');
  });

  it('rejects broken metadata', () => {
    const change = { status: 'A', path: 'schedules/2026-W48.md', text: '# hello' };
    expect(validateChange(history, [change])).toEqual([
      'schedules/2026-W48.md: Missing house-cleaning metadata comment',
    ]);
  });

  it('rejects unknown people', () => {
    const week = { ...scheduleWeek(HOUSE, history, next), available: [...HOUSE.people, 'X'] };
    expect(validateChange(history, [add(week)])).toEqual(['Unknown people: X.']);
  });

  it('accepts a week with a changed house', () => {
    const house = { ...HOUSE, people: [...HOUSE.people, 'Ana'], tasks: HOUSE.tasks.map((t) => (t.id === 'floor' ? { ...t, eligible: [...t.eligible, 'Ana'] } : t)) };
    expect(validateChange(history, [add(scheduleWeek(house, history, next))])).toEqual([]);
  });

  it('rejects an invalid house', () => {
    const week = scheduleWeek(HOUSE, history, next);
    const house = { ...HOUSE, people: [...HOUSE.people, 'C'] };
    expect(validateChange(history, [add({ ...week, house })])).toEqual(['C: C is already in the house.']);
  });

  it('rejects hand-edited assignments that break the rules', () => {
    const week = scheduleWeek(HOUSE, history, next);
    const tampered = [
      { ...week, assignments: { ...week.assignments, bathroom1: 'G' } },
      { ...week, assignments: { ...week.assignments, floor: 'L' }, available: ['C', 'G', 'I', 'S'] },
      { ...week, assignments: { floor: week.assignments.floor } },
    ];
    for (const w of tampered) {
      expect(validateChange(history, [add(w)])).toEqual([
        '2026-W48: assignments are not a valid schedule for that week.',
      ]);
    }
  });
});

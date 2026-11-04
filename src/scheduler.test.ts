import { describe, expect, it } from 'vitest';
import { HOUSE, type HouseConfig, type PersonId, type Week } from './config';
import { addDays } from './dates';
import { scheduleWeek } from './scheduler';

const START = '2026-11-02';

function run(
  weeks: number,
  config: HouseConfig = HOUSE,
  availableIn: (i: number) => PersonId[] = () => config.people,
): Week[] {
  const history: Week[] = [];
  for (let i = 0; i < weeks; i++) {
    history.push(scheduleWeek(config, history, addDays(START, 7 * i), availableIn(i)));
  }
  return history;
}

function counts(history: Week[], taskId: string): Record<PersonId, number> {
  const result: Record<PersonId, number> = {};
  for (const w of history) {
    const p = w.assignments[taskId];
    if (p) result[p] = (result[p] ?? 0) + 1;
  }
  return result;
}

function pastWeek(offset: number, assignments: Week['assignments']): Week {
  return { start: addDays(START, 7 * offset), available: HOUSE.people, assignments, notes: [] };
}

const without = (p: PersonId) => HOUSE.people.filter((x) => x !== p);

describe('scheduleWeek', () => {
  it('only assigns eligible people', () => {
    for (const week of run(12)) {
      for (const task of HOUSE.tasks) {
        expect(task.eligible).toContain(week.assignments[task.id]);
      }
    }
  });

  it('keeps each task balanced within its group, never more than 2 apart', () => {
    const history = run(100);
    for (let i = 1; i <= history.length; i++) {
      for (const task of HOUSE.tasks) {
        const c = counts(history.slice(0, i), task.id);
        const values = task.eligible.map((p) => c[p] ?? 0);
        expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(2);
      }
    }
  });

  it('rotates bathrooms strictly when everyone is home', () => {
    const history = run(30);
    expect(counts(history, 'bathroom1')).toEqual({ C: 10, I: 10, L: 10 });
    expect(counts(history, 'bathroom2')).toEqual({ G: 15, S: 15 });
  });

  it('never assigns someone who is not available', () => {
    const assigned = run(6, HOUSE, () => without('L')).flatMap((w) => Object.values(w.assignments));
    expect(assigned).not.toContain('L');
  });

  it('records who was available', () => {
    expect(scheduleWeek(HOUSE, [], START, without('L')).available).toEqual(without('L'));
  });

  it('prevents a third week in a row even if that person has done the task less', () => {
    const history = [0, 1, 2, 3, 4, 5].map((i) => pastWeek(i, { bathroom2: i < 4 ? 'G' : 'S' }));
    const week = scheduleWeek(HOUSE, history, addDays(START, 42));
    expect(week.assignments.bathroom2).toBe('G');
    expect(week.notes).toEqual([]);
  });

  it('allows a third week in a row when nobody else is available, with a note', () => {
    const history = [0, 1].map((i) => pastWeek(i, { bathroom2: 'S' }));
    const week = scheduleWeek(HOUSE, history, addDays(START, 14), without('G'));
    expect(week.assignments.bathroom2).toBe('S');
    expect(week.notes).toEqual([
      'S does Cleaning Bathroom 2 for week 3 in a row (no one else available).',
    ]);
  });

  it('avoids giving two tasks in one week when someone else is free', () => {
    for (const week of run(30)) {
      const people = Object.values(week.assignments);
      expect(new Set(people).size).toBe(people.length);
    }
  });

  it('gives a lighter week to someone who had two tasks last week', () => {
    const config: HouseConfig = {
      people: ['X', 'Y', 'Z'],
      tasks: [
        { id: 'a', label: 'A', eligible: ['X', 'Y'] },
        { id: 'b', label: 'B', eligible: ['X', 'Z'] },
        { id: 'c', label: 'C', eligible: ['X', 'Z'] },
      ],
    };
    // X and Y have done A once each, and X longer ago, but X did two tasks last week.
    const history = [pastWeek(-3, { a: 'X' }), pastWeek(-2, { a: 'Y' }), pastWeek(-1, { b: 'X', c: 'X' })];
    expect(scheduleWeek(config, history, START).assignments.a).toBe('Y');
  });

  it('ignores history on or after the week being scheduled', () => {
    const first = scheduleWeek(HOUSE, [], START);
    expect(scheduleWeek(HOUSE, [pastWeek(0, { floor: 'S' })], START)).toEqual(first);
  });
});

describe('G away for three weeks', () => {
  const history = run(12, HOUSE, (i) => (i >= 2 && i <= 4 ? without('G') : HOUSE.people));
  const bathroom2 = history.map((w) => w.assignments.bathroom2);

  it('has S cover bathroom 2 while he is away, with a note', () => {
    expect(bathroom2.slice(0, 5)).toEqual(['G', 'S', 'S', 'S', 'S']);
    expect(history[3].notes).toEqual([
      'S does Cleaning Bathroom 2 for week 3 in a row (no one else available).',
    ]);
    expect(history[4].notes).toHaveLength(1);
  });

  it('has G catch up when back, never 3 weeks in a row', () => {
    expect(bathroom2.slice(5)).toEqual(['G', 'G', 'S', 'G', 'G', 'S', 'G']);
    const count = (p: PersonId) => bathroom2.filter((x) => x === p).length;
    expect(count('G')).toBe(count('S'));
  });
});

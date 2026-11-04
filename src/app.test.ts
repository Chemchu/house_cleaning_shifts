import { describe, expect, it } from 'vitest';
import { defaultWeek, pullForWeek, weekChoices } from './app';
import { HOUSE, type Week } from './config';
import { localToday, mondayOf } from './dates';

const week = (start: string): Week => ({ start, available: HOUSE.people, assignments: {}, notes: [] });

describe('weekChoices', () => {
  it('starts after the latest merged week', () => {
    const choices = weekChoices([week('2026-11-16'), week('2026-11-23')], '2026-11-04', 3);
    expect(choices).toEqual(['2026-11-30', '2026-12-07', '2026-12-14']);
  });

  it('starts this week when there is no history', () => {
    expect(weekChoices([], '2026-11-04', 2)).toEqual(['2026-11-02', '2026-11-09']);
  });

  it('still offers missed weeks when history is behind today', () => {
    const choices = weekChoices([week('2026-10-19')], '2026-11-04', 2);
    expect(choices).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
  });
});

describe('defaultWeek', () => {
  it('picks the first choice from this week on', () => {
    expect(defaultWeek(['2026-10-26', '2026-11-02', '2026-11-09'], '2026-11-04')).toBe('2026-11-02');
    expect(defaultWeek(['2026-11-30', '2026-12-07'], '2026-11-04')).toBe('2026-11-30');
  });
});

describe('pullForWeek', () => {
  it('finds an open PR whose title names the week', () => {
    const pulls = [{ number: 7, title: 'Create 2026-W49.md', url: 'u', author: 'Chemchu' }];
    expect(pullForWeek(pulls, '2026-11-30')?.number).toBe(7);
    expect(pullForWeek(pulls, '2026-12-07')).toBeUndefined();
  });
});

describe('dates', () => {
  it('finds the Monday of any day', () => {
    expect(mondayOf('2026-11-08')).toBe('2026-11-02');
    expect(mondayOf('2026-11-02')).toBe('2026-11-02');
  });

  it('uses the local calendar date for today', () => {
    expect(localToday(new Date(2026, 10, 4, 23, 30))).toBe('2026-11-04');
  });
});

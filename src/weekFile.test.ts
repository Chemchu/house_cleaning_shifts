import { describe, expect, it } from 'vitest';
import { HOUSE, type Week } from './config';
import { parseWeekFile, toWeekFile, weekFilePath } from './weekFile';

const week: Week = {
  start: '2026-11-16',
  available: ['C', 'I', 'L', 'S'],
  assignments: { floor: 'I', bathroom1: 'C', bathroom2: 'S' },
  notes: [],
};

describe('week files', () => {
  it('are stored by Monday date', () => {
    expect(weekFilePath('2026-11-16')).toBe('schedules/2026-11-16.md');
  });

  it('start with a metadata comment followed by the readable schedule', () => {
    expect(toWeekFile(HOUSE, week)).toBe(`<!-- house-cleaning {"version":1,"start":"2026-11-16","available":["C","I","L","S"],"assignments":{"floor":"I","bathroom1":"C","bathroom2":"S"},"notes":[]} -->
# House Cleaning - 16-22 November

- I -> Vacuum and disinfect common areas floor
- C -> Cleaning Bathroom 1 (shared between C, I and L)
- S -> Cleaning Bathroom 2 (shared between G and S)

_Away: G_
`);
  });

  it('round-trip, even with text that could close the comment', () => {
    const tricky: Week = { ...week, notes: ['a --> b'] };
    expect(parseWeekFile(toWeekFile(HOUSE, tricky))).toEqual(tricky);
  });

  it('only read the metadata, not the readable text', () => {
    const edited = toWeekFile(HOUSE, week).replace('- I ->', '- G ->');
    expect(parseWeekFile(edited)).toEqual(week);
  });

  it('reject missing metadata', () => {
    expect(() => parseWeekFile('# House Cleaning')).toThrow('Missing house-cleaning metadata');
  });

  it('reject unknown versions', () => {
    const file = toWeekFile(HOUSE, week).replace('"version":1', '"version":2');
    expect(() => parseWeekFile(file)).toThrow('Unsupported metadata version: 2');
  });

  it('reject a start date that is not a Monday', () => {
    const file = toWeekFile(HOUSE, week).replace('2026-11-16', '2026-11-17');
    expect(() => parseWeekFile(file)).toThrow('Invalid week start: 2026-11-17');
  });

  it('reject malformed assignments', () => {
    const file = toWeekFile(HOUSE, week).replace('"floor":"I"', '"floor":1');
    expect(() => parseWeekFile(file)).toThrow('Invalid assignments');
  });
});

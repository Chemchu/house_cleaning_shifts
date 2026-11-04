import { describe, expect, it } from 'vitest';
import { HOUSE, type Week } from './config';
import { parseWeekFile, toWeekFile, weekFilePath } from './weekFile';

const week: Week = {
  start: '2026-11-16',
  house: HOUSE,
  available: ['C', 'I', 'L', 'S'],
  assignments: { floor: 'I', bathroom1: 'C', bathroom2: 'S' },
  notes: [],
};

describe('week files', () => {
  it('are named by ISO week', () => {
    expect(weekFilePath('2026-11-16')).toBe('schedules/2026-W47.md');
  });

  it('start with a metadata comment followed by the readable schedule', () => {
    const meta = JSON.stringify({ version: 2, start: week.start, house: HOUSE, available: week.available, assignments: week.assignments, notes: [] });
    expect(toWeekFile(week)).toBe(`<!-- house-cleaning ${meta} -->
# House Cleaning - 16-22 November

- I -> Vacuum and disinfect common areas floor
- C -> Cleaning Bathroom 1 (shared between C, I and L)
- S -> Cleaning Bathroom 2 (shared between G and S)

_Away: G_
`);
  });

  it('save the house setup used for that week', () => {
    const house = { ...HOUSE, people: [...HOUSE.people, 'Ana'] };
    expect(parseWeekFile(toWeekFile({ ...week, house })).house).toEqual(house);
  });

  it('read version 1 files with the original house setup', () => {
    const v1 = '<!-- house-cleaning {"version":1,"start":"2026-11-30","available":["C","G","I","L","S"],"assignments":{"floor":"C","bathroom1":"L","bathroom2":"G"},"notes":[]} -->';
    expect(parseWeekFile(v1).house).toEqual(HOUSE);
  });

  it('round-trip, even with text that could close the comment', () => {
    const tricky: Week = { ...week, notes: ['a --> b'] };
    expect(parseWeekFile(toWeekFile(tricky))).toEqual(tricky);
  });

  it('only read the metadata, not the readable text', () => {
    const edited = toWeekFile(week).replace('- I ->', '- G ->');
    expect(parseWeekFile(edited)).toEqual(week);
  });

  it('reject missing metadata', () => {
    expect(() => parseWeekFile('# House Cleaning')).toThrow('Missing house-cleaning metadata');
  });

  it('reject unknown versions', () => {
    const file = toWeekFile(week).replace('"version":2', '"version":3');
    expect(() => parseWeekFile(file)).toThrow('Unsupported metadata version: 3');
  });

  it('reject a start date that is not a Monday', () => {
    const file = toWeekFile(week).replace('2026-11-16', '2026-11-17');
    expect(() => parseWeekFile(file)).toThrow('Invalid week start: 2026-11-17');
  });

  it('reject malformed assignments', () => {
    const file = toWeekFile(week).replace('"floor":"I"', '"floor":1');
    expect(() => parseWeekFile(file)).toThrow('Invalid assignments');
  });

  it('reject a malformed house', () => {
    const file = toWeekFile(week).replace('"people":["C"', '"people":[1');
    expect(() => parseWeekFile(file)).toThrow('Invalid house');
  });
});

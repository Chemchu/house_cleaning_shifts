import { describe, expect, it } from 'vitest';
import { isoWeek } from './dates';

describe('isoWeek', () => {
  it('numbers weeks by ISO 8601', () => {
    expect(isoWeek('2026-11-02')).toBe('2026-W45');
    expect(isoWeek('2026-11-08')).toBe('2026-W45');
  });

  it('zero-pads single-digit weeks', () => {
    expect(isoWeek('2027-01-04')).toBe('2027-W01');
  });

  it('uses the year of the Thursday at year boundaries', () => {
    expect(isoWeek('2025-12-29')).toBe('2026-W01');
    expect(isoWeek('2026-12-28')).toBe('2026-W53');
    expect(isoWeek('2027-01-03')).toBe('2026-W53');
  });
});

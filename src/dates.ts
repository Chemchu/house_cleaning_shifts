import type { IsoDate } from './config';

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO 8601 week label of the week containing `date`, e.g. `2026-W45`. */
export function isoWeek(date: IsoDate): string {
  const d = new Date(`${date}T00:00:00Z`);
  // The ISO week belongs to the year of its Thursday.
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const year = d.getUTCFullYear();
  const dayOfYear = (d.getTime() - Date.UTC(year, 0, 1)) / 86_400_000;
  const week = Math.floor(dayOfYear / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

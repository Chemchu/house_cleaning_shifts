import type { IsoDate } from './config';

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isoWeek(date: IsoDate): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const year = d.getUTCFullYear();
  const dayOfYear = (d.getTime() - Date.UTC(year, 0, 1)) / 86_400_000;
  const week = Math.floor(dayOfYear / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function mondayOf(date: IsoDate): IsoDate {
  const day = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(date, -day);
}

export function localToday(now: Date = new Date()): IsoDate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

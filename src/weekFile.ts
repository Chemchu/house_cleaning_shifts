import { HOUSE, type HouseConfig, type IsoDate, type Week } from './config';
import { isoWeek } from './dates';
import { renderWeek } from './render';

const VERSION = 2;
const META = /^<!-- house-cleaning (\{.*\}) -->$/m;

export function weekFilePath(start: IsoDate): string {
  return `schedules/${isoWeek(start)}.md`;
}

export function toWeekFile(week: Week): string {
  const { start, house, available, assignments, notes } = week;
  const json = JSON.stringify({ version: VERSION, start, house, available, assignments, notes });
  return `<!-- house-cleaning ${json.replace(/>/g, '\\u003e')} -->\n${renderWeek(week)}\n`;
}

export function parseWeekFile(text: string): Week {
  const match = text.match(META);
  if (!match) throw new Error('Missing house-cleaning metadata comment');

  const meta = JSON.parse(match[1]);
  if (meta.version !== 1 && meta.version !== VERSION) {
    throw new Error(`Unsupported metadata version: ${meta.version}`);
  }

  const { start, available, assignments, notes } = meta;
  const house = meta.version === 1 ? HOUSE : meta.house;
  if (typeof start !== 'string' || !isMonday(start)) throw new Error(`Invalid week start: ${start}`);
  if (!isStringArray(available)) throw new Error('Invalid available list');
  if (!isStringRecord(assignments)) throw new Error('Invalid assignments');
  if (!isStringArray(notes)) throw new Error('Invalid notes');
  if (!isHouse(house)) throw new Error('Invalid house');

  return { start, house, available, assignments, notes };
}

function isMonday(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return d.toISOString().startsWith(date) && d.getUTCDay() === 1;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((x) => typeof x === 'string');
}

function isHouse(value: unknown): value is HouseConfig {
  const house = value as HouseConfig;
  return (
    typeof house === 'object' &&
    house !== null &&
    isStringArray(house.people) &&
    Array.isArray(house.tasks) &&
    house.tasks.every(
      (t) => typeof t.id === 'string' && typeof t.label === 'string' && isStringArray(t.eligible),
    )
  );
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((x) => typeof x === 'string')
  );
}

import type { Week } from './config';
import { isoWeek } from './dates';
import { houseErrors } from './house';
import { scheduleOptions } from './scheduler';
import { parseWeekFile, weekFilePath } from './weekFile';

export interface Change {
  status: string;
  path: string;
  text?: string;
}

export function validateChange(history: Week[], changes: Change[]): string[] {
  if (changes.length !== 1) return [`Expected exactly one changed file, got ${changes.length}.`];
  const [change] = changes;
  const latest = history.at(-1);

  if (!change.path.startsWith('schedules/')) return [`${change.path}: only files in schedules/ can change.`];

  if (change.status === 'D') {
    if (latest && change.path === weekFilePath(latest.start)) return [];
    return [`${change.path}: only the latest week (${latest ? weekFilePath(latest.start) : 'none'}) can be deleted.`];
  }
  if (change.status !== 'A') return [`${change.path}: week files can only be added or deleted.`];

  let week: Week;
  try {
    week = parseWeekFile(change.text ?? '');
  } catch (e) {
    return [`${change.path}: ${(e as Error).message}`];
  }

  const errors: string[] = [];
  if (change.path !== weekFilePath(week.start)) {
    errors.push(`${change.path}: should be named ${weekFilePath(week.start)}.`);
  }
  if (latest && week.start <= latest.start) {
    errors.push(`${isoWeek(week.start)} is not after the latest week ${isoWeek(latest.start)}.`);
  }
  const unknown = week.available.filter((p) => !week.house.people.includes(p));
  if (unknown.length > 0) errors.push(`Unknown people: ${unknown.join(', ')}.`);
  errors.push(...houseErrors(week.house));
  if (errors.length === 0) {
    const key = (w: Week) => JSON.stringify(Object.entries(w.assignments).sort());
    const options = scheduleOptions(week.house, history, week.start, week.available);
    if (!options.some((o) => key(o) === key(week))) {
      errors.push(`${isoWeek(week.start)}: assignments are not a valid schedule for that week.`);
    }
  }
  return errors;
}

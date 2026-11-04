import type { HouseConfig, IsoDate, Task, Week } from './config';
import { addDays } from './dates';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function renderWeek(week: Week): string {
  const config = week.house;
  const lines = [`# House Cleaning - ${weekRange(week.start)}`, ''];
  for (const task of config.tasks) {
    const person = week.assignments[task.id];
    if (person) lines.push(`- ${person} -> ${taskLabel(config, task)}`);
  }
  const away = config.people.filter((p) => !week.available.includes(p));
  if (away.length > 0) {
    lines.push('', `_Away: ${joinNames(away)}_`);
  }
  if (week.notes.length > 0) {
    lines.push('', week.notes.map((n) => `> ⚠️ ${n}`).join('\n>\n'));
  }
  return lines.join('\n');
}

export function weekRange(monday: IsoDate): string {
  const sunday = addDays(monday, 6);
  const day = (d: IsoDate) => d.slice(8, 10);
  if (monthName(monday) === monthName(sunday)) {
    return `${day(monday)}-${day(sunday)} ${monthName(sunday)}`;
  }
  return `${day(monday)} ${monthName(monday)}-${day(sunday)} ${monthName(sunday)}`;
}

function taskLabel(config: HouseConfig, task: Task): string {
  if (task.eligible.length === config.people.length) return task.label;
  return `${task.label} (shared between ${joinNames(task.eligible)})`;
}

function joinNames(names: string[]): string {
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join('');
}

function monthName(date: IsoDate): string {
  return MONTHS[Number(date.slice(5, 7)) - 1];
}

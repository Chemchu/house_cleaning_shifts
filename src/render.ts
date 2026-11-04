import type { HouseConfig, IsoDate, Task, Week } from './config';
import { addDays } from './dates';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function renderSchedule(config: HouseConfig, weeks: Week[]): string {
  const months = [...new Set(weeks.map((w) => monthName(w.start)))];
  const title = `# House Cleaning - ${months.join(' - ')}`;
  return [title, ...weeks.map((w) => renderWeek(config, w))].join('\n\n') + '\n';
}

export function renderWeek(config: HouseConfig, week: Week): string {
  const lines = [`## ${weekRange(week.start)}`, ''];
  for (const task of config.tasks) {
    const person = week.assignments[task.id];
    if (person) lines.push(`- ${person} -> ${taskLabel(config, task)}`);
  }
  if (week.notes.length > 0) {
    lines.push('', week.notes.map((n) => `> ⚠️ ${n}`).join('\n>\n'));
  }
  return lines.join('\n');
}

/** `02-08 November`, or `30 November-06 December` when the week crosses months. */
export function weekRange(monday: IsoDate): string {
  const sunday = addDays(monday, 6);
  const day = (d: IsoDate) => d.slice(8, 10);
  if (monthName(monday) === monthName(sunday)) {
    return `${day(monday)}-${day(sunday)} ${monthName(sunday)}`;
  }
  return `${day(monday)} ${monthName(monday)}-${day(sunday)} ${monthName(sunday)}`;
}

/** Adds `(shared between …)` for tasks that only part of the house does. */
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

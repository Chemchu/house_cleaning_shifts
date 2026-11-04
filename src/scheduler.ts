import type { HouseConfig, IsoDate, PersonId, Task, Week } from './config';
import { addDays } from './dates';

/** Nobody does the same task more weeks in a row than this, unless they are the only one available. */
const MAX_STREAK = 2;

export function scheduleWeek(
  config: HouseConfig,
  history: Week[],
  start: IsoDate,
  available: PersonId[] = config.people,
): Week {
  const past = history.filter((w) => w.start < start);
  const byStart = new Map(past.map((w) => [w.start, w]));
  const week: Week = { start, assignments: {}, notes: [] };

  const candidatesFor = (task: Task) => task.eligible.filter((p) => available.includes(p));
  // Most constrained tasks first, so the floor can avoid people who already got a bathroom.
  const tasks = [...config.tasks].sort((a, b) => candidatesFor(a).length - candidatesFor(b).length);

  for (const task of tasks) {
    const candidates = candidatesFor(task);
    if (candidates.length === 0) {
      week.notes.push(`No one available for ${task.label}.`);
      continue;
    }

    const streak = (p: PersonId) => {
      let n = 0;
      while (byStart.get(addDays(start, -7 * (n + 1)))?.assignments[task.id] === p) n++;
      return n;
    };
    const allowed = candidates.filter((p) => streak(p) < MAX_STREAK);
    const person = pickFairest(config, past, week, task, allowed.length > 0 ? allowed : candidates);

    if (allowed.length === 0) {
      week.notes.push(
        `${person} does ${task.label} for week ${streak(person) + 1} in a row (no one else available).`,
      );
    }
    week.assignments[task.id] = person;
  }
  return week;
}

/** How many times more than the least-loaded person someone may have done a task to avoid a double. */
const DOUBLE_SLACK = 1;

/**
 * Ranks candidates by, in order:
 * 1. not having done this task more than DOUBLE_SLACK times above the minimum
 * 2. fewest tasks already given this week (avoid doubles when possible)
 * 3. fewest times doing this task overall (absent people catch up when back)
 * 4. fewest tasks last week (lighter week after doing two tasks)
 * 5. longest since they last did this task
 * 6. order in the config, so results are deterministic
 */
function pickFairest(
  config: HouseConfig,
  past: Week[],
  week: Week,
  task: Task,
  pool: PersonId[],
): PersonId {
  const lastWeek = past.find((w) => w.start === addDays(week.start, -7));
  const load = (w: Week | undefined, p: PersonId) =>
    w ? Object.values(w.assignments).filter((x) => x === p).length : 0;

  const timesDone = (p: PersonId) => past.filter((w) => w.assignments[task.id] === p).length;
  const minDone = Math.min(...pool.map(timesDone));

  const key = (p: PersonId) => {
    const done = past.filter((w) => w.assignments[task.id] === p);
    const lastDone = done.reduce((max, w) => (w.start > max ? w.start : max), '');
    const overSlack = Math.max(0, done.length - minDone - DOUBLE_SLACK);
    return [
      overSlack,
      load(week, p),
      done.length,
      load(lastWeek, p),
      lastDone,
      config.people.indexOf(p),
    ] as const;
  };

  return [...pool].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] < kb[i]) return -1;
      if (ka[i] > kb[i]) return 1;
    }
    return 0;
  })[0];
}

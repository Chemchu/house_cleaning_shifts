import type { HouseConfig, IsoDate, PersonId, Task, Week } from './config';
import { addDays } from './dates';

const MAX_STREAK = 2;
const DOUBLE_SLACK = 1;

interface Ranked {
  person: PersonId;
  overSlack: number;
}

interface Choice {
  task: Task;
  ranked: Ranked[];
  relaxed: boolean;
  streak: (p: PersonId) => number;
}

export function scheduleWeek(
  config: HouseConfig,
  history: Week[],
  start: IsoDate,
  available: PersonId[] = config.people,
): Week {
  return scheduleOptions(config, history, start, available)[0];
}

export function scheduleOptions(
  config: HouseConfig,
  history: Week[],
  start: IsoDate,
  available: PersonId[] = config.people,
): Week[] {
  const past = history.filter((w) => w.start < start).sort((a, b) => a.start.localeCompare(b.start));
  const byStart = new Map(past.map((w) => [w.start, w]));
  const lastWeek = byStart.get(addDays(start, -7));

  const candidatesFor = (task: Task) => task.eligible.filter((p) => available.includes(p));
  const tasks = [...config.tasks].sort((a, b) => candidatesFor(a).length - candidatesFor(b).length);

  const missing = tasks.filter((t) => candidatesFor(t).length === 0);
  const choices: Choice[] = tasks
    .filter((t) => candidatesFor(t).length > 0)
    .map((task) => {
      const candidates = candidatesFor(task);
      const streak = (p: PersonId) => {
        let n = 0;
        while (byStart.get(addDays(start, -7 * (n + 1)))?.assignments[task.id] === p) n++;
        return n;
      };
      const allowed = candidates.filter((p) => streak(p) < MAX_STREAK);
      const pool = allowed.length > 0 ? allowed : candidates;
      return { task, ranked: rank(config, past, lastWeek, task, pool), relaxed: allowed.length === 0, streak };
    });

  const combos = choices.reduce<number[][]>(
    (acc, c) => acc.flatMap((combo) => c.ranked.map((_, i) => [...combo, i])),
    [[]],
  );

  const options = combos.map((combo) => {
    const picked = combo.map((i, t) => choices[t].ranked[i]);
    const people = picked.map((r) => r.person);
    const cost = [
      picked.reduce((sum, r) => sum + r.overSlack, 0),
      people.length - new Set(people).size,
      ...combo,
    ];

    const assignments: Week['assignments'] = {};
    for (const task of config.tasks) {
      const t = choices.findIndex((c) => c.task.id === task.id);
      if (t >= 0) assignments[task.id] = people[t];
    }
    const notes = [
      ...missing.map((t) => `No one available for ${t.label}.`),
      ...choices
        .map((c, t) => ({ c, p: people[t] }))
        .filter(({ c }) => c.relaxed)
        .map(({ c, p }) => `${p} does ${c.task.label} for week ${c.streak(p) + 1} in a row (no one else available).`),
    ];
    return { week: { start, house: config, available, assignments, notes }, cost };
  });

  return options.sort((a, b) => compare(a.cost, b.cost)).map((o) => o.week);
}

function rank(
  config: HouseConfig,
  past: Week[],
  lastWeek: Week | undefined,
  task: Task,
  pool: PersonId[],
): Ranked[] {
  const load = (p: PersonId) =>
    lastWeek ? Object.values(lastWeek.assignments).filter((x) => x === p).length : 0;
  const counts = taskCounts(past, task);
  const timesDone = (p: PersonId) => counts.get(p) ?? 0;
  const minDone = Math.min(...pool.map(timesDone));

  const key = (p: PersonId) => {
    const done = past.filter((w) => w.assignments[task.id] === p);
    const lastDone = done.reduce((max, w) => (w.start > max ? w.start : max), '');
    const overSlack = Math.max(0, timesDone(p) - minDone - DOUBLE_SLACK);
    return [overSlack, timesDone(p), load(p), lastDone, config.people.indexOf(p)];
  };

  return [...pool]
    .sort((a, b) => compare(key(a), key(b)))
    .map((person) => ({ person, overSlack: key(person)[0] as number }));
}

function taskCounts(past: Week[], task: Task): Map<PersonId, number> {
  const counts = new Map<PersonId, number>();
  const join = (eligible: PersonId[]) => {
    const known = eligible.filter((p) => counts.has(p)).map((p) => counts.get(p)!);
    const start = known.length > 0 ? Math.min(...known) : 0;
    for (const p of eligible) if (!counts.has(p)) counts.set(p, start);
  };

  for (const week of past) {
    join(week.house.tasks.find((t) => t.id === task.id)?.eligible ?? []);
    const person = week.assignments[task.id];
    if (person) counts.set(person, (counts.get(person) ?? 0) + 1);
  }
  join(task.eligible);
  return counts;
}

function compare(a: (number | string)[], b: (number | string)[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

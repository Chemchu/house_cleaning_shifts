import type { IsoDate, Week } from './config';
import { addDays, isoWeek, mondayOf } from './dates';
import type { PullRequest } from './github';

export function weekChoices(history: Week[], today: IsoDate, ahead = 8): IsoDate[] {
  const current = mondayOf(today);
  const latest = history.at(-1)?.start;
  const first = latest ? addDays(latest, 7) : current;
  const last = addDays(first > current ? first : current, 7 * (ahead - 1));
  const choices: IsoDate[] = [];
  for (let d = first; d <= last; d = addDays(d, 7)) choices.push(d);
  return choices;
}

export function defaultWeek(choices: IsoDate[], today: IsoDate): IsoDate {
  return choices.find((d) => d >= mondayOf(today)) ?? choices[0];
}

export function pullForWeek(pulls: PullRequest[], start: IsoDate): PullRequest | undefined {
  return pulls.find((p) => p.title.includes(isoWeek(start)));
}

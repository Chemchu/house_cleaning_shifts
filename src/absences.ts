import type { Absence, HouseConfig, IsoDate, PersonId } from './config';
import { addDays } from './dates';

/** Someone away this many days of a Monday–Sunday week or more gets no task that week. */
const MIN_DAYS_AWAY = 4;

export function availablePeople(
  config: HouseConfig,
  absences: Absence[],
  monday: IsoDate,
): PersonId[] {
  return config.people.filter((p) => daysAway(absences, p, monday) < MIN_DAYS_AWAY);
}

/** Days of the week starting `monday` that `person` is away. Overlapping absences count once. */
export function daysAway(absences: Absence[], person: PersonId, monday: IsoDate): number {
  let days = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i);
    if (absences.some((a) => a.person === person && a.from <= day && day <= a.to)) days++;
  }
  return days;
}

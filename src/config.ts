export type PersonId = string;
export type TaskId = string;
/** Calendar date as `YYYY-MM-DD`. */
export type IsoDate = string;

export interface Task {
  id: TaskId;
  label: string;
  /** People allowed to do this task. Fairness is balanced only within this group. */
  eligible: PersonId[];
}

export interface HouseConfig {
  people: PersonId[];
  tasks: Task[];
}

/** A person is away for every day from `from` to `to`, inclusive. */
export interface Absence {
  person: PersonId;
  from: IsoDate;
  to: IsoDate;
}

export interface Week {
  /** Monday of the week. */
  start: IsoDate;
  assignments: Record<TaskId, PersonId>;
  /** Warnings, e.g. a streak rule that had to be relaxed. */
  notes: string[];
}

export const HOUSE: HouseConfig = {
  people: ['C', 'G', 'I', 'L', 'S'],
  tasks: [
    {
      id: 'floor',
      label: 'Vacuum and disinfect common areas floor',
      eligible: ['C', 'G', 'I', 'L', 'S'],
    },
    { id: 'bathroom1', label: 'Cleaning Bathroom 1', eligible: ['C', 'I', 'L'] },
    { id: 'bathroom2', label: 'Cleaning Bathroom 2', eligible: ['G', 'S'] },
  ],
};

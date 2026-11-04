export type PersonId = string;
export type TaskId = string;
export type IsoDate = string;

export interface Task {
  id: TaskId;
  label: string;
  eligible: PersonId[];
}

export interface HouseConfig {
  people: PersonId[];
  tasks: Task[];
}

export interface Week {
  start: IsoDate;
  available: PersonId[];
  assignments: Record<TaskId, PersonId>;
  notes: string[];
}

export interface RepoRef {
  owner: string;
  name: string;
  branch: string;
}

export const REPO: RepoRef = { owner: 'Chemchu', name: 'house_cleaning_shifts', branch: 'main' };

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

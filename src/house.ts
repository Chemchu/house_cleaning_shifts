import type { HouseConfig, PersonId, TaskId } from './config';

const MAX_NAME = 20;

export function nameError(house: HouseConfig, name: string, current?: PersonId): string | undefined {
  if (name.trim() !== name || name.length === 0) return 'Names cannot be empty or start or end with spaces.';
  if (name.length > MAX_NAME) return `Names can be at most ${MAX_NAME} characters.`;
  if (name !== current && house.people.includes(name)) return `${name} is already in the house.`;
  return undefined;
}

export function houseErrors(house: HouseConfig): string[] {
  const errors: string[] = [];
  house.people.forEach((p, i) => {
    const error = nameError({ ...house, people: house.people.slice(0, i) }, p);
    if (error) errors.push(`${p}: ${error}`);
  });
  const ids = house.tasks.map((t) => t.id);
  if (new Set(ids).size !== ids.length) errors.push('Task ids must be unique.');
  for (const task of house.tasks) {
    const unknown = task.eligible.filter((p) => !house.people.includes(p));
    if (unknown.length > 0) errors.push(`${task.label}: unknown people ${unknown.join(', ')}.`);
  }
  return errors;
}

export function addPerson(house: HouseConfig, name: PersonId): HouseConfig {
  return {
    people: [...house.people, name],
    tasks: house.tasks.map((t) =>
      t.eligible.length === house.people.length ? { ...t, eligible: [...t.eligible, name] } : t,
    ),
  };
}

export function renamePerson(house: HouseConfig, from: PersonId, to: PersonId): HouseConfig {
  const swap = (p: PersonId) => (p === from ? to : p);
  return {
    people: house.people.map(swap),
    tasks: house.tasks.map((t) => ({ ...t, eligible: t.eligible.map(swap) })),
  };
}

export function removePerson(house: HouseConfig, name: PersonId): HouseConfig {
  return {
    people: house.people.filter((p) => p !== name),
    tasks: house.tasks.map((t) => ({ ...t, eligible: t.eligible.filter((p) => p !== name) })),
  };
}

export function setEligible(house: HouseConfig, taskId: TaskId, person: PersonId, on: boolean): HouseConfig {
  return {
    ...house,
    tasks: house.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const eligible = house.people.filter((p) => (p === person ? on : t.eligible.includes(p)));
      return { ...t, eligible };
    }),
  };
}

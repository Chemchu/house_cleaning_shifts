import { describe, expect, it } from 'vitest';
import { HOUSE } from './config';
import { addPerson, houseErrors, nameError, removePerson, renamePerson, setEligible } from './house';

const eligible = (house: typeof HOUSE, id: string) => house.tasks.find((t) => t.id === id)!.eligible;

describe('nameError', () => {
  it('rejects empty, padded, long and duplicate names', () => {
    expect(nameError(HOUSE, '')).toBeDefined();
    expect(nameError(HOUSE, ' Ana')).toBeDefined();
    expect(nameError(HOUSE, 'A'.repeat(21))).toBeDefined();
    expect(nameError(HOUSE, 'C')).toBe('C is already in the house.');
  });

  it('accepts a new name, or keeping the current one', () => {
    expect(nameError(HOUSE, 'Ana')).toBeUndefined();
    expect(nameError(HOUSE, 'C', 'C')).toBeUndefined();
  });
});

describe('houseErrors', () => {
  it('accepts the default house', () => {
    expect(houseErrors(HOUSE)).toEqual([]);
  });

  it('reports duplicate people and unknown eligible people', () => {
    const house = { people: ['C', 'C'], tasks: [{ id: 'floor', label: 'Floor', eligible: ['C', 'X'] }] };
    expect(houseErrors(house)).toEqual(['C: C is already in the house.', 'Floor: unknown people X.']);
  });

  it('reports duplicate task ids', () => {
    const house = { people: ['C'], tasks: [{ id: 'a', label: 'A', eligible: [] }, { id: 'a', label: 'B', eligible: [] }] };
    expect(houseErrors(house)).toEqual(['Task ids must be unique.']);
  });
});

describe('editing the house', () => {
  it('adds a person to the tasks everyone shares', () => {
    const house = addPerson(HOUSE, 'Ana');
    expect(house.people).toEqual(['C', 'G', 'I', 'L', 'S', 'Ana']);
    expect(eligible(house, 'floor')).toContain('Ana');
    expect(eligible(house, 'bathroom1')).not.toContain('Ana');
  });

  it('renames a person everywhere', () => {
    const house = renamePerson(HOUSE, 'C', 'Carlos');
    expect(house.people[0]).toBe('Carlos');
    expect(eligible(house, 'bathroom1')).toEqual(['Carlos', 'I', 'L']);
  });

  it('removes a person everywhere', () => {
    const house = removePerson(HOUSE, 'G');
    expect(house.people).not.toContain('G');
    expect(eligible(house, 'bathroom2')).toEqual(['S']);
  });

  it('assigns and unassigns people to a task, keeping house order', () => {
    const added = setEligible(HOUSE, 'bathroom2', 'I', true);
    expect(eligible(added, 'bathroom2')).toEqual(['G', 'I', 'S']);
    expect(eligible(setEligible(added, 'bathroom2', 'G', false), 'bathroom2')).toEqual(['I', 'S']);
  });
});

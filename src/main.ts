import { defaultWeek, pullForWeek, weekChoices } from './app';
import { HOUSE, REPO, type HouseConfig, type IsoDate, type PersonId, type Week } from './config';
import { isoWeek, localToday } from './dates';
import { addPerson, nameError, removePerson, renamePerson, setEligible } from './house';
import { deleteWeekUrl, listOpenPulls, loadHistory, newWeekUrl, type PullRequest } from './github';
import { weekRange, whatsappText } from './render';
import { scheduleOptions } from './scheduler';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;

const state = {
  history: [] as Week[],
  pulls: [] as PullRequest[],
  choices: [] as IsoDate[],
  week: '' as IsoDate,
  house: HOUSE as HouseConfig,
  houseOpen: false,
  available: new Set<PersonId>(HOUSE.people),
  options: [] as Week[],
  index: 0,
};

type Child = Node | string | null | false | undefined;

const compact = (children: Child[]) => children.filter((c): c is Node | string => c != null && c !== false);

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...compact(children));
  return node;
}

const weekTitle = (start: IsoDate) => `${isoWeek(start)} · ${weekRange(start)}`;

function copyButton(week: Week): HTMLElement {
  const button = el(
    'button',
    {
      onclick: async () => {
        try {
          await navigator.clipboard.writeText(whatsappText(week));
          button.textContent = 'Copied';
          setTimeout(() => (button.textContent = 'Copy'), 2000);
        } catch {
          alert('Could not copy to the clipboard.');
        }
      },
    },
    'Copy',
  );
  return button;
}

function weekCard(week: Week): HTMLElement {
  const away = week.house.people.filter((p) => !week.available.includes(p));
  return el(
    'div',
    { className: 'week' },
    el(
      'ul',
      {},
      ...week.house.tasks
        .filter((t) => week.assignments[t.id])
        .map((t) => el('li', {}, el('strong', {}, week.assignments[t.id]), ` ${t.label}`)),
    ),
    away.length > 0 && el('p', { className: 'muted' }, `Away: ${away.join(', ')}`),
    ...week.notes.map((n) => el('p', { className: 'note' }, `⚠️ ${n}`)),
  );
}

function pendingSection(): Child {
  if (state.pulls.length === 0) return null;
  return el(
    'section',
    { className: 'pending' },
    el('h2', {}, 'Pending PRs'),
    el('p', { className: 'muted' }, 'Schedules are generated from merged weeks only.'),
    el(
      'ul',
      {},
      ...state.pulls.map((p) =>
        el('li', {}, el('a', { href: p.url, target: '_blank', rel: 'noopener' }, `#${p.number} ${p.title}`), ` by ${p.author}`),
      ),
    ),
  );
}

function savedHouse(): HouseConfig {
  return state.history.at(-1)?.house ?? HOUSE;
}

function updateHouse(house: HouseConfig) {
  state.house = house;
  state.options = [];
  render();
}

function chip(label: string, checked: boolean, onToggle: (on: boolean) => void): HTMLElement {
  return el(
    'label',
    { className: 'person' },
    el('input', {
      type: 'checkbox',
      checked,
      onchange: (e: Event) => onToggle((e.target as HTMLInputElement).checked),
    }),
    label,
  );
}

function houseSection(): HTMLElement {
  const changed = JSON.stringify(state.house) !== JSON.stringify(savedHouse());

  const people = state.house.people.map((p) => {
    const input = el('input', {
      type: 'text',
      value: p,
      ariaLabel: `Name of ${p}`,
      onchange: () => {
        const to = input.value.trim();
        const error = nameError(state.house, to, p);
        if (error) {
          alert(error);
          render();
          return;
        }
        if (state.available.delete(p)) state.available.add(to);
        updateHouse(renamePerson(state.house, p, to));
      },
    });
    return el(
      'div',
      { className: 'row' },
      input,
      el(
        'button',
        {
          ariaLabel: `Remove ${p}`,
          onclick: () => {
            if (!confirm(`Remove ${p} from the house?`)) return;
            state.available.delete(p);
            updateHouse(removePerson(state.house, p));
          },
        },
        '✕',
      ),
    );
  });

  const add = () => {
    const name = prompt('Name or initials')?.trim();
    if (!name) return;
    const error = nameError(state.house, name);
    if (error) return alert(error);
    state.available.add(name);
    updateHouse(addPerson(state.house, name));
  };

  const tasks = state.house.tasks.map((t) =>
    el(
      'fieldset',
      {},
      el('legend', {}, t.label),
      ...state.house.people.map((p) =>
        chip(p, t.eligible.includes(p), (on) => updateHouse(setEligible(state.house, t.id, p, on))),
      ),
    ),
  );

  return el(
    'section',
    {},
    el(
      'details',
      { className: 'house', open: state.houseOpen, ontoggle: (e: Event) => (state.houseOpen = (e.target as HTMLDetailsElement).open) },
      el('summary', {}, el('h2', {}, 'People and tasks')),
      el('p', { className: 'muted' }, 'Changes are saved with the next week you accept. A renamed person counts as someone new.'),
      ...people,
      el('button', { onclick: add }, 'Add person'),
      ...tasks,
      changed &&
        el(
          'div',
          { className: 'actions' },
          el('p', { className: 'note' }, 'Not saved yet.'),
          el(
            'button',
            {
              onclick: () => {
                state.available = new Set(savedHouse().people);
                updateHouse(savedHouse());
              },
            },
            'Undo changes',
          ),
        ),
    ),
  );
}

function generateSection(): HTMLElement {
  const select = el(
    'select',
    {
      onchange: () => {
        state.week = select.value;
        state.options = [];
        render();
      },
    },
    ...state.choices.map((d) => el('option', { value: d }, weekTitle(d))),
  );
  select.value = state.week;

  const people = state.house.people.map((p) =>
    chip(p, state.available.has(p), (on) => {
      if (on) state.available.add(p);
      else state.available.delete(p);
      state.options = [];
      render();
    }),
  );

  const pending = pullForWeek(state.pulls, state.week);
  const option = state.options[state.index];

  return el(
    'section',
    {},
    el('h2', {}, 'New week'),
    select,
    el('fieldset', {}, el('legend', {}, 'Available'), ...people),
    pending && el('p', { className: 'note' }, `⚠️ PR #${pending.number} for this week is already open.`),
    el('button', { className: 'primary', onclick: generate }, 'Generate'),
    option &&
      el(
        'div',
        { className: 'preview' },
        el('h3', {}, `${weekTitle(option.start)} (option ${state.index + 1} of ${state.options.length})`),
        weekCard(option),
        el(
          'div',
          { className: 'actions' },
          el('button', { onclick: regenerate }, 'Regenerate'),
          copyButton(option),
          el(
            'a',
            { className: 'button primary', href: newWeekUrl(REPO, option), target: '_blank', rel: 'noopener' },
            'Accept',
          ),
        ),
        el(
          'p',
          { className: 'muted' },
          'On GitHub, choose "Create a new branch and start a pull request", then "Propose changes".',
        ),
      ),
  );
}

function historySection(): HTMLElement {
  const latest = state.history.at(-1);
  return el(
    'section',
    {},
    el('h2', {}, 'Published weeks'),
    state.history.length === 0 && el('p', { className: 'muted' }, 'None yet.'),
    ...[...state.history].reverse().map((w) =>
      el(
        'details',
        { open: w === latest },
        el('summary', {}, weekTitle(w.start)),
        weekCard(w),
        el(
          'div',
          { className: 'actions' },
          copyButton(w),
          w === latest &&
            el(
              'a',
              {
                className: 'button danger',
                href: deleteWeekUrl(REPO, w),
                target: '_blank',
                rel: 'noopener',
                onclick: (e: Event) => {
                  if (!confirm(`Open a PR that deletes ${isoWeek(w.start)}?`)) e.preventDefault();
                },
              },
              'Undo',
            ),
        ),
      ),
    ),
  );
}

function generate() {
  const available = state.house.people.filter((p) => state.available.has(p));
  state.options = scheduleOptions(state.house, state.history, state.week, available);
  state.index = 0;
  render();
}

function regenerate() {
  state.index = (state.index + 1) % state.options.length;
  render();
}

function render() {
  app.replaceChildren(
    ...compact([
      el('header', {}, el('h1', {}, 'House Cleaning'), el('button', { onclick: load }, 'Refresh')),
      !navigator.onLine && el('p', { className: 'note' }, 'Offline: showing the last loaded data.'),
      pendingSection(),
      houseSection(),
      generateSection(),
      historySection(),
    ]),
  );
}

async function load() {
  app.replaceChildren(el('p', { className: 'muted' }, 'Loading…'));
  try {
    [state.history, state.pulls] = await Promise.all([loadHistory(REPO), listOpenPulls(REPO)]);
    const today = localToday();
    state.choices = weekChoices(state.history, today);
    state.week = defaultWeek(state.choices, today);
    state.house = savedHouse();
    state.available = new Set(state.house.people);
    state.options = [];
    render();
  } catch (e) {
    app.replaceChildren(
      el('p', { className: 'note' }, (e as Error).message),
      el('button', { onclick: load }, 'Retry'),
    );
  }
}

window.addEventListener('online', render);
window.addEventListener('offline', render);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js');
}

load();

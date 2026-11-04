import { defaultWeek, pullForWeek, weekChoices } from './app';
import { HOUSE, REPO, type IsoDate, type PersonId, type Week } from './config';
import { isoWeek, localToday } from './dates';
import { deleteWeekUrl, listOpenPulls, loadHistory, newWeekUrl, type PullRequest } from './github';
import { weekRange } from './render';
import { scheduleOptions } from './scheduler';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;

const state = {
  history: [] as Week[],
  pulls: [] as PullRequest[],
  choices: [] as IsoDate[],
  week: '' as IsoDate,
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

function weekCard(week: Week): HTMLElement {
  const away = HOUSE.people.filter((p) => !week.available.includes(p));
  return el(
    'div',
    { className: 'week' },
    el(
      'ul',
      {},
      ...HOUSE.tasks
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

  const people = HOUSE.people.map((p) =>
    el(
      'label',
      { className: 'person' },
      el('input', {
        type: 'checkbox',
        checked: state.available.has(p),
        onchange: (e: Event) => {
          if ((e.target as HTMLInputElement).checked) state.available.add(p);
          else state.available.delete(p);
          state.options = [];
          render();
        },
      }),
      p,
    ),
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
          el(
            'a',
            { className: 'button primary', href: newWeekUrl(REPO, HOUSE, option), target: '_blank', rel: 'noopener' },
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
  );
}

function generate() {
  const available = HOUSE.people.filter((p) => state.available.has(p));
  state.options = scheduleOptions(HOUSE, state.history, state.week, available);
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

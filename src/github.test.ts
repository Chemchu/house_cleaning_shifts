import { describe, expect, it } from 'vitest';
import { HOUSE, type RepoRef, type Week } from './config';
import { deleteWeekUrl, listOpenPulls, loadHistory, newWeekUrl, type Fetch } from './github';
import { parseWeekFile, toWeekFile } from './weekFile';

const REPO: RepoRef = { owner: 'me', name: 'house', branch: 'main' };
const API = 'https://api.github.com/repos/me/house';
const RAW = 'https://raw.githubusercontent.com/me/house/main';

const week = (start: string, floor: string): Week => ({
  start,
  house: HOUSE,
  available: HOUSE.people,
  assignments: { floor },
  notes: [],
});

function fakeFetch(routes: Record<string, unknown>): Fetch {
  return async (url) => {
    if (!(url in routes)) return new Response('Not Found', { status: 404 });
    const body = routes[url];
    return typeof body === 'string' ? new Response(body) : Response.json(body);
  };
}

describe('loadHistory', () => {
  it('reads every week file, sorted by date, ignoring other files', async () => {
    const fetchFn = fakeFetch({
      [`${API}/contents/schedules?ref=main`]: [
        { name: '2026-W46.md', path: 'schedules/2026-W46.md', type: 'file' },
        { name: '2026-W45.md', path: 'schedules/2026-W45.md', type: 'file' },
        { name: 'README.md', path: 'schedules/README.md', type: 'file' },
        { name: 'old', path: 'schedules/old', type: 'dir' },
      ],
      [`${RAW}/schedules/2026-W45.md`]: toWeekFile(week('2026-11-02', 'G')),
      [`${RAW}/schedules/2026-W46.md`]: toWeekFile(week('2026-11-09', 'S')),
    });
    const history = await loadHistory(REPO, fetchFn);
    expect(history.map((w) => w.start)).toEqual(['2026-11-02', '2026-11-09']);
  });

  it('is empty when there is no schedules folder yet', async () => {
    expect(await loadHistory(REPO, fakeFetch({}))).toEqual([]);
  });

  it('names the file that has bad metadata', async () => {
    const fetchFn = fakeFetch({
      [`${API}/contents/schedules?ref=main`]: [
        { name: '2026-W45.md', path: 'schedules/2026-W45.md', type: 'file' },
      ],
      [`${RAW}/schedules/2026-W45.md`]: '# no metadata',
    });
    await expect(loadHistory(REPO, fetchFn)).rejects.toThrow('schedules/2026-W45.md: Missing');
  });

  it('explains when the rate limit is hit', async () => {
    const fetchFn: Fetch = async () =>
      new Response('', { status: 403, headers: { 'x-ratelimit-remaining': '0' } });
    await expect(loadHistory(REPO, fetchFn)).rejects.toThrow('rate limit');
  });
});

describe('listOpenPulls', () => {
  it('returns number, title, link and author', async () => {
    const fetchFn = fakeFetch({
      [`${API}/pulls?state=open`]: [
        { number: 7, title: 'Create 2026-W49.md', html_url: 'https://github.com/me/house/pull/7', user: { login: 'me' } },
      ],
    });
    expect(await listOpenPulls(REPO, fetchFn)).toEqual([
      { number: 7, title: 'Create 2026-W49.md', url: 'https://github.com/me/house/pull/7', author: 'me' },
    ]);
  });
});

describe('editor links', () => {
  const w = week('2026-11-30', 'C');

  it('pre-fill the new file page with the week file', () => {
    const url = new URL(newWeekUrl(REPO, w));
    expect(url.origin + url.pathname).toBe('https://github.com/me/house/new/main');
    expect(url.searchParams.get('filename')).toBe('schedules/2026-W49.md');
    expect(parseWeekFile(url.searchParams.get('value')!)).toEqual(w);
  });

  it('point the delete page at the week file', () => {
    expect(deleteWeekUrl(REPO, w)).toBe('https://github.com/me/house/delete/main/schedules/2026-W49.md');
  });
});

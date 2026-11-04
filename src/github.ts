import type { HouseConfig, RepoRef, Week } from './config';
import { parseWeekFile, toWeekFile, weekFilePath } from './weekFile';

/**
 * Reads use the public, unauthenticated API (60 requests/hour per IP).
 * Writes never happen here: we open GitHub's own web editor, so the PR is
 * created by whoever is signed in to github.com, without any token in the app.
 */

export type Fetch = (url: string) => Promise<Response>;

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  author: string;
}

const WEEK_FILE = /^\d{4}-W\d{2}\.md$/;

/** All merged weeks on the branch, oldest first. */
export async function loadHistory(repo: RepoRef, fetchFn: Fetch = fetch): Promise<Week[]> {
  const res = await fetchFn(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/schedules?ref=${repo.branch}`,
  );
  if (res.status === 404) return [];
  const entries: { name: string; path: string; type: string }[] = await json(res);

  const paths = entries.filter((e) => e.type === 'file' && WEEK_FILE.test(e.name)).map((e) => e.path);
  const weeks = await Promise.all(
    paths.map(async (path) => {
      const file = await fetchFn(
        `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${repo.branch}/${path}`,
      );
      if (!file.ok) throw new Error(`Could not read ${path} (HTTP ${file.status})`);
      try {
        return parseWeekFile(await file.text());
      } catch (e) {
        throw new Error(`${path}: ${(e as Error).message}`);
      }
    }),
  );
  return weeks.sort((a, b) => a.start.localeCompare(b.start));
}

/** Open PRs, so the app can warn that the history may be about to change. */
export async function listOpenPulls(repo: RepoRef, fetchFn: Fetch = fetch): Promise<PullRequest[]> {
  const res = await fetchFn(`https://api.github.com/repos/${repo.owner}/${repo.name}/pulls?state=open`);
  const pulls: { number: number; title: string; html_url: string; user: { login: string } }[] =
    await json(res);
  return pulls.map((p) => ({ number: p.number, title: p.title, url: p.html_url, author: p.user.login }));
}

/** GitHub's "create new file" page, pre-filled with the week file. */
export function newWeekUrl(repo: RepoRef, config: HouseConfig, week: Week): string {
  const params = new URLSearchParams({
    filename: weekFilePath(week.start),
    value: toWeekFile(config, week),
  });
  return `https://github.com/${repo.owner}/${repo.name}/new/${repo.branch}?${params}`;
}

/** GitHub's "delete file" page for a week. */
export function deleteWeekUrl(repo: RepoRef, week: Week): string {
  return `https://github.com/${repo.owner}/${repo.name}/delete/${repo.branch}/${weekFilePath(week.start)}`;
}

async function json<T>(res: Response): Promise<T> {
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
    throw new Error('GitHub rate limit reached (60 requests/hour). Try again later.');
  }
  if (!res.ok) throw new Error(`GitHub API error: HTTP ${res.status}`);
  return res.json();
}

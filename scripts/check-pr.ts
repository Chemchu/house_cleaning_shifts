import { execFileSync } from 'node:child_process';
import { validateChange, type Change } from '../src/validate';
import { parseWeekFile } from '../src/weekFile';

const [base, head] = process.argv.slice(2);
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' });
const lines = (text: string) => text.split('\n').filter(Boolean);

const history = lines(git('ls-tree', '--name-only', base, 'schedules/'))
  .filter((path) => /^schedules\/\d{4}-W\d{2}\.md$/.test(path))
  .map((path) => parseWeekFile(git('show', `${base}:${path}`)))
  .sort((a, b) => a.start.localeCompare(b.start));

const changes: Change[] = lines(git('diff', '--name-status', '--no-renames', `${base}...${head}`)).map((line) => {
  const [status, path] = line.split('\t');
  return { status, path, text: status === 'A' ? git('show', `${head}:${path}`) : undefined };
});

const errors = validateChange(history, changes);
if (errors.length > 0) {
  console.log(errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}
console.log('Valid schedule change.');

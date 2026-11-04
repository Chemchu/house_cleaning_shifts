# House cleaning shifts

Small PWA that generates a fair weekly cleaning roster as Markdown.

```sh
npm install
npm run dev    
npm test       
npm run build
```

## How it works

- Each week is a file in `schedules/` (e.g. `2026-W49.md`) with its data in a metadata comment on the first line.
- The app reads the merged weeks, generates the fairest next week, and **Accept** opens GitHub's editor pre-filled with the new file, so the PR is created from your own GitHub session.
- **Undo** opens GitHub's delete page for the latest week.
- `.github/workflows/auto-merge.yml` merges PRs from approved owners when the change is a valid schedule.

## Repository setup

1. *Settings → Pages → Source*: **GitHub Actions**.
2. *Settings → Secrets and variables → Actions → Variables*: `APPROVED_OWNERS` = comma-separated GitHub logins.
3. *Settings → Actions → General → Workflow permissions*: **Read and write permissions**.
4. *Settings → Rules → Rulesets*: on the default branch, require a pull request (0 approvals), no bypass.

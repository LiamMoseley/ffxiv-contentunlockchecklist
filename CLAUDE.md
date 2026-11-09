## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (LiamMoseley/ffxiv-contentunlockchecklist) via the `gh` CLI. Read `docs/agents/issue-tracker.md` before implementing, reviewing or closing a ticket, and before committing or pushing to a branch that has a PR: it covers ticking acceptance criteria, listing **Needs owner check** in the PR body, and checking the PR's state first.

### Testing

The test seam is pre-agreed: the Log core's commands and queries. See `CODING_STANDARDS.md`. `npm run check` runs every check CI does except the build (format, lint, typecheck, tests): run it once before committing.

### Large files

`fixtures/content-unlock-page.json` is one 800KB line: search it with `grep -o '.\{80\}term.\{80\}'`, never plain `grep` or `cat`. `src/content/bundled-content.json` is generated: refresh it with `npm run snapshot -- --from-fixture`.

### Verifying the UI

Read `docs/agents/verifying-the-ui.md` before checking a change in the browser pane.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`. Always `--json`: plain `gh issue view <number> --comments` printed nothing here.
- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>` (database id, as in **Blocking** below). Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

On this Windows machine run `gh` from PowerShell: from Bash it can exit 0 with no output. In PowerShell, backticks and `\"` inside a double-quoted `--body` break parsing: pass bodies with `--body-file` (written with the Write tool) or a single-quoted string.

## Acceptance criteria

A ticket's `- [ ]` acceptance criteria are its definition of done, and the ticket body is the record of which ones were met. When implementing a ticket, after `/code-review`'s Spec axis has passed. The axis passes only when every "implemented but wrong" finding is fixed or shown to be false; list any finding left over in the PR body:

- Tick each criterion the branch demonstrably meets (a passing test, code you read, or a check you ran) by editing the issue body: `gh issue view <n> --json body --jq .body`, change `- [ ]` to `- [x]` on those lines only, then `gh issue edit <n> --body-file <file>`. Never change a criterion's wording.
- Leave unticked anything only the owner can verify (how the UI looks against the prototype verdict, a live deploy, a repository setting), and list those under **Needs owner check** in the PR body. The owner ticks them after checking. End your closing report to the owner with the same list, one line per criterion, so it reaches them outside the PR too.
- List any criterion the branch does not meet in the PR body, and leave it unticked.

## Before committing or pushing

Check the branch's PR state first: `gh pr list --head <branch> --state all --json number,state`. If the PR is `MERGED` or `CLOSED`, a push never reaches it: branch from a fresh `origin/main`, carry the new commits over and open a new PR.

## Repository settings

Read a setting's current state before telling the owner to change it: `gh api repos/<owner>/<repo>/pages` (Pages source and URL), `.../branches/main/protection`, `.../environments`. A 404 means the setting is off. Changing settings stays with the owner.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (see **Make an issue a sub-issue of a parent**). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
